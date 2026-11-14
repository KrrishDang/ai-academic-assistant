"""Integration test suite for Phase 6A: Repair Railway V1-to-V2 Migration Compatibility.

Simulates the exact Railway V1 production baseline:
- PostgreSQL database at Alembic revision 61a84f3e9b10
- conversations table without user_id
- Existing V1 conversation data, messages, document relationships, and session IDs

Executes the actual Alembic migration chain (not Base.metadata.create_all())
and verifies clean upgrade to head (b2c3d4e5f6a7), constraint enforcement,
backward compatibility with existing user_id databases, and safe downgrade/re-upgrade.
"""

import os
import unittest
import urllib.parse
import uuid

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import DBAPIError, IntegrityError

from app.core.config import get_settings


class TestRailwayV1MigrationCompatibility(unittest.TestCase):
    """PostgreSQL integration test for Railway V1-to-V2 Alembic migrations."""

    @classmethod
    def setUpClass(cls):
        # Base database connection from existing settings
        cls.orig_db_url = get_settings().database_url
        parsed = urllib.parse.urlparse(cls.orig_db_url)

        # Base administrative connection to postgres default database
        cls.admin_url = urllib.parse.urlunparse(
            parsed._replace(path="/postgres")
        )
        cls.admin_engine = create_engine(
            cls.admin_url,
            isolation_level="AUTOCOMMIT"
        )

        # Isolated test database names
        cls.test_db_v1_name = f"test_railway_v1_{uuid.uuid4().hex[:8]}"
        cls.test_db_v1_url = urllib.parse.urlunparse(
            parsed._replace(path=f"/{cls.test_db_v1_name}")
        )

        cls.test_db_v2_name = f"test_existing_user_{uuid.uuid4().hex[:8]}"
        cls.test_db_v2_url = urllib.parse.urlunparse(
            parsed._replace(path=f"/{cls.test_db_v2_name}")
        )

        # Create isolated test databases
        with cls.admin_engine.connect() as conn:
            conn.execute(text(f'CREATE DATABASE "{cls.test_db_v1_name}"'))
            conn.execute(text(f'CREATE DATABASE "{cls.test_db_v2_name}"'))

    @classmethod
    def tearDownClass(cls):
        # Restore original settings
        os.environ["DATABASE_URL"] = cls.orig_db_url
        get_settings.cache_clear()

        # Drop test databases
        with cls.admin_engine.connect() as conn:
            # Terminate active backend connections first
            conn.execute(text(f"""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname IN ('{cls.test_db_v1_name}', '{cls.test_db_v2_name}')
                AND pid <> pg_backend_pid();
            """))
            conn.execute(text(f'DROP DATABASE IF EXISTS "{cls.test_db_v1_name}"'))
            conn.execute(text(f'DROP DATABASE IF EXISTS "{cls.test_db_v2_name}"'))
        cls.admin_engine.dispose()

    def _get_alembic_config(self, target_db_url: str) -> Config:
        os.environ["DATABASE_URL"] = target_db_url
        get_settings.cache_clear()
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ini_path = os.path.join(backend_dir, "alembic.ini")
        cfg = Config(ini_path)
        cfg.set_main_option("script_location", os.path.join(backend_dir, "migrations"))
        cfg.set_main_option("sqlalchemy.url", target_db_url)
        return cfg

    def test_01_railway_v1_baseline_migration_and_constraints(self):
        """Test migrating from exact Railway V1 state (61a84f3e9b10 with no user_id) to head."""
        cfg = self._get_alembic_config(self.test_db_v1_url)
        engine_v1 = create_engine(self.test_db_v1_url)

        # Step 1: Migrate up to 61a84f3e9b10
        command.upgrade(cfg, "61a84f3e9b10")

        # Step 2: Strip conversations.user_id to simulate exact physical Railway V1 database
        with engine_v1.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            inspector = inspect(conn)
            fks = inspector.get_foreign_keys("conversations")
            for fk in fks:
                if "user_id" in fk.get("constrained_columns", []):
                    conn.execute(text(f"ALTER TABLE conversations DROP CONSTRAINT \"{fk['name']}\""))
            indexes = inspector.get_indexes("conversations")
            for idx in indexes:
                if "user_id" in idx.get("column_names", []):
                    conn.execute(text(f"DROP INDEX IF EXISTS \"{idx['name']}\""))
            cols = [c["name"] for c in inspector.get_columns("conversations")]
            if "user_id" in cols:
                conn.execute(text("ALTER TABLE conversations DROP COLUMN user_id"))

        # Verify that conversations now physically lacks user_id
        with engine_v1.connect() as conn:
            cols = [c["name"] for c in inspect(conn).get_columns("conversations")]
            self.assertNotIn("user_id", cols, "conversations should not have user_id in Railway V1 simulation")

        # Step 3: Populate existing V1 production data
        user_id = uuid.uuid4()
        doc_id = uuid.uuid4()
        conv_id = uuid.uuid4()
        msg_id = uuid.uuid4()
        session_id = "anon_visitor_session_v1_test"

        with engine_v1.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            # Legacy User
            conn.execute(text("""
                INSERT INTO users (id, name, email, password_hash, role, is_active, is_verified, is_banned, created_at, updated_at)
                VALUES (:id, 'V1 Student', 'v1student@example.com', 'hash123', 'user', true, true, false, now(), now())
            """), {"id": user_id})

            # Legacy Document (Anonymous session document)
            conn.execute(text("""
                INSERT INTO documents (id, original_filename, content_type, file_size_bytes, page_count,
                                      text_character_count, storage_key, sha256, extracted_text, session_id, created_at)
                VALUES (:id, 'v1_syllabus.pdf', 'application/pdf', 1024, 1, 100, 'v1_key_01', 'v1_sha256_01',
                        'Introductory course syllabus.', :session_id, now())
            """), {"id": doc_id, "session_id": session_id})

            # Legacy Conversation (Anonymous session conversation without user_id)
            conn.execute(text("""
                INSERT INTO conversations (id, document_id, title, session_id, created_at, updated_at)
                VALUES (:id, :doc_id, 'V1 Initial Chat', :session_id, now(), now())
            """), {"id": conv_id, "doc_id": doc_id, "session_id": session_id})

            # Legacy Message
            conn.execute(text("""
                INSERT INTO messages (id, conversation_id, role, content, created_at)
                VALUES (:id, :conv_id, 'user', 'What is covered in the syllabus?', now())
            """), {"id": msg_id, "conv_id": conv_id})

        # Step 4: Execute full Alembic upgrade to head (b2c3d4e5f6a7)
        # This executes 7a9b8c7d6e5f -> 8a1b2c3d4e5f -> 9c8d7e6f5a4b -> a1b2c3d4e5f6 -> b2c3d4e5f6a7
        command.upgrade(cfg, "head")

        # Step 5: Verify schema state after migration to head
        with engine_v1.connect() as conn:
            inspector = inspect(conn)

            # Alembic revision must be head
            rev = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
            self.assertEqual(rev, "b2c3d4e5f6a7", "Database must be migrated to head")

            # Check conversations columns
            conv_cols = {c["name"]: c for c in inspector.get_columns("conversations")}
            self.assertIn("user_id", conv_cols, "conversations must now have user_id")
            self.assertTrue(conv_cols["user_id"]["nullable"], "conversations.user_id must be nullable")
            self.assertIn("notebook_id", conv_cols, "conversations must now have notebook_id")
            self.assertTrue(conv_cols["notebook_id"]["nullable"], "conversations.notebook_id must be nullable")

            # Check new tables exist
            tables = inspector.get_table_names()
            self.assertIn("notebooks", tables)
            self.assertIn("sources", tables)
            self.assertIn("study_materials", tables)

            # Check V1 data integrity
            conv_row = conn.execute(text("SELECT id, user_id, notebook_id, session_id, title FROM conversations WHERE id = :id"),
                                   {"id": conv_id}).mappings().one()
            self.assertEqual(conv_row["id"], conv_id)
            self.assertIsNone(conv_row["user_id"], "V1 conversation user_id must remain NULL")
            self.assertIsNone(conv_row["notebook_id"], "V1 conversation notebook_id must remain NULL")
            self.assertEqual(conv_row["session_id"], session_id, "V1 conversation session_id must be preserved")
            self.assertEqual(conv_row["title"], "V1 Initial Chat")

            msg_count = conn.execute(text("SELECT count(*) FROM messages WHERE conversation_id = :id"),
                                     {"id": conv_id}).scalar()
            self.assertEqual(msg_count, 1, "V1 messages must be preserved")

        # Step 6: Verify Phase 1B / 1C notebook and conversation ownership constraints
        nb_id = uuid.uuid4()
        other_user_id = uuid.uuid4()

        with engine_v1.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            # Create a second user
            conn.execute(text("""
                INSERT INTO users (id, name, email, password_hash, role, is_active, is_verified, is_banned, created_at, updated_at)
                VALUES (:id, 'Other User', 'other@example.com', 'hash456', 'user', true, true, false, now(), now())
            """), {"id": other_user_id})

            # Create notebook owned by user_id
            conn.execute(text("""
                INSERT INTO notebooks (id, user_id, title, created_at, updated_at)
                VALUES (:id, :user_id, 'CS50 Intro', now(), now())
            """), {"id": nb_id, "user_id": user_id})

            # 1. Valid notebook conversation: notebook_id and user_id match notebook owner
            valid_conv_id = uuid.uuid4()
            conn.execute(text("""
                INSERT INTO conversations (id, notebook_id, user_id, title, created_at, updated_at)
                VALUES (:id, :nb_id, :user_id, 'Valid Notebook Chat', now(), now())
            """), {"id": valid_conv_id, "nb_id": nb_id, "user_id": user_id})

            # 2. Invalid: notebook conversation with user_id = NULL must fail check constraint
            invalid_conv_id1 = uuid.uuid4()
            with self.assertRaises(IntegrityError):
                conn.execute(text("""
                    INSERT INTO conversations (id, notebook_id, user_id, title, created_at, updated_at)
                    VALUES (:id, :nb_id, NULL, 'Invalid Null User Chat', now(), now())
                """), {"id": invalid_conv_id1, "nb_id": nb_id})

            # 3. Invalid: notebook conversation with mismatched user_id must fail foreign key constraint
            invalid_conv_id2 = uuid.uuid4()
            with self.assertRaises(IntegrityError):
                conn.execute(text("""
                    INSERT INTO conversations (id, notebook_id, user_id, title, created_at, updated_at)
                    VALUES (:id, :nb_id, :user_id, 'Mismatched User Chat', now(), now())
                """), {"id": invalid_conv_id2, "nb_id": nb_id, "user_id": other_user_id})

        # Step 7: Verify downgrade to 7a9b8c7d6e5f and re-upgrade
        command.downgrade(cfg, "7a9b8c7d6e5f")
        with engine_v1.connect() as conn:
            rev_down = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
            self.assertEqual(rev_down, "7a9b8c7d6e5f")
            # Verify V1 conversation data still exists
            count = conn.execute(text("SELECT count(*) FROM conversations WHERE id = :id"), {"id": conv_id}).scalar()
            self.assertEqual(count, 1)

        # Re-upgrade to head
        command.upgrade(cfg, "head")
        with engine_v1.connect() as conn:
            rev_reup = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
            self.assertEqual(rev_reup, "b2c3d4e5f6a7")

        engine_v1.dispose()

    def test_02_database_with_existing_user_id_migrates_cleanly(self):
        """Test that databases where conversations.user_id ALREADY exists migrate cleanly without duplicate constraint errors."""
        cfg = self._get_alembic_config(self.test_db_v2_url)
        engine_v2 = create_engine(self.test_db_v2_url)

        # Step 1: Migrate up to 61a84f3e9b10 (where 53013a0468a4 created user_id as NOT NULL)
        command.upgrade(cfg, "61a84f3e9b10")

        # Verify user_id exists
        with engine_v2.connect() as conn:
            conv_cols = {c["name"]: c for c in inspect(conn).get_columns("conversations")}
            self.assertIn("user_id", conv_cols)

        # Insert user and conversation
        user_id = uuid.uuid4()
        conv_id = uuid.uuid4()
        with engine_v2.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            conn.execute(text("""
                INSERT INTO users (id, name, email, password_hash, role, is_active, is_verified, is_banned, created_at, updated_at)
                VALUES (:id, 'User Existing', 'existing@example.com', 'hash789', 'user', true, true, false, now(), now())
            """), {"id": user_id})
            conn.execute(text("""
                INSERT INTO conversations (id, user_id, title, created_at, updated_at)
                VALUES (:id, :user_id, 'Existing User Chat', now(), now())
            """), {"id": conv_id, "user_id": user_id})

        # Step 2: Migrate to head
        command.upgrade(cfg, "head")

        with engine_v2.connect() as conn:
            rev = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
            self.assertEqual(rev, "b2c3d4e5f6a7")
            conv_cols = {c["name"]: c for c in inspect(conn).get_columns("conversations")}
            self.assertIn("user_id", conv_cols)
            self.assertTrue(conv_cols["user_id"]["nullable"], "user_id must be altered to nullable")

        engine_v2.dispose()


if __name__ == "__main__":
    unittest.main()
