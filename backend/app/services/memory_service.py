import uuid
import re
from datetime import datetime
from app.services.llm_service import llm_service
from app.services.vector_store import VectorStoreService


MEMORY_EXTRACTION_PROMPT = """You are analyzing a conversation to extract important facts, preferences, corrections, and knowledge the user wants the assistant to remember.

Extract only concrete, reusable facts. Do not extract vague or transient statements.

Return a JSON array of strings where each string is a single factual statement. Return an empty array [] if nothing is worth remembering.

Example output:
["The user's name is Alice.", "The user prefers Python over JavaScript.", "The capital of France is Paris, not Lyon as previously stated."]

Conversation to analyze:
{conversation}

JSON array:"""


class MemoryService:
    def __init__(self, vector_store: VectorStoreService):
        self._store = vector_store

    async def extract_and_store(self, conversation: list[dict], session_id: str):
        text = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in conversation[-10:])
        prompt = MEMORY_EXTRACTION_PROMPT.format(conversation=text)

        raw = await llm_service.chat([
            {"role": "system", "content": "You extract facts from conversations. Return only valid JSON."},
            {"role": "user", "content": prompt},
        ])

        facts = self._parse_facts(raw)
        for fact in facts:
            await self._store_fact(fact, session_id)

    def _parse_facts(self, raw: str) -> list[str]:
        try:
            import json
            match = re.search(r'\[.*?\]', raw, re.DOTALL)
            if match:
                return json.loads(match.group(0))
        except Exception:
            pass
        return []

    async def _store_fact(self, fact: str, session_id: str):
        embedding = await llm_service.embed(fact)
        memory_id = str(uuid.uuid4())
        self._store.add_memory(
            memory_id=memory_id,
            content=fact,
            embedding=embedding,
            metadata={
                "session_id": session_id,
                "created_at": datetime.utcnow().isoformat(),
            },
        )

    async def retrieve_relevant(self, query: str, k: int = 8) -> list[str]:
        embedding = await llm_service.embed(query)
        results = self._store.query_memories(embedding=embedding, k=k)
        return [r["content"] for r in results if r["distance"] < 0.6]

    def get_all(self) -> list[dict]:
        return self._store.get_all_memories()

    async def search(self, query: str, k: int = 10) -> list[dict]:
        embedding = await llm_service.embed(query)
        return self._store.query_memories(embedding=embedding, k=k)

    def delete(self, memory_id: str):
        self._store.delete_memory(memory_id)

    def count(self) -> int:
        return self._store.memory_count()
