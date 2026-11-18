import pytest
from app.services.chunking_service import chunk_text
from app.services.vector_store import VectorStore
import numpy as np


def test_chunking_short_text():
    # 5 chars -> should return empty because min length is 10
    chunks = chunk_text("short")
    assert chunks == []


def test_chunking_valid_text():
    text = "Machine learning enables systems to learn from data automatically."
    chunks = chunk_text(text)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunking_sliding_window():
    # Generate 3000 chars text to verify overlapping chunks
    paragraph = "Distributed databases guarantee high availability and fault tolerance. " * 30
    chunks = chunk_text(paragraph)
    assert len(chunks) > 1
    # Check that chunks overlap
    assert len(chunks[0]) == 1200


def test_vector_store_cosine_similarity():
    vs = VectorStore()
    assert vs.size == 0

    # Add orthogonal and identical vectors
    vs.add("c1", [1.0, 0.0, 0.0])
    vs.add("c2", [0.0, 1.0, 0.0])
    vs.add("c3", [0.8, 0.6, 0.0])

    assert vs.size == 3

    # Query identical to c1
    results = vs.search([1.0, 0.0, 0.0], top_k=2)
    assert len(results) == 2
    assert results[0] == "c1"
    assert results[1] == "c3"

    # Query with zero vector
    assert vs.search([0.0, 0.0, 0.0]) == []


def test_vector_store_batch_insert():
    vs = VectorStore()
    ids = ["id_1", "id_2", "id_3"]
    embeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
    ]
    vs.add_batch(ids, embeddings)
    assert vs.size == 3

    search_res = vs.search([0.7, 0.8, 0.9], top_k=1)
    assert search_res == ["id_3"]
