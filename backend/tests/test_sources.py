"""Comprehensive test suite for Phase 2A: Notebook Source Ingestion Backend."""

import io
import unittest
import uuid
import zipfile
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password
from app.db.session import Base, get_db_session
from app.main import app
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.models.notebook import Notebook
from app.models.source import Source
from app.models.user import User


def _create_sample_pdf_bytes(text_content: str = "Academic study material for testing.") -> bytes:
    """Generate a minimal valid PDF in memory using fitz."""
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), text_content)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def _create_sample_docx_bytes(paragraphs: list[str]) -> bytes:
    """Generate a minimal valid DOCX file in memory."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        p_xml = "".join(f"<w:p><w:r><w:t>{p}</w:t></w:r></w:p>" for p in paragraphs)
        xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            f'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            f'<w:body>{p_xml}</w:body>'
            '</w:document>'
        )
        z.writestr("word/document.xml", xml)
    return buf.getvalue()


def _create_sample_pptx_bytes(slide_texts: list[str]) -> bytes:
    """Generate a minimal valid PPTX file in memory."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        z.writestr("ppt/presentation.xml", "<p:presentation xmlns:p='http://schemas.openxmlformats.org/presentationml/2006/main'/>")
        for i, text in enumerate(slide_texts, 1):
            slide_xml = (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                f'<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
                f'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
                f'<p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>{text}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>'
                '</p:sld>'
            )
            z.writestr(f"ppt/slides/slide{i}.xml", slide_xml)
    return buf.getvalue()


class TestSourceIngestion(unittest.TestCase):
    """Test suite verifying notebook source ingestion, validation, extraction, and security."""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

    def setUp(self):
        self.db: Session = self.TestingSessionLocal()
        app.dependency_overrides[get_db_session] = lambda: self.db
        self.client = TestClient(app)

        # Create two isolated users
        self.user_a = User(
            id=uuid.uuid4(),
            email=f"usera_{uuid.uuid4().hex[:6]}@example.com",
            password_hash=hash_password("Pass123!"),
            name="User A",
            role="user",
            is_active=True,
            is_verified=False,
            is_banned=False,
        )
        self.user_b = User(
            id=uuid.uuid4(),
            email=f"userb_{uuid.uuid4().hex[:6]}@example.com",
            password_hash=hash_password("Pass123!"),
            name="User B",
            role="user",
            is_active=True,
            is_verified=False,
            is_banned=False,
        )
        self.db.add_all([self.user_a, self.user_b])
        self.db.commit()

        self.token_a = create_access_token(self.user_a.id)
        self.token_b = create_access_token(self.user_b.id)

        # Create notebooks for User A and User B
        self.nb_a = Notebook(user_id=self.user_a.id, title="User A Notebook")
        self.nb_b = Notebook(user_id=self.user_b.id, title="User B Notebook")
        self.db.add_all([self.nb_a, self.nb_b])
        self.db.commit()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.query(Message).delete()
        self.db.query(Conversation).delete()
        self.db.query(Source).delete()
        self.db.query(Notebook).delete()
        self.db.query(Document).delete()
        self.db.query(User).delete()
        self.db.commit()
        self.db.close()

    # --- 1. Authentication & Authorization ---

    def test_upload_source_requires_auth(self):
        """Anonymous requests to upload a source must return 401."""
        pdf_bytes = _create_sample_pdf_bytes("Hello")
        files = {"file": ("test.pdf", pdf_bytes, "application/pdf")}
        res = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files=files)
        self.assertEqual(res.status_code, 401)

    def test_upload_source_rejects_invalid_bearer(self):
        """Invalid Bearer tokens must return 401."""
        pdf_bytes = _create_sample_pdf_bytes("Hello")
        files = {"file": ("test.pdf", pdf_bytes, "application/pdf")}
        headers = {"Authorization": "Bearer bad_token"}
        res = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files=files, headers=headers)
        self.assertEqual(res.status_code, 401)

    def test_user_cannot_upload_to_another_users_notebook(self):
        """User B cannot upload a source to User A's notebook (returns 404)."""
        pdf_bytes = _create_sample_pdf_bytes("Secret Doc")
        files = {"file": ("test.pdf", pdf_bytes, "application/pdf")}
        headers = {"Authorization": f"Bearer {self.token_b}"}
        res = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files=files, headers=headers)
        self.assertEqual(res.status_code, 404)

    def test_user_cannot_list_another_users_notebook_sources(self):
        """User B cannot list sources belonging to User A's notebook (returns 404)."""
        headers = {"Authorization": f"Bearer {self.token_b}"}
        res = self.client.get(f"/api/v1/notebooks/{self.nb_a.id}/sources", headers=headers)
        self.assertEqual(res.status_code, 404)

    def test_user_cannot_get_or_delete_another_users_source(self):
        """User B cannot get or delete a source owned by User A (returns 404)."""
        # Upload as User A
        pdf_bytes = _create_sample_pdf_bytes("User A Data")
        files = {"file": ("doc_a.pdf", pdf_bytes, "application/pdf")}
        headers_a = {"Authorization": f"Bearer {self.token_a}"}
        res_up = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files=files, headers=headers_a)
        self.assertEqual(res_up.status_code, 201)
        source_id = res_up.json()["id"]

        headers_b = {"Authorization": f"Bearer {self.token_b}"}
        # Probe GET
        res_get = self.client.get(f"/api/v1/sources/{source_id}", headers=headers_b)
        self.assertEqual(res_get.status_code, 404)

        # Probe DELETE
        res_del = self.client.delete(f"/api/v1/sources/{source_id}", headers=headers_b)
        self.assertEqual(res_del.status_code, 404)

        # Verify source still exists for User A
        res_check = self.client.get(f"/api/v1/sources/{source_id}", headers=headers_a)
        self.assertEqual(res_check.status_code, 200)

    # --- 2. Format Ingestion & Extraction ---

    def test_upload_valid_pdf_extracts_text_and_sets_completed(self):
        """Valid PDF upload extracts selectable text and sets status='completed'."""
        content = "Chapter 1: Principles of Quantum Computing."
        pdf_bytes = _create_sample_pdf_bytes(content)
        files = {"file": ("physics.pdf", pdf_bytes, "application/pdf")}
        headers = {"Authorization": f"Bearer {self.token_a}"}

        res = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files=files, headers=headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["original_filename"], "physics.pdf")
        self.assertEqual(data["display_title"], "physics")
        self.assertEqual(data["processing_status"], "completed")
        self.assertIsNone(data["error_message"])
        self.assertIsNotNone(data["content_hash"])

        # Check DB directly
        source_db = self.db.get(Source, uuid.UUID(data["id"]))
        self.assertIsNotNone(source_db)
        self.assertIn("Quantum Computing", source_db.extracted_text)
        self.assertNotIn("storage_key", data)  # Public API must NOT expose storage_key

    def test_upload_valid_docx_extracts_paragraphs(self):
        """Valid DOCX upload extracts paragraph text and sets status='completed'."""
        docx_bytes = _create_sample_docx_bytes(["Introduction to Algorithms", "Sorting and Search algorithms."])
        files = {"file": ("algorithms.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        headers = {"Authorization": f"Bearer {self.token_a}"}

        res = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files=files, headers=headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["processing_status"], "completed")

        source_db = self.db.get(Source, uuid.UUID(data["id"]))
        self.assertIn("Introduction to Algorithms", source_db.extracted_text)
        self.assertIn("Sorting and Search", source_db.extracted_text)

    def test_upload_valid_pptx_extracts_slides(self):
        """Valid PPTX upload extracts slide texts and sets status='completed'."""
        pptx_bytes = _create_sample_pptx_bytes(["Slide 1: Biology Overview", "Slide 2: Cellular Respiration"])
        files = {"file": ("biology_lecture.pptx", pptx_bytes, "application/vnd.openxmlformats-officedocument.presentationml.presentation")}
        headers = {"Authorization": f"Bearer {self.token_a}"}

        res = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files=files, headers=headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["processing_status"], "completed")

        source_db = self.db.get(Source, uuid.UUID(data["id"]))
        self.assertIn("Biology Overview", source_db.extracted_text)
        self.assertIn("Cellular Respiration", source_db.extracted_text)

    def test_upload_valid_txt_file(self):
        """Valid TXT upload extracts raw text and sets status='completed'."""
        txt_content = "Linear algebra lecture notes: Vectors, Matrices, and Eigenvalues."
        files = {"file": ("notes.txt", txt_content.encode("utf-8"), "text/plain")}
        headers = {"Authorization": f"Bearer {self.token_a}"}

        res = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files=files, headers=headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["processing_status"], "completed")

        source_db = self.db.get(Source, uuid.UUID(data["id"]))
        self.assertEqual(source_db.extracted_text, txt_content)

    # --- 3. Upload Validation & Rejections ---

    def test_reject_empty_file(self):
        """Empty uploads must be rejected with 422."""
        files = {"file": ("empty.pdf", b"", "application/pdf")}
        headers = {"Authorization": f"Bearer {self.token_a}"}
        res = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files=files, headers=headers)
        self.assertEqual(res.status_code, 422)
        self.assertIn("empty", res.json()["detail"])

    def test_reject_unsupported_extension(self):
        """Unsupported extensions must be rejected with 422."""
        files = {"file": ("script.py", b"print('hello')", "text/x-python")}
        headers = {"Authorization": f"Bearer {self.token_a}"}
        res = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files=files, headers=headers)
        self.assertEqual(res.status_code, 422)
        self.assertIn("Unsupported file format", res.json()["detail"])

    def test_reject_spoofed_file_content(self):
        """A text or binary file renamed to .pdf must be rejected by magic bytes validation."""
        files = {"file": ("fake.pdf", b"This is not a real PDF file header", "application/pdf")}
        headers = {"Authorization": f"Bearer {self.token_a}"}
        res = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files=files, headers=headers)
        self.assertEqual(res.status_code, 422)
        self.assertIn("valid PDF signature", res.json()["detail"])

    def test_reject_corrupt_docx_zip(self):
        """Corrupt DOCX (invalid zip) must be rejected with 422."""
        files = {"file": ("corrupt.docx", b"PK\x03\x04not-a-real-zip-content", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        headers = {"Authorization": f"Bearer {self.token_a}"}
        res = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files=files, headers=headers)
        self.assertEqual(res.status_code, 422)
        self.assertIn("corrupt or invalid", res.json()["detail"])

    def test_reject_binary_as_txt(self):
        """Binary files containing null bytes cannot be uploaded as .txt."""
        files = {"file": ("malicious.txt", b"\x00\x01\x02\x03binarydata", "text/plain")}
        headers = {"Authorization": f"Bearer {self.token_a}"}
        res = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files=files, headers=headers)
        self.assertEqual(res.status_code, 422)
        self.assertIn("Binary files cannot be uploaded as text", res.json()["detail"])

    # --- 4. Source Lifecycle & Deletion ---

    def test_list_sources_and_delete_source(self):
        """Upload two sources, list them, delete one, and verify cleanup."""
        headers = {"Authorization": f"Bearer {self.token_a}"}

        # Upload 1
        pdf1 = _create_sample_pdf_bytes("Source 1")
        res1 = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files={"file": ("s1.pdf", pdf1, "application/pdf")}, headers=headers)
        self.assertEqual(res1.status_code, 201)
        s1_id = res1.json()["id"]

        # Upload 2
        pdf2 = _create_sample_pdf_bytes("Source 2")
        res2 = self.client.post(f"/api/v1/notebooks/{self.nb_a.id}/sources", files={"file": ("s2.pdf", pdf2, "application/pdf")}, headers=headers)
        self.assertEqual(res2.status_code, 201)
        s2_id = res2.json()["id"]

        # List sources
        res_list = self.client.get(f"/api/v1/notebooks/{self.nb_a.id}/sources", headers=headers)
        self.assertEqual(res_list.status_code, 200)
        items = res_list.json()
        self.assertEqual(len(items), 2)

        # Delete source 1
        res_del = self.client.delete(f"/api/v1/sources/{s1_id}", headers=headers)
        self.assertEqual(res_del.status_code, 204)

        # Verify source 1 is gone
        res_get_gone = self.client.get(f"/api/v1/sources/{s1_id}", headers=headers)
        self.assertEqual(res_get_gone.status_code, 404)

        # Verify source 2 remains
        res_list_after = self.client.get(f"/api/v1/notebooks/{self.nb_a.id}/sources", headers=headers)
        self.assertEqual(len(res_list_after.json()), 1)
        self.assertEqual(res_list_after.json()[0]["id"], s2_id)


if __name__ == "__main__":
    unittest.main()
