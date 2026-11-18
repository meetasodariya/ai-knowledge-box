# 🧠 AI Knowledge Inbox

A minimal, production-ready web application for saving notes and URLs, and asking questions over them via an asynchronous RAG (Retrieval-Augmented Generation) pipeline with cited sources.

---

## ⚡ Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** FastAPI (Python 3.12), Uvicorn, Pydantic v2
- **Database:** SQLite with WAL mode (`SQLAlchemy 2.0` + `aiosqlite`)
- **Vector Search:** In-memory NumPy cosine similarity (pre-normalized matrix dot products)
- **AI Models:** Google Gemini (`gemini-embedding-001` for embeddings, `gemini-3.5-flash-lite` for generation)

---

## 🚀 Quick Start (Local Run)

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate          # Windows (Linux/macOS: source venv/bin/activate)
pip install -r requirements.txt

# Add your Gemini API key in backend/.env:
# OPENAI_API_KEY=AbCdEfG...

python -m uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
```
- API live at: `http://localhost:3001`
- Interactive Swagger docs at: `http://localhost:3001/docs`

### 2. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
- UI live at: `http://localhost:5173`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ingest` | Ingests note or fetches URL, chunks text, generates embeddings, stores in DB |
| `GET` | `/api/items` | Lists saved items with pagination (`limit`, `offset`) and chunk counts |
| `POST` | `/api/query` | Semantic search over chunks, generates answers grounded in context with citations |
| `GET` | `/api/health` | Health check returning status, uptime, and indexed vector count |

---

## ⚖️ Design Decisions & Tradeoffs

| Component | Choice | Rationale & Tradeoff |
|---|---|---|
| **Chunking** | Fixed sliding window (1200 chars, 150 overlap) | Predictable, simple, keeps sentence context intact across boundaries. Lacks deep semantic boundary detection. |
| **Vector Store** | In-memory NumPy matrix | High-speed $O(1)$ batch dot-product search with zero external infra. Limited by RAM at ~100K+ vectors. |
| **Database** | SQLite in WAL mode | Zero setup, persistent across restarts, non-blocking concurrent reads. In production, migrate to PostgreSQL. |
| **Ingestion** | `httpx` + `BeautifulSoup` | Strips script/style noise cleanly. Does not execute JavaScript for single-page apps (SPAs). |

---

