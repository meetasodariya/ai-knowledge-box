import re

CHUNK_SIZE = 1200
OVERLAP = 150
MIN_CHUNK_LENGTH = 10


def chunk_text(text: str) -> list[str]:
    """
    Splits input text into overlapping chunks using sliding window.
    Normalizes whitespace and skips sub-threshold fragments.
    """
    normalised = re.sub(r"\s+", " ", text.strip())
    if not normalised:
        return []

    chunks = []
    start = 0
    total_len = len(normalised)

    while start < total_len:
        end = start + CHUNK_SIZE
        chunk = normalised[start:end].strip()

        if len(chunk) >= MIN_CHUNK_LENGTH:
            chunks.append(chunk)

        if end >= total_len:
            break

        start += CHUNK_SIZE - OVERLAP

    return chunks
