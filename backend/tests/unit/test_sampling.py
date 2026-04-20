"""Tests for stratified sampling."""

import pytest
from app.core.sampling import stratified_sample


def make_records(n: int) -> list[dict]:
    return [{"id": str(i), "name": f"Record {i}", "email": f"user{i}@x.com"} for i in range(n)]


def test_small_dataset_returned_whole():
    records = make_records(50)
    sample = stratified_sample(records, n=100)
    assert sample == records


def test_sample_size_capped():
    records = make_records(500)
    sample = stratified_sample(records, n=100)
    assert len(sample) <= 100


def test_includes_first_rows():
    records = make_records(200)
    sample = stratified_sample(records, n=100)
    # First 10 rows should be in the sample
    first_ids = {r["id"] for r in records[:10]}
    sample_ids = {r["id"] for r in sample}
    assert first_ids.issubset(sample_ids)


def test_includes_last_rows():
    records = make_records(200)
    sample = stratified_sample(records, n=100)
    last_ids = {r["id"] for r in records[-10:]}
    sample_ids = {r["id"] for r in sample}
    assert last_ids.issubset(sample_ids)


def test_includes_nulls_rows():
    records = make_records(200)
    # Make some rows have many nulls
    for i in range(20, 30):
        records[i] = {"id": str(i), "name": "", "email": ""}
    sample = stratified_sample(records, n=100)
    null_ids = {str(i) for i in range(20, 30)}
    sample_ids = {r["id"] for r in sample}
    # At least some null-heavy rows should be included
    assert len(null_ids & sample_ids) > 0


def test_exact_size():
    records = make_records(500)
    sample = stratified_sample(records, n=50)
    assert len(sample) <= 50


def test_empty_input():
    assert stratified_sample([], n=100) == []


def test_single_record():
    records = [{"id": "1"}]
    sample = stratified_sample(records, n=100)
    assert sample == records
