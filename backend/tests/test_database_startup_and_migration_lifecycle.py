"""Automated tests for database startup lifecycle, readiness polling, Alembic migrations,
and multi-replica concurrency safety.

Covers:
1. Transient PostgreSQL startup failures (SQLSTATE 57P03: 'FATAL: the database system is starting up').
2. Permanent database connection failures (timeout & fail-fast exit).
3. Elimination of double Alembic execution from FastAPI lifespan.
4. Fail-fast error propagation in FastAPI lifespan.
5. Multi-replica concurrency serialization via PostgreSQL advisory locks.
6. Real migration execution against a disposable local PostgreSQL database:
   - Clean execution through all 11 migration versions to head.
   - Schema validation (users, documents, notebooks, sources, conversations, messages, study_materials).
   - Idempotent repeated startup execution.
"""

import inspect
import sys
import unittest
import urllib.parse
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
import psycopg
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

from app.core.config import Settings, get_settings
from app.db.migrate import (
    MIGRATION_ADVISORY_LOCK_ID,
    run_migrations,
    wait_for_database,
)
from app import main


class TestDatabaseStartupAndLifecycleUnit(unittest.TestCase):
    """Unit tests for startup readiness, backoff, and locking mechanisms."""

    def test_transient_postgresql_57p03_startup_recovers(self):
        """Verify wait_for_database retries and recovers after transient 57P03 errors."""
        mock_engine = MagicMock()
        attempts = 0

        def simulate_connect():
            nonlocal attempts
            attempts += 1
            if attempts <= 2:
                # Simulate PostgreSQL 57P03 cannot_connect_now error
                orig_err = Exception("connection failed: FATAL: the database system is starting up")
                orig_err.sqlstate = "57P03"
                raise OperationalError("SELECT 1", {}, orig_err)

            # Succeeded on 3rd attempt
            mock_conn = MagicMock()
            return mock_conn

        mock_engine.connect.side_effect = simulate_connect
        mock_engine.url.render_as_string.return_value = "postgresql+psycopg://postgres:***@localhost:5432/test"

        ready = wait_for_database(
            db_engine=mock_engine,
            timeout_seconds=5.0,
            initial_interval=0.01,
            max_interval=0.05,
            backoff_factor=1.2,
        )

        self.assertTrue(ready)
        self.assertEqual(attempts, 3)

    def test_permanent_connection_failure_times_out(self):
        """Verify wait_for_database raises TimeoutError when database never becomes ready."""
        mock_engine = MagicMock()

        def simulate_permanent_failure():
            orig_err = Exception("connection failed: Connection refused")
            raise OperationalError("SELECT 1", {}, orig_err)

        mock_engine.connect.side_effect = simulate_permanent_failure
        mock_engine.url.render_as_string.return_value = "postgresql+psycopg://postgres:***@localhost:5432/test"

        with self.assertRaises(TimeoutError) as ctx:
            wait_for_database(
                db_engine=mock_engine,
                timeout_seconds=0.2,
                initial_interval=0.05,
                max_interval=0.1,
            )

        self.assertIn("Database did not become ready within", str(ctx.exception))

    def test_alembic_double_execution_eliminated_from_lifespan(self):
        """Verify Alembic migrations are no longer executed inside FastAPI lifespan."""
        lifespan_source = inspect.getsource(main.lifespan)
        self.assertNotIn("command.upgrade", lifespan_source)
        self.assertNotIn("alembic_cfg", lifespan_source)
        self.assertIn("Database connection verified successfully", lifespan_source)

    @patch("app.main.engine")
    def test_fastapi_lifespan_fails_fast_on_database_error(self, mock_engine):
        """Verify FastAPI lifespan raises RuntimeError if database check fails."""
        mock_engine.connect.side_effect = OperationalError("SELECT 1", {}, Exception("Connection refused"))
        test_app = FastAPI()

        with self.assertRaises(RuntimeError) as ctx:
            cm = main.lifespan(test_app)
            cm.__aenter__().send(None)

        self.assertIn("Database connection verification failed on startup", str(ctx.exception))

    def test_multi_replica_advisory_lock_pattern_on_postgresql(self):
        """Verify pg_advisory_lock is acquired on session, passed to Alembic, and safely released."""
        mock_engine = MagicMock()
        mock_engine.dialect.name = "postgresql"
        mock_engine.url.render_as_string.return_value = "postgresql+psycopg://postgres:***@localhost:5432/test"

        mock_conn = MagicMock()
        mock_conn_cm = MagicMock()
        mock_conn_cm.__enter__.return_value = mock_conn
        mock_engine.connect.return_value.execution_options.return_value = mock_conn_cm

        with patch("app.db.migrate.command.upgrade") as mock_upgrade:
            run_migrations(db_engine=mock_engine, alembic_ini_path="alembic.ini")

            # Check that advisory lock was acquired and released
            calls = [str(c[0][0]) for c in mock_conn.execute.call_args_list]
            self.assertTrue(any(f"pg_advisory_lock({MIGRATION_ADVISORY_LOCK_ID})" in call_str for call_str in calls))
            self.assertTrue(any(f"pg_advisory_unlock({MIGRATION_ADVISORY_LOCK_ID})" in call_str for call_str in calls))

            # Verify Alembic was passed the exact same connection holding the advisory lock
            passed_cfg = mock_upgrade.call_args[0][0]
            self.assertIs(passed_cfg.attributes.get("connection"), mock_conn)
            mock_upgrade.assert_called_once()


class TestRealDisposablePostgreSqlMigrations(unittest.TestCase):
    """Integration test verifying complete migration execution against disposable local PostgreSQL."""

    DISPOSABLE_DB_NAME = "ai_academic_assistant_disposable_test"

    @classmethod
    def setUpClass(cls):
        """Create disposable PostgreSQL database."""
        base_url = get_settings().database_url
        parsed = urllib.parse.urlparse(base_url)
        cls.admin_url = urllib.parse.urlunparse(parsed._replace(path="/postgres"))
        cls.disposable_url = urllib.parse.urlunparse(parsed._replace(path=f"/{cls.DISPOSABLE_DB_NAME}"))
        cls.DISPOSABLE_DB_URL = cls.disposable_url

        # Psycopg connection string for raw database creation
        raw_admin_url = cls.admin_url.replace("postgresql+psycopg://", "postgresql://")
        cls.raw_admin_url = raw_admin_url

        try:
            with psycopg.connect(cls.raw_admin_url, autocommit=True, connect_timeout=2) as conn:
                with conn.cursor() as cur:
                    cur.execute(f"DROP DATABASE IF EXISTS {cls.DISPOSABLE_DB_NAME} WITH (FORCE)")
                    cur.execute(f"CREATE DATABASE {cls.DISPOSABLE_DB_NAME}")
        except Exception as exc:
            raise unittest.SkipTest(f"Local PostgreSQL not available: {exc}")

    @classmethod
    def tearDownClass(cls):
        """Drop disposable PostgreSQL database."""
        try:
            with psycopg.connect(cls.raw_admin_url, autocommit=True) as conn:
                with conn.cursor() as cur:
                    cur.execute(f"DROP DATABASE IF EXISTS {cls.DISPOSABLE_DB_NAME} WITH (FORCE)")
        except Exception:
            pass

    def test_01_migrations_execute_from_scratch_to_head(self):
        """Run migrations on clean disposable DB and verify table creation and revision."""
        engine = create_engine(self.disposable_url)

        # 1. Run migrations via migrate module
        run_migrations(db_engine=engine, alembic_ini_path="alembic.ini")

        # 2. Inspect created tables
        with engine.connect() as conn:
            # Check alembic_version table
            version_result = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
            self.assertEqual(version_result, "b2c3d4e5f6a7", "Head migration version mismatch")

            # Check expected tables exist
            tables = conn.execute(
                text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
            ).scalars().all()

            expected_tables = {
                "users",
                "documents",
                "notebooks",
                "sources",
                "conversations",
                "messages",
                "study_materials",
                "alembic_version",
            }
            for table in expected_tables:
                self.assertIn(table, tables, f"Expected table '{table}' was not created by migrations")

        engine.dispose()

    def test_02_repeated_startup_migration_is_idempotent(self):
        """Verify running run_migrations on already-migrated database succeeds cleanly with 0 errors."""
        engine = create_engine(self.disposable_url)

        # Run migrations a second time
        run_migrations(db_engine=engine, alembic_ini_path="alembic.ini")

        # Verify still at head
        with engine.connect() as conn:
            version_result = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
            self.assertEqual(version_result, "b2c3d4e5f6a7")

        engine.dispose()


if __name__ == "__main__":
    unittest.main()
