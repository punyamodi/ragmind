import os
import uuid
from pathlib import Path
from app.config import settings
from app.services.llm_service import llm_service
from app.services.vector_store import VectorStoreService


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk.strip())
        start += chunk_size - overlap
    return chunks


async def process_text_file(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


async def process_pdf_file(path: str) -> str:
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text_parts.append(extracted)
        return "\n\n".join(text_parts)
    except ImportError:
        import PyPDF2
        text_parts = []
        with open(path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
        return "\n\n".join(text_parts)


async def process_url(url: str) -> str:
    import httpx
    from bs4 import BeautifulSoup
    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
        response = await client.get(url)
        response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)


async def process_docx_file(path: str) -> str:
    from docx import Document
    doc = Document(path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


class DocumentService:
    def __init__(self, vector_store: VectorStoreService):
        self._store = vector_store
        os.makedirs(settings.upload_dir, exist_ok=True)

    async def ingest_file(self, file_path: str, document_id: str, document_name: str) -> int:
        ext = Path(file_path).suffix.lower()
        if ext == ".pdf":
            text = await process_pdf_file(file_path)
        elif ext in (".docx", ".doc"):
            text = await process_docx_file(file_path)
        else:
            text = await process_text_file(file_path)

        return await self._embed_and_store(text, document_id, document_name, file_path)

    async def ingest_url(self, url: str, document_id: str, document_name: str) -> int:
        text = await process_url(url)
        return await self._embed_and_store(text, document_id, document_name, url)

    async def _embed_and_store(self, text: str, document_id: str, document_name: str, source: str) -> int:
        chunks = chunk_text(text, settings.chunk_size, settings.chunk_overlap)
        for i, chunk in enumerate(chunks):
            embedding = await llm_service.embed(chunk)
            chunk_id = f"{document_id}_{i}"
            self._store.add_document_chunk(
                chunk_id=chunk_id,
                content=chunk,
                embedding=embedding,
                metadata={
                    "document_id": document_id,
                    "source_name": document_name,
                    "source": source,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                },
            )
        return len(chunks)

    def delete_document(self, document_id: str):
        self._store.delete_document_chunks(document_id)
