from __future__ import annotations

from openai import AsyncOpenAI
from typing import AsyncIterator
from app.config import settings


class LLMService:
    def __init__(self):
        self._openai_client = None
        self._ollama_client = None

    def _get_openai_client(self) -> AsyncOpenAI:
        if self._openai_client is None:
            self._openai_client = AsyncOpenAI(
                api_key=settings.openai_api_key or "sk-placeholder",
                base_url=settings.openai_base_url,
            )
        return self._openai_client

    def _get_ollama_client(self) -> AsyncOpenAI:
        if self._ollama_client is None:
            self._ollama_client = AsyncOpenAI(
                api_key="ollama",
                base_url=f"{settings.ollama_base_url}/v1",
            )
        return self._ollama_client

    def _get_client(self) -> AsyncOpenAI:
        if settings.llm_provider == "ollama":
            return self._get_ollama_client()
        return self._get_openai_client()

    def _get_model(self) -> str:
        if settings.llm_provider == "ollama":
            return settings.ollama_model
        return settings.openai_model

    async def chat(self, messages: list[dict], stream: bool = False) -> str:
        client = self._get_client()
        response = await client.chat.completions.create(
            model=self._get_model(),
            messages=messages,
            temperature=settings.temperature,
            max_tokens=settings.max_tokens,
            stream=False,
        )
        return response.choices[0].message.content or ""

    async def chat_stream(self, messages: list[dict]) -> AsyncIterator[str]:
        client = self._get_client()
        stream = await client.chat.completions.create(
            model=self._get_model(),
            messages=messages,
            temperature=settings.temperature,
            max_tokens=settings.max_tokens,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content

    async def embed(self, text: str) -> list[float]:
        if settings.llm_provider == "ollama":
            return await self._embed_ollama(text)
        return await self._embed_openai(text)

    async def _embed_openai(self, text: str) -> list[float]:
        client = self._get_openai_client()
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=text,
        )
        return response.data[0].embedding

    async def _embed_ollama(self, text: str) -> list[float]:
        import httpx
        embed_model = "nomic-embed-text" if settings.llm_provider == "ollama" else settings.ollama_model
        async with httpx.AsyncClient(timeout=60) as http:
            response = await http.post(
                f"{settings.ollama_base_url}/api/embeddings",
                json={"model": embed_model, "prompt": text},
            )
            data = response.json()
            return data.get("embedding", [])

    def invalidate_clients(self):
        self._openai_client = None
        self._ollama_client = None


llm_service = LLMService()
