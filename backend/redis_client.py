import os
import redis
from functools import lru_cache

@lru_cache(maxsize=1)
def get_redis() -> redis.Redis:
    """Create and cache a Redis client using the REDIS_URL environment variable.
    The client is instantiated once per process and reused for subsequent calls.
    """
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        raise RuntimeError("REDIS_URL environment variable is not set")
    return redis.from_url(redis_url)
