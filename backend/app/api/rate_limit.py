"""Simple in-memory rate limiter for the login endpoint (per client IP)."""
import threading
import time

_lock = threading.Lock()
_hits: dict[str, list[float]] = {}
WINDOW_SECONDS = 300
MAX_ATTEMPTS = 10


def rate_limited(client_ip: str) -> None:
    from fastapi import HTTPException, status

    now = time.time()
    with _lock:
        entries = _hits.get(client_ip, [])
        entries = [t for t in entries if now - t < WINDOW_SECONDS]
        if len(entries) >= MAX_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later.",
            )
        entries.append(now)
        _hits[client_ip] = entries


def reset() -> None:
    """Clear stored rate-limit hits (used by tests)."""
    with _lock:
        _hits.clear()