"""Stratified sampling for LLM analysis."""

import random
from typing import Any


def stratified_sample(records: list[dict[str, Any]], n: int = 100) -> list[dict[str, Any]]:
    """
    Extract a representative sample from a dataset.
    - First 10 rows (shows typical structure)
    - Last 10 rows (catches format drift)
    - 10 rows with most null/empty values (edge cases)
    - 10 rows with longest total string values (complex data)
    - Remaining slots from random middle rows
    """
    total = len(records)
    if total <= n:
        return records[:]

    selected_indices: set[int] = set()

    # First 10
    for i in range(min(10, total)):
        selected_indices.add(i)

    # Last 10
    for i in range(max(0, total - 10), total):
        selected_indices.add(i)

    # 10 rows with most nulls/empty values
    def null_count(row: dict) -> int:
        return sum(1 for v in row.values() if not v or str(v) in ("N/A", "null", "None", ""))

    null_ranked = sorted(range(total), key=lambda i: null_count(records[i]), reverse=True)
    for i in null_ranked[:10]:
        selected_indices.add(i)

    # 10 rows with longest total string length
    def total_len(row: dict) -> int:
        return sum(len(str(v)) for v in row.values())

    len_ranked = sorted(range(total), key=lambda i: total_len(records[i]), reverse=True)
    for i in len_ranked[:10]:
        selected_indices.add(i)

    # Fill remaining with random rows from middle
    middle = list(range(10, total - 10))
    remaining_needed = n - len(selected_indices)
    if remaining_needed > 0 and middle:
        random_indices = random.sample(middle, min(remaining_needed, len(middle)))
        selected_indices.update(random_indices)

    return [records[i] for i in sorted(selected_indices)]
