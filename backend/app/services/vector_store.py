import chromadb
from chromadb.config import Settings as ChromaSettings
import os
from app.config import settings


class VectorStoreService:
    _instance = None

    def __init__(self):
        os.makedirs(settings.chroma_persist_dir, exist_ok=True)
        self._client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._memories = self._client.get_or_create_collection(
            name="ragmind_memories",
            metadata={"hnsw:space": "cosine"},
        )
        self._documents = self._client.get_or_create_collection(
            name="ragmind_documents",
            metadata={"hnsw:space": "cosine"},
        )

    @classmethod
    def get_instance(cls) -> "VectorStoreService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def memories(self):
        return self._memories

    @property
    def documents(self):
        return self._documents

    def add_memory(self, memory_id: str, content: str, embedding: list[float], metadata: dict):
        self._memories.upsert(
            ids=[memory_id],
            documents=[content],
            embeddings=[embedding],
            metadatas=[metadata],
        )

    def query_memories(self, embedding: list[float], k: int = 8) -> list[dict]:
        if self._memories.count() == 0:
            return []
        results = self._memories.query(
            query_embeddings=[embedding],
            n_results=min(k, self._memories.count()),
            include=["documents", "metadatas", "distances"],
        )
        items = []
        for i, doc_id in enumerate(results["ids"][0]):
            items.append({
                "id": doc_id,
                "content": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i],
            })
        return items

    def get_all_memories(self, limit: int = 200) -> list[dict]:
        if self._memories.count() == 0:
            return []
        results = self._memories.get(
            limit=limit,
            include=["documents", "metadatas"],
        )
        items = []
        for i, doc_id in enumerate(results["ids"]):
            items.append({
                "id": doc_id,
                "content": results["documents"][i],
                "metadata": results["metadatas"][i],
            })
        return items

    def delete_memory(self, memory_id: str):
        self._memories.delete(ids=[memory_id])

    def add_document_chunk(self, chunk_id: str, content: str, embedding: list[float], metadata: dict):
        self._documents.upsert(
            ids=[chunk_id],
            documents=[content],
            embeddings=[embedding],
            metadatas=[metadata],
        )

    def query_documents(self, embedding: list[float], k: int = 5, doc_ids: list[str] | None = None) -> list[dict]:
        if self._documents.count() == 0:
            return []
        where = {"document_id": {"$in": doc_ids}} if doc_ids else None
        results = self._documents.query(
            query_embeddings=[embedding],
            n_results=min(k, self._documents.count()),
            include=["documents", "metadatas", "distances"],
            where=where,
        )
        items = []
        for i, chunk_id in enumerate(results["ids"][0]):
            items.append({
                "id": chunk_id,
                "content": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i],
            })
        return items

    def delete_document_chunks(self, document_id: str):
        results = self._documents.get(where={"document_id": document_id})
        if results["ids"]:
            self._documents.delete(ids=results["ids"])

    def memory_count(self) -> int:
        return self._memories.count()

    def document_chunk_count(self) -> int:
        return self._documents.count()
