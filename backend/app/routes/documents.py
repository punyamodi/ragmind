from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, DocumentRecord
from app.models.schemas import DocumentListItem, URLIngestRequest
from app.services.document_service import DocumentService
from app.services.vector_store import VectorStoreService
from app.config import settings

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx", ".doc", ".csv"}


def get_doc_service() -> DocumentService:
    return DocumentService(VectorStoreService.get_instance())


@router.post("", response_model=DocumentListItem)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_upload_size_mb:
        raise HTTPException(status_code=413, detail=f"File too large. Max {settings.max_upload_size_mb}MB")

    doc_id = str(uuid.uuid4())
    os.makedirs(settings.upload_dir, exist_ok=True)
    file_path = os.path.join(settings.upload_dir, f"{doc_id}{ext}")

    with open(file_path, "wb") as f:
        f.write(content)

    doc_service = get_doc_service()
    try:
        chunk_count = await doc_service.ingest_file(file_path, doc_id, file.filename or doc_id)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

    record = DocumentRecord(
        id=doc_id,
        name=file.filename or doc_id,
        source_type="file",
        source_path=file_path,
        chunk_count=chunk_count,
        file_size_bytes=len(content),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return DocumentListItem(
        id=record.id,
        name=record.name,
        source_type=record.source_type,
        chunk_count=record.chunk_count,
        file_size_bytes=record.file_size_bytes,
        created_at=record.created_at,
    )


@router.post("/url", response_model=DocumentListItem)
async def ingest_url(data: URLIngestRequest, db: AsyncSession = Depends(get_db)):
    doc_id = str(uuid.uuid4())
    name = data.name or data.url[:80]

    doc_service = get_doc_service()
    try:
        chunk_count = await doc_service.ingest_url(data.url, doc_id, name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest URL: {str(e)}")

    record = DocumentRecord(
        id=doc_id,
        name=name,
        source_type="url",
        source_path=data.url,
        chunk_count=chunk_count,
        file_size_bytes=0,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return DocumentListItem(
        id=record.id,
        name=record.name,
        source_type=record.source_type,
        chunk_count=record.chunk_count,
        file_size_bytes=record.file_size_bytes,
        created_at=record.created_at,
    )


@router.get("", response_model=List[DocumentListItem])
async def list_documents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DocumentRecord).order_by(DocumentRecord.created_at.desc()))
    docs = result.scalars().all()
    return [
        DocumentListItem(
            id=d.id,
            name=d.name,
            source_type=d.source_type,
            chunk_count=d.chunk_count,
            file_size_bytes=d.file_size_bytes,
            created_at=d.created_at,
        )
        for d in docs
    ]


@router.delete("/{document_id}")
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DocumentRecord).where(DocumentRecord.id == document_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Document not found")

    doc_service = get_doc_service()
    doc_service.delete_document(document_id)

    if record.source_type == "file" and os.path.exists(record.source_path):
        os.remove(record.source_path)

    await db.delete(record)
    await db.commit()
    return {"deleted": True}
