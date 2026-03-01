from fastapi import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.schemas import SettingsRead, SettingsUpdate, HealthResponse
from app.config import settings
from app.services.llm_service import llm_service
from app.services.vector_store import VectorStoreService

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsRead)
async def get_settings():
    return SettingsRead(
        llm_provider=settings.llm_provider,
        openai_model=settings.openai_model,
        openai_base_url=settings.openai_base_url,
        ollama_base_url=settings.ollama_base_url,
        ollama_model=settings.ollama_model,
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
        streaming=settings.streaming,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        retrieval_k=settings.retrieval_k,
        memory_retrieval_k=settings.memory_retrieval_k,
    )


@router.patch("", response_model=SettingsRead)
async def update_settings(data: SettingsUpdate):
    update = data.model_dump(exclude_none=True)
    for key, value in update.items():
        if hasattr(settings, key):
            setattr(settings, key, value)
    llm_service.invalidate_clients()
    return await get_settings()


health_router = APIRouter(prefix="/api", tags=["health"])


@health_router.get("/health", response_model=HealthResponse)
async def health():
    store = VectorStoreService.get_instance()
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        llm_provider=settings.llm_provider,
        vector_store=f"chroma (memories={store.memory_count()}, chunks={store.document_chunk_count()})",
    )
