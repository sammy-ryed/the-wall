import functools
import pickle
import hashlib
from typing import Any, Callable

from redis_client import get_redis


def _make_cache_key(func_name: str, args: tuple, kwargs: dict) -> str:
    """Generate a deterministic cache key based on function name and its arguments.
    Args are serialized using pickle and then hashed to keep the key length reasonable.
    """
    try:
        # Serialize arguments; use pickle for complex objects
        data = pickle.dumps((args, kwargs))
    except Exception:
        # Fallback to string representation if pickling fails
        data = str((args, kwargs)).encode()
    digest = hashlib.sha256(data).hexdigest()
    return f"{func_name}:{digest}"


def redis_cache(ttl: int = 60) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Decorator to cache function results in Redis.

    Args:
        ttl: Time‑to‑live for the cached entry in seconds (default 60).
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            client = get_redis()
            key = _make_cache_key(func.__name__, args, kwargs)
            try:
                cached = client.get(key)
                if cached is not None:
                    return pickle.loads(cached)
            except Exception:
                # If Redis is unavailable, fall back to direct execution
                pass
            # Compute result and cache it
            result = func(*args, **kwargs)
            try:
                client.setex(key, ttl, pickle.dumps(result))
            except Exception:
                # Silently ignore caching errors
                pass
            return result
        return wrapper
    return decorator


def invalidate_cache(pattern: str) -> None:
    """Delete all keys matching the given pattern.
    This is useful for invalidating related cache entries after a write operation.
    """
    client = get_redis()
    try:
        for key in client.scan_iter(match=pattern):
            client.delete(key)
    except Exception:
        # If Redis is unavailable, ignore
        pass
