"""
rag/retrieval.py
────────────────
Retrieval-Augmented Generation pipeline:
  1. Embed the user question
  2. Query ChromaDB for top-k nearest chunks
  3. Build a prompt: system prompt + retrieved context + question
  4. Call GPT-4o-mini
  5. Return (answer_text, source_chunks)
"""

import logging
import os
from typing import List, Tuple

from openai import OpenAI

from rag.vectorstore import get_embeddings, get_vectorstore

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """\
You are a precise, helpful research assistant with access to a curated knowledge base.

## Your rules (follow strictly):

1. **Answer only from the provided context.**
   - Do NOT use any knowledge from your training data or outside the context blocks below.
   - If the context does not contain enough information to answer the question, respond
     with exactly: "I don't know based on the provided documents."

2. **Always cite your sources.**
   - After each factual statement (or at the end of each paragraph), include an inline
     citation in the format: [filename, chunk N]
   - Example: "The boiling point of water is 100 °C at sea level. [chemistry.pdf, chunk 3]"

3. **Be concise and structured.**
   - Use bullet points or short paragraphs.
   - Do not pad the answer with filler phrases like "Great question!" or "Certainly!".

4. **Never hallucinate.**
   - If a detail is not in the context, omit it rather than guessing.
"""


def _build_context_block(chunks: List[dict]) -> str:
    """Format retrieved chunks into a numbered context block."""
    lines = []
    for i, c in enumerate(chunks, start=1):
        meta = c["metadata"]
        lines.append(
            f"[Context {i}] File: {meta['filename']}, Chunk: {meta['chunk_index']}\n"
            f"{c['document']}"
        )
    return "\n\n---\n\n".join(lines)


def query_rag(
    question: str,
    top_k: int = 5,
) -> Tuple[str, List[dict]]:
    """
    Retrieve relevant chunks and generate an answer.

    Returns
    -------
    answer : str
    sources : list of dicts with keys filename / chunk_index / text
    """
    # 1. Embed query
    embeddings_model = get_embeddings()
    query_vector = embeddings_model.embed_query(question)

    # 2. Vector search
    collection = get_vectorstore()
    results    = collection.query(
        query_embeddings=[query_vector],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    # Unpack ChromaDB response (first row = first query)
    raw_docs      = results["documents"][0]
    raw_metas     = results["metadatas"][0]
    raw_distances = results["distances"][0]

    if not raw_docs:
        return "I don't know based on the provided documents.", []

    chunks = [
        {"document": doc, "metadata": meta, "distance": dist}
        for doc, meta, dist in zip(raw_docs, raw_metas, raw_distances)
    ]

    logger.info(
        "Retrieved %d chunks (best cosine distance: %.4f).",
        len(chunks),
        min(raw_distances),
    )

    # 3. Build prompt
    context_block = _build_context_block(chunks)
    user_message  = (
        f"## Retrieved context\n\n{context_block}\n\n"
        f"## Question\n\n{question}"
    )

    # 4. Call GPT-4o-mini
    client   = OpenAI()                    # reads OPENAI_API_KEY from env
    response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_message},
        ],
        temperature=0.2,                   # low temp for factual accuracy
        max_tokens=1024,
    )
    answer = response.choices[0].message.content.strip()

    # 5. Format sources for the API response
    sources = [
        {
            "filename":    c["metadata"]["filename"],
            "chunk_index": c["metadata"]["chunk_index"],
            "text":        c["document"],
        }
        for c in chunks
    ]

    return answer, sources
