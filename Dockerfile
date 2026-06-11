# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# System deps needed to compile some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install --prefix=/install --no-cache-dir -r requirements.txt


# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY main.py .
COPY rag/   rag/

# Directory where ChromaDB persists its index
RUN mkdir -p /app/chroma_db

# Non-root user for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# ── Runtime config ────────────────────────────────────────────────────────────
ENV PYTHONUNBUFFERED=1 \
    CHROMA_PERSIST_DIR=/app/chroma_db \
    CHROMA_COLLECTION=rag_documents \
    EMBED_MODEL=text-embedding-3-small \
    CHAT_MODEL=gpt-4o-mini
# OPENAI_API_KEY must be supplied at runtime (never bake into the image)

EXPOSE 8000


# Fix chromadb thin client flag
RUN python -c "import os, chromadb; path = os.path.join(os.path.dirname(chromadb.__file__), 'is_thin_client.py'); open(path, 'w').write('is_thin_client = False') if os.path.exists(path) else None"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
