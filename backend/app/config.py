from __future__ import annotations

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str = "https://api.openai.com/v1"

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    llm_provider: str = "openai"
    temperature: float = 0.7
    max_tokens: int = 2048
    streaming: bool = True

    chroma_persist_dir: str = "./data/chroma"
    sqlite_url: str = "sqlite+aiosqlite:///./data/ragmind.db"
    upload_dir: str = "./data/uploads"

    max_upload_size_mb: int = 50
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retrieval_k: int = 5
    memory_retrieval_k: int = 8

    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"]

    app_name: str = "RAGMind"
    app_version: str = "2.0.0"

    class Config:
        env_file = ".env"


settings = Settings()
