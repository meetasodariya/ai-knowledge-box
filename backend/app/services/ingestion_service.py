import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException

from app.core.logger import logger


async def process_content(source_type: str, content: str) -> tuple[str, str]:
    """
    Extracts title and raw clean content from note or URL.
    Returns (title, raw_content).
    """
    if source_type == "note":
        trimmed = content.strip()
        title = re.sub(r"\s+", " ", trimmed[:80])
        return title, trimmed

    if source_type == "url":
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; KnowledgeInbox/2.0; +https://github.com/turium)"
        }
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                resp = await client.get(content, headers=headers)
                resp.raise_for_status()
                html = resp.text
        except httpx.HTTPStatusError as e:
            logger.warning(f"URL returned bad status {e.response.status_code}: {content}")
            raise HTTPException(
                status_code=422,
                detail={"code": "FETCH_ERROR", "message": f"URL returned status {e.response.status_code}"}
            ) from e
        except (httpx.RequestError, httpx.TimeoutException) as e:
            logger.warning(f"Failed to fetch URL {content}: {e}")
            raise HTTPException(
                status_code=422,
                detail={"code": "FETCH_ERROR", "message": "Failed to fetch URL content or domain is unreachable"}
            ) from e

        # Parse with BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

        # Strip unneeded scripts, styles, and UI boilerplate
        for tag in soup(["script", "style", "nav", "footer", "aside", "header", "noscript"]):
            tag.decompose()

        body = soup.find("body")
        raw_text = body.get_text() if body else soup.get_text()
        raw_content = re.sub(r"\s+", " ", raw_text).strip()

        if len(raw_content) < 50:
            raise HTTPException(
                status_code=422,
                detail={"code": "FETCH_ERROR", "message": "Fetched URL returned insufficient readable text content"}
            )

        # Determine title
        page_title = soup.title.string.strip() if soup.title and soup.title.string else ""
        if not page_title:
            try:
                page_title = urlparse(content).netloc
            except Exception:
                page_title = content

        return page_title, raw_content

    raise HTTPException(
        status_code=400,
        detail={"code": "VALIDATION_ERROR", "message": f"Unsupported source type: {source_type}"}
    )
