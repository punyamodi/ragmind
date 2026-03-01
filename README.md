# RAGMind

**An intelligent AI assistant with persistent memory and retrieval-augmented generation.**

RAGMind combines a teachable AI agent with a full-stack web interface. It remembers facts from every conversation, learns from documents you provide, and retrieves relevant context automatically — growing smarter the more you use it.

---

## Features

- **Persistent Memory** — Automatically extracts and stores key facts from conversations using semantic embeddings. The agent recalls relevant memories in future sessions.
- **Document RAG** — Upload PDFs, Word documents, Markdown, text files, or paste a URL. The system chunks, embeds, and retrieves the most relevant content for each query.
- **Streaming Responses** — Real-time token streaming via Server-Sent Events for a smooth chat experience.
- **Multi-Session Chat** — Create, rename, and manage multiple independent conversation sessions.
- **Semantic Memory Search** — Search your stored memories with natural language queries.
- **Configurable LLM** — Works with OpenAI (GPT-4o, GPT-3.5, etc.) or a local [Ollama](https://ollama.ai) instance with zero code changes.
- **Export Conversations** — Download any chat session as a formatted Markdown file.
- **Full Settings UI** — Adjust temperature, token limits, chunk size, retrieval K, and more from the browser.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│   React + TypeScript + TailwindCSS + Zustand            │
│                                                         │
│  ┌──────────┐  ┌───────────┐  ┌────────┐  ┌──────────┐ │
│  │   Chat   │  │ Documents │  │ Memory │  │ Settings │ │
│  └──────────┘  └───────────┘  └────────┘  └──────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / SSE
┌────────────────────────▼────────────────────────────────┐
│                   FastAPI Backend                        │
│                                                         │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ LLM Service│  │ Memory Svc   │  │  Document Svc   │  │
│  │ OpenAI /   │  │ Extract facts│  │  Chunk + Embed  │  │
│  │ Ollama     │  │ from convos  │  │  PDF/DOCX/URL   │  │
│  └────────────┘  └──────────────┘  └─────────────────┘  │
│                                                         │
│  ┌────────────────────────┐  ┌─────────────────────┐    │
│  │       ChromaDB         │  │      SQLite          │    │
│  │  memories + doc chunks │  │  sessions + messages │    │
│  └────────────────────────┘  └─────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Stack:**
| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| State | Zustand, TanStack Query |
| Backend | FastAPI, Python 3.12 |
| Vector DB | ChromaDB (persistent) |
| Relational DB | SQLite (via SQLAlchemy async) |
| LLM | OpenAI API or Ollama |
| Containerization | Docker + Docker Compose |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- An OpenAI API key **or** [Ollama](https://ollama.ai) running locally

### Local Development

**1. Clone the repository**

```bash
git clone https://github.com/punyamodi/ragmind.git
cd ragmind
```

**2. Backend setup**

```bash
cd backend
cp .env.example .env
# Edit .env and set OPENAI_API_KEY (or configure Ollama settings)

python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

**3. Frontend setup**

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Docker Compose

```bash
cp backend/.env.example backend/.env
# Edit backend/.env

docker compose up --build
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Configuration

All settings live in `backend/.env` (or are adjustable in the Settings page at runtime):

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | Your OpenAI API key |
| `LLM_PROVIDER` | `openai` | `openai` or `ollama` |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model name for OpenAI |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3.2` | Model to use with Ollama |
| `TEMPERATURE` | `0.7` | Sampling temperature |
| `MAX_TOKENS` | `2048` | Max response tokens |
| `CHUNK_SIZE` | `1000` | Characters per document chunk |
| `RETRIEVAL_K` | `5` | Document chunks to retrieve per query |
| `MEMORY_RETRIEVAL_K` | `8` | Memories to surface per query |

---

## API Reference

The backend exposes a REST API at `/api`. Interactive docs are at [http://localhost:8000/docs](http://localhost:8000/docs).

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sessions` | Create a chat session |
| `GET` | `/api/sessions` | List all sessions |
| `DELETE` | `/api/sessions/{id}` | Delete a session |
| `GET` | `/api/sessions/{id}/messages` | Get session messages |
| `POST` | `/api/sessions/{id}/export` | Export session as Markdown |
| `POST` | `/api/chat` | Send a message (streaming SSE) |
| `POST` | `/api/documents` | Upload a document |
| `POST` | `/api/documents/url` | Ingest a web URL |
| `GET` | `/api/documents` | List documents |
| `DELETE` | `/api/documents/{id}` | Delete a document |
| `GET` | `/api/memories` | List all memories |
| `POST` | `/api/memories/search` | Semantic memory search |
| `DELETE` | `/api/memories/{id}` | Delete a memory |
| `DELETE` | `/api/memories` | Clear all memories |
| `GET` | `/api/settings` | Get current settings |
| `PATCH` | `/api/settings` | Update settings |
| `GET` | `/api/health` | Health check |

---

## Project Structure

```
ragmind/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Settings management
│   │   ├── database.py          # SQLAlchemy models + async engine
│   │   ├── models/schemas.py    # Pydantic request/response models
│   │   ├── services/
│   │   │   ├── llm_service.py   # OpenAI / Ollama interface
│   │   │   ├── vector_store.py  # ChromaDB wrapper
│   │   │   ├── memory_service.py# Fact extraction and recall
│   │   │   ├── rag_service.py   # Document retrieval pipeline
│   │   │   └── document_service.py # File parsing and chunking
│   │   └── routes/
│   │       ├── chat.py          # SSE streaming chat endpoint
│   │       ├── sessions.py      # Session CRUD
│   │       ├── documents.py     # Document management
│   │       ├── memory.py        # Memory CRUD and search
│   │       └── settings.py      # Runtime settings + health
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/            # ChatWindow, MessageBubble, ChatInput
│   │   │   ├── Layout/          # Sidebar, Layout wrapper
│   │   │   ├── Documents/       # DocumentManager with drag-and-drop
│   │   │   ├── Memory/          # MemoryBrowser with semantic search
│   │   │   └── Settings/        # SettingsPanel
│   │   ├── store/               # Zustand stores (sessions, chat, settings)
│   │   ├── api/client.ts        # Axios API client
│   │   └── types/index.ts       # TypeScript interfaces
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── .gitignore
```

---

## How Teachability Works

After every assistant response, RAGMind runs a background extraction step:

1. The last 10 messages are summarized into an LLM prompt asking for concrete, reusable facts.
2. Extracted facts are embedded and stored in ChromaDB.
3. On every new query, the most semantically similar memories are retrieved.
4. Relevant memories are injected into the system prompt before the LLM generates a response.

This creates a persistent, growing knowledge base that is personal to each installation.

---

## Legacy

The original single-file AutoGen implementation is preserved in the [`legacy/original-autogen-agent`](https://github.com/punyamodi/ragmind/tree/legacy/original-autogen-agent) branch.

---

## License

MIT
