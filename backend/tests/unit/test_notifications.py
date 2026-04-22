"""Unit tests for Slack notification helper."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.core.notifications import notify_slack


@pytest.mark.asyncio
async def test_notify_slack_success():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"ok": True}

    with patch("httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value.__aenter__.return_value
        instance.post = AsyncMock(return_value=mock_resp)
        result = await notify_slack(
            token="xoxb-test-token",
            channel="general",
            filename="contacts.csv",
            records_in=100,
            records_out=95,
            duplicates_removed=5,
            fields_normalized=42,
            job_id="smlt_abc123",
        )

    assert result is True


@pytest.mark.asyncio
async def test_notify_slack_api_error_returns_false():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"ok": False, "error": "channel_not_found"}

    with patch("httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value.__aenter__.return_value
        instance.post = AsyncMock(return_value=mock_resp)
        result = await notify_slack(
            token="xoxb-bad-token",
            channel="nonexistent",
            filename="data.csv",
            records_in=10,
            records_out=10,
            duplicates_removed=0,
            fields_normalized=0,
            job_id="smlt_xyz",
        )

    assert result is False


@pytest.mark.asyncio
async def test_notify_slack_network_error_returns_false():
    with patch("httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value.__aenter__.return_value
        instance.post = AsyncMock(side_effect=Exception("network error"))
        result = await notify_slack(
            token="xoxb-token",
            channel="general",
            filename="data.csv",
            records_in=5,
            records_out=5,
            duplicates_removed=0,
            fields_normalized=0,
            job_id="smlt_123",
        )

    assert result is False


@pytest.mark.asyncio
async def test_notify_slack_includes_quality_score_when_provided():
    captured = {}

    async def mock_post(url, **kwargs):
        captured["payload"] = kwargs.get("json", {})
        resp = MagicMock()
        resp.json.return_value = {"ok": True}
        return resp

    with patch("httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value.__aenter__.return_value
        instance.post = AsyncMock(side_effect=mock_post)
        await notify_slack(
            token="xoxb-token",
            channel="general",
            filename="data.csv",
            records_in=100,
            records_out=100,
            duplicates_removed=0,
            fields_normalized=10,
            job_id="smlt_123",
            quality_before={"score": 45},
            quality_after={"score": 88},
        )

    # Quality scores should appear in the message blocks
    blocks_text = str(captured.get("payload", ""))
    assert "45" in blocks_text
    assert "88" in blocks_text


@pytest.mark.asyncio
async def test_notify_slack_without_quality_scores():
    with patch("httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value.__aenter__.return_value
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"ok": True}
        instance.post = AsyncMock(return_value=mock_resp)
        # Should not raise even when quality scores are None
        result = await notify_slack(
            token="xoxb-token",
            channel="general",
            filename="data.csv",
            records_in=10,
            records_out=10,
            duplicates_removed=0,
            fields_normalized=0,
            job_id="smlt_123",
            quality_before=None,
            quality_after=None,
        )

    assert result is True
