import asyncio
import pytest
from unittest.mock import patch, AsyncMock
from fastapi import HTTPException
from app.services.storage_service import StorageService


def test_validate_file_valid():
    assert StorageService.validate_file("test.jpg", 1024) == ".jpg"
    assert StorageService.validate_file("PHOTO.PNG", 2048) == ".png"
    assert StorageService.validate_file("image.webp", 500) == ".webp"
    assert StorageService.validate_file("necklace.jpeg", 100) == ".jpeg"


def test_validate_file_invalid_extension():
    with pytest.raises(HTTPException) as exc_info:
        StorageService.validate_file("malicious.exe", 100)
    assert exc_info.value.status_code == 400
    assert "Invalid image format" in exc_info.value.detail

    with pytest.raises(HTTPException) as exc_info:
        StorageService.validate_file("vector.svg", 100)
    assert exc_info.value.status_code == 400


def test_validate_file_oversized():
    with pytest.raises(HTTPException) as exc_info:
        StorageService.validate_file("large.jpg", 6 * 1024 * 1024)
    assert exc_info.value.status_code == 400
    assert "File size exceeds 5MB limit" in exc_info.value.detail


def test_upload_image_supabase_success():
    async def run():
        fake_content = b"\xff\xd8\xff\xe0\x00\x10JFIF"
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.text = '{"Key":"products/uploads/test.jpg"}'

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            res = await StorageService.upload_image(
                content=fake_content,
                filename="necklace.jpg",
                content_type="image/jpeg"
            )
            assert res["success"] is True
            assert res["provider"] == "supabase"
            assert "storage/v1/object/public/images/" in res["url"]
            assert res["url"].startswith("http")

    asyncio.run(run())


def test_upload_image_fallback_to_local():
    async def run():
        fake_content = b"fake-png-content"

        with patch("httpx.AsyncClient.post", side_effect=Exception("Connection failed")):
            res = await StorageService.upload_image(
                content=fake_content,
                filename="earring.png",
                content_type="image/png"
            )
            assert res["success"] is True
            assert res["provider"] == "local"
            assert "/assets/uploads/" in res["url"]

    asyncio.run(run())
