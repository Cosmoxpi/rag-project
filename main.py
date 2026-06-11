import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from rag.ingestion import ingest_pdf
from rag.retrieval import query_rag
from rag.vectorstore import get_vectorstore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory registry of uploaded documents (resets on server restart)
# For persistence, you could store this in a JSON file or SQLite
_uploaded_docs: list[dict] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing ChromaDB vectorstore...")
    get_vectorstore()
    logger.info("Vectorstore ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="RAG Q&A API",
    description="Upload PDFs and query them with GPT-4o-mini + ChromaDB.",
    version="2.0.0",
    lifespan=lifespan,
)


# ─── Request / Response models ────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    top_k: int = Field(5, ge=1, le=20)


class ChunkSource(BaseModel):
    filename: str
    chunk_index: int
    text: str


class QueryResponse(BaseModel):
    answer: str
    sources: list[ChunkSource]


# ─── API Endpoints ────────────────────────────────────────────────────────────

@app.post("/upload", summary="Ingest one or more PDFs")
async def upload_pdf(file: UploadFile = File(...)):
    """Accept a single PDF upload. Call multiple times for multiple files."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        num_chunks = ingest_pdf(pdf_bytes=content, filename=file.filename)
    except Exception as exc:
        logger.exception("Ingestion failed")
        raise HTTPException(status_code=500, detail=f"Ingestion error: {exc}")

    # Track uploaded docs (avoid duplicates by filename)
    existing = next((d for d in _uploaded_docs if d["filename"] == file.filename), None)
    if existing:
        existing["chunks_stored"] = num_chunks
    else:
        _uploaded_docs.append({
            "filename": file.filename,
            "chunks_stored": num_chunks,
        })

    return JSONResponse(status_code=200, content={
        "message": "PDF ingested successfully.",
        "filename": file.filename,
        "chunks_stored": num_chunks,
    })


@app.post("/query", response_model=QueryResponse, summary="Query the knowledge base")
async def query(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question must not be blank.")

    try:
        answer, sources = query_rag(question=request.question, top_k=request.top_k)
    except Exception as exc:
        logger.exception("Query failed")
        raise HTTPException(status_code=500, detail=f"Query error: {exc}")

    return QueryResponse(
        answer=answer,
        sources=[ChunkSource(**s) for s in sources],
    )


@app.get("/documents", summary="List all indexed documents")
async def list_documents():
    """Returns all documents that have been uploaded in this session."""
    collection = get_vectorstore()
    total_chunks = collection.count()
    return {
        "documents": _uploaded_docs,
        "total_documents": len(_uploaded_docs),
        "total_chunks": total_chunks,
    }


@app.delete("/documents/{filename}", summary="Delete a document by filename")
async def delete_document(filename: str):
    """Remove all chunks for a given filename from the vector store."""
    collection = get_vectorstore()

    # Find all chunk IDs for this filename
    results = collection.get(where={"filename": filename})
    if not results["ids"]:
        raise HTTPException(status_code=404, detail=f"Document '{filename}' not found.")

    collection.delete(ids=results["ids"])

    # Remove from registry
    global _uploaded_docs
    _uploaded_docs = [d for d in _uploaded_docs if d["filename"] != filename]

    return {"message": f"Deleted '{filename}' ({len(results['ids'])} chunks removed)."}


@app.get("/health")
async def health():
    collection = get_vectorstore()
    return {
        "status": "ok",
        "documents": len(_uploaded_docs),
        "total_chunks": collection.count(),
    }


# ─── Serve the UI (must be LAST so API routes take priority) ──────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", include_in_schema=False)
async def serve_ui():
    return FileResponse("static/index.html")