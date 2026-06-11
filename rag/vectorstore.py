import os
import logging

import chromadb
from langchain_openai import OpenAIEmbeddings

logger = logging.getLogger(__name__)

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
COLLECTION_NAME    = os.getenv("CHROMA_COLLECTION", "rag_documents")
EMBED_MODEL        = os.getenv("EMBED_MODEL", "text-embedding-3-small")

_client     = None
_collection = None
_embeddings = None


def get_embeddings() -> OpenAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(model=EMBED_MODEL)
    return _embeddings


def get_vectorstore():
    global _client, _collection

    if _collection is not None:
        return _collection

    logger.info("Connecting to ChromaDB at %s", CHROMA_PERSIST_DIR)
    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)

    _client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)

    _collection = _client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    logger.info(
        "Collection '%s' ready – %d docs indexed.",
        COLLECTION_NAME,
        _collection.count(),
    )
    return _collection