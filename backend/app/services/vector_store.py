import json

import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import logger
from app.db.models import Chunk


class VectorStore:
    """
    High-performance in-memory Vector Store using NumPy.
    Caches normalized vectors to perform instantaneous matrix-vector dot products
    for cosine similarity search over top-K chunks.
    """

    def __init__(self):
        self._chunk_ids: list[str] = []
        # Matrix of shape (N, D) where vectors are pre-normalized
        self._matrix: np.ndarray = np.empty((0, 0), dtype=np.float32)

    @property
    def size(self) -> int:
        return len(self._chunk_ids)

    def clear(self):
        self._chunk_ids = []
        self._matrix = np.empty((0, 0), dtype=np.float32)

    def add(self, chunk_id: str, embedding: list[float]):
        """Adds a single vector to the index."""
        vec = np.array(embedding, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec = np.zeros_like(vec)

        if self.size == 0:
            self._matrix = vec.reshape(1, -1)
            self._chunk_ids = [chunk_id]
        else:
            self._matrix = np.vstack([self._matrix, vec.reshape(1, -1)])
            self._chunk_ids.append(chunk_id)

    def add_batch(self, chunk_ids: list[str], embeddings: list[list[float]]):
        """Adds a batch of vectors in a vectorized manner."""
        if not chunk_ids or not embeddings:
            return

        mat = np.array(embeddings, dtype=np.float32)
        norms = np.linalg.norm(mat, axis=1, keepdims=True)
        # Avoid division by zero
        norms[norms == 0] = 1.0
        mat = mat / norms

        if self.size == 0:
            self._matrix = mat
            self._chunk_ids = list(chunk_ids)
        else:
            self._matrix = np.vstack([self._matrix, mat])
            self._chunk_ids.extend(chunk_ids)

    async def load_from_db(self, session: AsyncSession):
        """Warms up the vector store index from the SQLite database."""
        self.clear()
        result = await session.execute(select(Chunk.id, Chunk.embedding))
        rows = result.all()

        if not rows:
            logger.info("Vector store loaded: 0 items.")
            return

        chunk_ids = []
        embeddings = []
        for chunk_id, emb_json in rows:
            try:
                emb = json.loads(emb_json)
                chunk_ids.append(chunk_id)
                embeddings.append(emb)
            except Exception as e:
                logger.warning(f"Failed to parse embedding for chunk {chunk_id}: {e}")

        self.add_batch(chunk_ids, embeddings)
        logger.info(f"Vector store loaded {self.size} vectors from database.")

    def search(self, query_embedding: list[float], top_k: int = 5) -> list[str]:
        """
        Calculates cosine similarities via matrix-vector multiplication.
        Returns ordered list of chunk IDs with highest similarity.
        """
        if self.size == 0:
            return []

        q = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q)
        if q_norm > 0:
            q = q / q_norm
        else:
            return []

        # Cosine similarity is simply the dot product with the pre-normalized matrix
        scores = np.dot(self._matrix, q)

        # Get top-k indices using argpartition for fast top selection
        k = min(top_k, self.size)
        if k == 0:
            return []

        top_indices = np.argsort(scores)[::-1][:k]
        return [self._chunk_ids[i] for i in top_indices]


vector_store = VectorStore()
