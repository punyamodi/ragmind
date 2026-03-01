import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db, Session, Message
from app.models.schemas import SessionCreate, SessionUpdate, SessionResponse

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse)
async def create_session(data: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = Session(id=str(uuid.uuid4()), title=data.title)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return SessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=0,
    )


@router.get("", response_model=list[SessionResponse])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).order_by(Session.updated_at.desc()))
    sessions = result.scalars().all()
    responses = []
    for s in sessions:
        count_result = await db.execute(
            select(func.count()).where(Message.session_id == s.id)
        )
        msg_count = count_result.scalar() or 0
        responses.append(SessionResponse(
            id=s.id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=msg_count,
        ))
    return responses


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    count_result = await db.execute(
        select(func.count()).where(Message.session_id == session_id)
    )
    msg_count = count_result.scalar() or 0
    return SessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=msg_count,
    )


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(session_id: str, data: SessionUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.title = data.title
    session.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    count_result = await db.execute(
        select(func.count()).where(Message.session_id == session_id)
    )
    msg_count = count_result.scalar() or 0
    return SessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=msg_count,
    )


@router.delete("/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()
    return {"deleted": True}


@router.get("/{session_id}/messages")
async def get_messages(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")
    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return [
        {
            "id": m.id,
            "session_id": m.session_id,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at,
            "tokens_used": m.tokens_used,
        }
        for m in messages
    ]


@router.post("/{session_id}/export")
async def export_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    lines = [f"# {session.title}", f"Created: {session.created_at.isoformat()}", ""]
    for m in messages:
        role = "You" if m.role == "user" else "RAGMind"
        lines.append(f"**{role}** ({m.created_at.strftime('%H:%M')})")
        lines.append(m.content)
        lines.append("")
    return {"content": "\n".join(lines), "filename": f"{session.title}.md"}
