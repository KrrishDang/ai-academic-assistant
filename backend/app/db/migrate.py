"""Database readiness polling, concurrency locking, and Alembic migration runner.

Guarantees:
1. Bounded exponential backoff readiness polling handling transient PostgreSQL
   startup states (e.g. SQLSTATE 57P03: 'FATAL: the database system is starting up')
   and network connection delays during cloud container cold-starts.
2. PostgreSQL advisory locking (pg_advisory_lock) to ensure multiple container replicas
   never execute concurrent Alembic migrations simultaneously.
3. Fail-fast semantics: non-recoverable database or migration failures exit with non-zero
   status code, preventing FastAPI from starting on a broken or unmigrated database.
"""

import logging
import os
import sys
import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import DBAPIError, OperationalError

from app.core.config import get_settings
from app.db.session import engine

logger = logging.getLogger("app.db.migrate")

# Well-known 64-bit advisory lock ID for AI Academic Assistant migrations
MIGRATION_ADVISORY_LOCK_ID = 7238423


def wait_for_database(
    db_engine: Engine,
    timeout_seconds: float = 60.0,
    initial_interval: float = 1.0,
    max_interval: float = 5.0,
    backoff_factor: float = 1.5,
) -> bool:
    """Poll the database until a connection succeeds or the timeout is exceeded.

    Explicitly catches:
    - PostgreSQL SQLSTATE 57P03 ('FATAL: the database system is starting up')
    - Connection refused (ECONNREFUSED)
    - Transient network socket and host resolution errors
    """
    start_time = time.monotonic()
    current_interval = initial_interval
    attempt = 0

    sanitized_url = db_engine.url.render_as_string(hide_password=True)
    logger.info(
        "Checking database connectivity (timeout: %.1fs, target: %s)...",
        timeout_seconds,
        sanitized_url,
    )

    while True:
        attempt += 1
        elapsed = time.monotonic() - start_time
        try:
            with db_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info(
                "Database connection verified ready in %.2fs after %d attempt(s).",
                elapsed,
                attempt,
            )
            return True
        except (OperationalError, DBAPIError, OSError) as err:
            elapsed = time.monotonic() - start_time
            if elapsed >= timeout_seconds:
                logger.error(
                    "Database connection timed out after %.2fs (%d attempts). Error: %s",
                    elapsed,
                    attempt,
                    err,
                )
                raise TimeoutError(
                    f"Database did not become ready within {timeout_seconds:.1f} seconds. Last error: {err}"
                ) from err

            # Extract first line for clean logging
            err_line = str(err).strip().splitlines()[0] if str(err).strip() else "Unknown error"
            logger.warning(
                "Database not ready yet (attempt %d, elapsed: %.1fs/%.1fs): %s. Retrying in %.2fs...",
                attempt,
                elapsed,
                timeout_seconds,
                err_line,
                current_interval,
            )
            time.sleep(current_interval)
            current_interval = min(current_interval * backoff_factor, max_interval)


def run_migrations(
    db_engine: Engine,
    alembic_ini_path: str = "alembic.ini",
) -> None:
    """Run Alembic upgrade head with PostgreSQL advisory lock for replica safety.

    If dialect is PostgreSQL, acquires a session-level advisory lock on a dedicated
    connection and passes that exact connection into Alembic's env.py, guaranteeing:
    1. The advisory lock is held on the exact same PostgreSQL session used by Alembic
       for the entire migration operation.
    2. The advisory lock is safely released in a finally block (and automatically
       freed by PostgreSQL if the session abruptly drops).
    """
    is_postgres = db_engine.dialect.name == "postgresql"
    config_path = Path(alembic_ini_path).resolve()
    if not config_path.exists():
        backend_dir = Path(__file__).resolve().parent.parent.parent
        alt_path = backend_dir / alembic_ini_path
        if alt_path.exists():
            config_path = alt_path
        else:
            raise FileNotFoundError(f"Alembic configuration file not found at: {config_path}")

    alembic_cfg = Config(str(config_path))
    # Ensure script_location is resolved relative to alembic.ini directory
    if not Path(alembic_cfg.get_main_option("script_location", "migrations")).is_absolute():
        alembic_cfg.set_main_option(
            "script_location",
            str((config_path.parent / alembic_cfg.get_main_option("script_location", "migrations")).resolve()),
        )
    # Ensure Alembic uses the application's configured database URL
    alembic_cfg.set_main_option("sqlalchemy.url", db_engine.url.render_as_string(hide_password=False))

    if is_postgres:
        logger.info(
            "Acquiring PostgreSQL advisory lock (%d) on session to serialize migrations...",
            MIGRATION_ADVISORY_LOCK_ID,
        )
        # Use isolation_level="AUTOCOMMIT" so acquiring and releasing the session advisory lock
        # does not leave uncommitted transaction blocks on the connection before Alembic begins its transaction.
        with db_engine.connect().execution_options(isolation_level="AUTOCOMMIT") as lock_conn:
            # Session-level advisory lock blocks until acquired
            lock_conn.execute(text(f"SELECT pg_advisory_lock({MIGRATION_ADVISORY_LOCK_ID})"))
            logger.info("Advisory lock acquired on session. Running Alembic migrations on this session...")
            try:
                # Bind Alembic to the exact same connection/session holding the lock
                alembic_cfg.attributes["connection"] = lock_conn
                command.upgrade(alembic_cfg, "head")
                logger.info("Alembic database migrations applied successfully to head.")
            finally:
                logger.info("Releasing PostgreSQL advisory lock...")
                try:
                    lock_conn.execute(text(f"SELECT pg_advisory_unlock({MIGRATION_ADVISORY_LOCK_ID})"))
                    logger.info("PostgreSQL advisory lock released successfully.")
                except Exception as unlock_err:
                    logger.warning("Advisory lock explicit unlock notice: %s", unlock_err)
    else:
        logger.info("Executing Alembic upgrade head on %s database...", db_engine.dialect.name)
        with db_engine.connect() as conn:
            alembic_cfg.attributes["connection"] = conn
            command.upgrade(alembic_cfg, "head")
            conn.commit()
        logger.info("Alembic database migrations applied successfully to head.")


def run_startup_migrations() -> None:
    """Orchestrate readiness check followed by Alembic migrations.

    Exits with code 1 if either check or migration fails, preventing
    the web server from starting with a degraded or unmigrated schema.
    """
    settings = get_settings()
    try:
        wait_for_database(
            db_engine=engine,
            timeout_seconds=settings.db_connect_timeout_seconds,
            initial_interval=settings.db_connect_retry_interval,
        )
        run_migrations(db_engine=engine)
    except Exception as exc:
        logger.critical(
            "Fatal failure during database readiness/migration lifecycle: %s",
            exc,
            exc_info=True,
        )
        sys.exit(1)


if __name__ == "__main__":
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    run_startup_migrations()
