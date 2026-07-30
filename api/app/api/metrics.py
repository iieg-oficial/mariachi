from __future__ import annotations

import threading
from collections import defaultdict

_counters: dict[str, int] = defaultdict(int)
_lock = threading.Lock()

COUNTER_RATE_LIMIT_HITS = 'mariachi_rate_limit_hits_total'
COUNTER_TREE_NOTIFY_FAILED = 'mariachi_tree_notify_failed_total'
COUNTER_LOGIN_FAILED = 'mariachi_login_failed_total'
COUNTER_LOGIN_LOCKED = 'mariachi_login_locked_total'


def incr(name: str, amount: int = 1) -> None:
    with _lock:
        _counters[name] += amount


ONTOY_COUNTERS: tuple[str, ...] = (
    COUNTER_RATE_LIMIT_HITS,
    COUNTER_LOGIN_FAILED,
    COUNTER_LOGIN_LOCKED,
    COUNTER_TREE_NOTIFY_FAILED,
)


def snapshot() -> dict[str, int]:
    with _lock:
        return {name: _counters[name] for name in ONTOY_COUNTERS}
