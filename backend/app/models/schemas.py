from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
import uuid


class MessageCreate(BaseModel):
    content: str
    session_id: str


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    created_at: datetime
    tokens_used: int

    class Config:
        from_attributes = True


class SessionCreate(BaseModel):
    title: str = "New Chat"


class SessionUpdate(BaseModel):
    title: str


class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    session_id: str
    content: str
    use_rag: bool = True
    use_memory: bool = True
    stream: bool = True


class ChatResponse(BaseModel):
    message: MessageResponse
    context_used: List[str] = []
    memories_used: List[str] = []


class DocumentUploadResponse(BaseModel):
    id: str
    name: str
    source_type: str
    chunk_count: int
    file_size_bytes: int
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentListItem(BaseModel):
    id: str
    name: str
    source_type: str
    chunk_count: int
    file_size_bytes: int
    created_at: datetime

    class Config:
        from_attributes = True


class URLIngestRequest(BaseModel):
    url: str
    name: Optional[str] = None


class MemoryItem(BaseModel):
    id: str
    content: str
    metadata: dict = {}
    distance: Optional[float] = None


class MemorySearchRequest(BaseModel):
    query: str
    k: int = 10


class SettingsRead(BaseModel):
    llm_provider: str
    openai_model: str
    openai_base_url: str
    ollama_base_url: str
    ollama_model: str
    temperature: float
    max_tokens: int
    streaming: bool
    chunk_size: int
    chunk_overlap: int
    retrieval_k: int
    memory_retrieval_k: int


class SettingsUpdate(BaseModel):
    llm_provider: Optional[Literal["openai", "ollama"]] = None
    openai_model: Optional[str] = None
    openai_base_url: Optional[str] = None
    openai_api_key: Optional[str] = None
    ollama_base_url: Optional[str] = None
    ollama_model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=32000)
    streaming: Optional[bool] = None
    chunk_size: Optional[int] = Field(None, ge=100, le=4000)
    chunk_overlap: Optional[int] = Field(None, ge=0, le=1000)
    retrieval_k: Optional[int] = Field(None, ge=1, le=20)
    memory_retrieval_k: Optional[int] = Field(None, ge=1, le=30)


class HealthResponse(BaseModel):
    status: str
    version: str
    llm_provider: str
    vector_store: str
