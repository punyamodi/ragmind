import uuid
import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, Session, Message
from app.models.schemas import ChatRequest
from app.services.llm_service import llm_service
from app.services.memory_service import MemoryService
from app.services.rag_service import RAGService
from app.services.vector_store import VectorStoreService
from app.config import settings

router = APIRouter(prefix="/api/chat", tags=["chat"])

SYSTEM_PROMPT = """You are RAGMind, an intelligent AI assistant with persistent memory and access to a knowledge base.

You learn from conversations and remember important information the user shares with you.

{memory_section}

{rag_section}

Always be helpful, accurate, and reference your knowledge base when relevant. If you learn something new or the user corrects you, acknowledge it and update your understanding accordingly."""


def build_system_prompt(memories: list[str], rag_context: str, rag_sources: list[str]) -> str:
    memory_section = ""
    if memories:
        memory_section = "REMEMBERED FACTS:\n" + "\n".join(f"- {m}" for m in memories)

    rag_section = ""
    if rag_context:
        rag_section = f"KNOWLEDGE BASE CONTEXT:\n{rag_context}\n\nSources: {', '.join(rag_sources)}"

    return SYSTEM_PROMPT.format(
        memory_section=memory_section,
        rag_section=rag_section,
    ).strip()


async def get_services():
    store = VectorStoreService.get_instance()
    return MemoryService(store), RAGService(store)


@router.post("")
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == request.session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(Message)
        .where(Message.session_id == request.session_id)
        .order_by(Message.created_at)
    )
    history = result.scalars().all()

    user_message = Message(
        id=str(uuid.uuid4()),
        session_id=request.session_id,
        role="user",
        content=request.content,
    )
    db.add(user_message)
    await db.flush()

    if session.title == "New Chat" and len(history) == 0:
        title = request.content[:60].strip()
        session.title = title if len(title) > 3 else "New Chat"
    session.updated_at = datetime.utcnow()

    memory_svc, rag_svc = await get_services()

    memories = []
    if request.use_memory:
        memories = await memory_svc.retrieve_relevant(request.content, k=settings.memory_retrieval_k)

    rag_context = ""
    rag_sources = []
    if request.use_rag:
        rag_context, rag_sources = await rag_svc.format_context(request.content, k=settings.retrieval_k)

    system_content = build_system_prompt(memories, rag_context, rag_sources)
    messages = [{"role": "system", "content": system_content}]
    for msg in history[-20:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.content})

    if request.stream and settings.streaming:
        async def event_stream():
            full_response = ""
            try:
                async for token in llm_service.chat_stream(messages):
                    full_response += token
                    data = json.dumps({"type": "token", "content": token})
                    yield f"data: {data}\n\n"
                    await asyncio.sleep(0)
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
                return

            assistant_message = Message(
                id=str(uuid.uuid4()),
                session_id=request.session_id,
                role="assistant",
                content=full_response,
            )
            db.add(assistant_message)

            all_messages = [{"role": m.role, "content": m.content} for m in history]
            all_messages.append({"role": "user", "content": request.content})
            all_messages.append({"role": "assistant", "content": full_response})
            await memory_svc.extract_and_store(all_messages, request.session_id)

            await db.commit()

            done_data = json.dumps({
                "type": "done",
                "message_id": assistant_message.id,
                "memories_used": memories,
                "context_sources": rag_sources,
            })
            yield f"data: {done_data}\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    response_text = await llm_service.chat(messages)
    assistant_message = Message(
        id=str(uuid.uuid4()),
        session_id=request.session_id,
        role="assistant",
        content=response_text,
    )
    db.add(assistant_message)

    all_messages = [{"role": m.role, "content": m.content} for m in history]
    all_messages.append({"role": "user", "content": request.content})
    all_messages.append({"role": "assistant", "content": response_text})
    await memory_svc.extract_and_store(all_messages, request.session_id)

    await db.commit()

    return {
        "message": {
            "id": assistant_message.id,
            "session_id": request.session_id,
            "role": "assistant",
            "content": response_text,
            "created_at": assistant_message.created_at,
            "tokens_used": 0,
        },
        "memories_used": memories,
        "context_sources": rag_sources,
    }
