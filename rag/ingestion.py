"""
rag/ingestion.py
────────────────
PDF ingestion pipeline:
  1. Parse PDF bytes with PyMuPDF (fast, no temp files)
  2. Chunk text with LangChain's TokenTextSplitter (500 tok / 50 overlap)
  3. Embed chunks with OpenAI text-embedding-3-small
  4. Upsert into ChromaDB with metadata: filename + chunk_index
"""

import hashlib
import logging
from typing import List

import fitz  # PyMuPDF
from langchain_text_splitters import TokenTextSplitter

from rag.vectorstore import get_embeddings, get_vectorstore

logger = logging.getLogger(__name__)

# ── Chunking config ───────────────────────────────────────────────────────────
CHUNK_SIZE    = int(500)   # tokens
CHUNK_OVERLAP = int(50)    # tokens


def _parse_pdf(pdf_bytes: bytes) -> str:
    """Extract plain text from PDF bytes using PyMuPDF."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = [page.get_text("text") for page in doc]
    doc.close()
    full_text = "\n\n".join(pages)
    if not full_text.strip():
        raise ValueError("PDF contains no extractable text (scanned/image-only PDF?).")
    return full_text


def _chunk_text(text: str) -> List[str]:
    """Split text into token-sized chunks with overlap."""
    splitter = TokenTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )
    return splitter.split_text(text)


def _stable_doc_id(filename: str, chunk_index: int) -> str:
    """
    Deterministic ID so re-uploading the same file is idempotent
    (ChromaDB upsert deduplicates by ID).
    """
    raw = f"{filename}::{chunk_index}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def ingest_pdf(pdf_bytes: bytes, filename: str) -> int:
    """
    Full ingestion pipeline.

    Returns
    -------
    int
        Number of chunks stored.
    """
    logger.info("Parsing PDF: %s (%d bytes)", filename, len(pdf_bytes))
    text   = _parse_pdf(pdf_bytes)
    chunks = _chunk_text(text)
    logger.info("Split into %d chunks.", len(chunks))

    if not chunks:
        raise ValueError("No text chunks produced – the PDF may be empty.")

    # ── Embed ──────────────────────────────────────────────────────────────
    embeddings_model = get_embeddings()
    logger.info("Embedding %d chunks with OpenAI...", len(chunks))
    vectors = embeddings_model.embed_documents(chunks)   # List[List[float]]

    # ── Upsert into ChromaDB ───────────────────────────────────────────────
    collection = get_vectorstore()
    ids        = [_stable_doc_id(filename, i) for i in range(len(chunks))]
    metadatas  = [{"filename": filename, "chunk_index": i} for i in range(len(chunks))]

    collection.upsert(
        ids=ids,
        embeddings=vectors,
        documents=chunks,
        metadatas=metadatas,
    )
    logger.info("Upserted %d chunks for '%s'.", len(chunks), filename)
    return len(chunks)
