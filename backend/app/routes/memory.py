from fastapi import APIRouter, HTTPException
from app.models.schemas import MemoryItem, MemorySearchRequest
from app.services.memory_service import MemoryService
from app.services.vector_store import VectorStoreService

router = APIRouter(prefix="/api/memories", tags=["memories"])


def get_memory_service() -> MemoryService:
    return MemoryService(VectorStoreService.get_instance())


@router.get("", response_model=list[MemoryItem])
async def list_memories():
    svc = get_memory_service()
    raw = svc.get_all()
    return [
        MemoryItem(id=m["id"], content=m["content"], metadata=m["metadata"])
        for m in raw
    ]


@router.post("/search", response_model=list[MemoryItem])
async def search_memories(data: MemorySearchRequest):
    svc = get_memory_service()
    results = await svc.search(data.query, k=data.k)
    return [
        MemoryItem(id=r["id"], content=r["content"], metadata=r["metadata"], distance=r.get("distance"))
        for r in results
    ]


@router.delete("/{memory_id}")
async def delete_memory(memory_id: str):
    svc = get_memory_service()
    try:
        svc.delete(memory_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"deleted": True}


@router.delete("")
async def clear_all_memories():
    store = VectorStoreService.get_instance()
    all_memories = store.get_all_memories()
    for m in all_memories:
        store.delete_memory(m["id"])
    return {"deleted": len(all_memories)}
