from app.services.llm_service import llm_service
from app.services.vector_store import VectorStoreService


class RAGService:
    def __init__(self, vector_store: VectorStoreService):
        self._store = vector_store

    async def retrieve(self, query: str, k: int = 5, document_ids: list[str] | None = None) -> list[dict]:
        embedding = await llm_service.embed(query)
        results = self._store.query_documents(
            embedding=embedding,
            k=k,
            doc_ids=document_ids,
        )
        return [r for r in results if r["distance"] < 0.7]

    async def format_context(self, query: str, k: int = 5, document_ids: list[str] | None = None) -> tuple[str, list[str]]:
        chunks = await self.retrieve(query, k=k, document_ids=document_ids)
        if not chunks:
            return "", []

        context_parts = []
        sources = []
        for chunk in chunks:
            source = chunk["metadata"].get("source_name", "Unknown")
            context_parts.append(f"[Source: {source}]\n{chunk['content']}")
            if source not in sources:
                sources.append(source)

        context_text = "\n\n---\n\n".join(context_parts)
        return context_text, sources
