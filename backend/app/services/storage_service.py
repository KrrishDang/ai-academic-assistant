"""File storage implementations for uploaded documents."""

from pathlib import Path
from typing import Protocol

import boto3

from app.core.config import Settings


class DocumentStorage(Protocol):
    """Storage capability required by the document upload workflow."""

    def save(self, source_path: Path, storage_key: str) -> None:
        """Persist a file under a storage key."""

    def delete(self, storage_key: str) -> None:
        """Remove a file if it exists."""


class LocalDocumentStorage:
    """Filesystem storage used for local development."""

    def __init__(self, upload_dir: str) -> None:
        self._root = Path(upload_dir).resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    def save(self, source_path: Path, storage_key: str) -> None:
        destination = self._path_for(storage_key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(source_path.read_bytes())

    def delete(self, storage_key: str) -> None:
        self._path_for(storage_key).unlink(missing_ok=True)

    def _path_for(self, storage_key: str) -> Path:
        candidate = (self._root / storage_key).resolve()
        if self._root not in candidate.parents:
            raise ValueError("Invalid storage key.")
        return candidate


class S3DocumentStorage:
    """Private Amazon S3 storage used by deployed environments."""

    def __init__(self, bucket: str, region: str | None) -> None:
        self._bucket = bucket
        self._client = boto3.client("s3", region_name=region)

    def save(self, source_path: Path, storage_key: str) -> None:
        self._client.upload_file(
            str(source_path),
            self._bucket,
            storage_key,
            ExtraArgs={"ContentType": "application/pdf"},
        )

    def delete(self, storage_key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=storage_key)


def create_document_storage(settings: Settings) -> DocumentStorage:
    """Create the configured storage implementation."""
    if settings.storage_backend == "local":
        return LocalDocumentStorage(settings.upload_dir)
    if settings.storage_backend == "s3":
        if not settings.aws_s3_bucket:
            raise ValueError("AWS_S3_BUCKET is required when STORAGE_BACKEND is s3.")
        return S3DocumentStorage(settings.aws_s3_bucket, settings.aws_region)
    raise ValueError("STORAGE_BACKEND must be either 'local' or 's3'.")
