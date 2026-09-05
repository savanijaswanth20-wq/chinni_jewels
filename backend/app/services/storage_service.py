import os
import re
import time
import uuid
import logging
from typing import Dict, Any, Optional
import httpx
from fastapi import HTTPException
from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
CONTENT_TYPE_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp"
}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


class StorageService:
    """
    Storage Service for managing image uploads to Supabase Storage
    with automatic fallback to local disk storage.
    """

    @classmethod
    def validate_file(cls, filename: str, file_size: int) -> str:
        """Validate file extension and size. Returns lowercased extension."""
        ext = os.path.splitext(filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image format. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
            )
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File size exceeds 5MB limit."
            )
        return ext

    @classmethod
    async def upload_image(
        cls,
        content: bytes,
        filename: str,
        content_type: Optional[str] = None,
        bucket: Optional[str] = None,
        subfolder: str = "products"
    ) -> Dict[str, Any]:
        """
        Uploads an image file to Supabase Storage.
        Falls back to local file storage if Supabase is unconfigured or unreachable.
        """
        ext = cls.validate_file(filename, len(content))
        target_bucket = bucket or settings.SUPABASE_STORAGE_BUCKET or "products"
        content_type = content_type or CONTENT_TYPE_MAP.get(ext, "image/jpeg")

        # Sanitize filename
        clean_name = re.sub(r"[^a-zA-Z0-9.-]", "_", os.path.basename(filename or "image.jpg"))
        timestamp = int(time.time())
        unique_token = uuid.uuid4().hex[:8]
        unique_name = f"{timestamp}_{unique_token}_{clean_name}"
        storage_path = f"{subfolder}/{unique_name}"

        # 1. Try Supabase Storage Upload if configured
        supabase_url = (settings.SUPABASE_URL or "").rstrip("/")
        auth_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY

        if supabase_url and auth_key:
            try:
                upload_url = f"{supabase_url}/storage/v1/object/{target_bucket}/{storage_path}"
                headers = {
                    "Authorization": f"Bearer {auth_key}",
                    "apikey": auth_key,
                    "Content-Type": content_type,
                    "x-upsert": "true",
                }

                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(upload_url, content=content, headers=headers)
                    if resp.status_code in (200, 201):
                        public_url = f"{supabase_url}/storage/v1/object/public/{target_bucket}/{storage_path}"
                        logger.info(f"Successfully uploaded to Supabase Storage: {storage_path}")
                        return {
                            "success": True,
                            "url": public_url,
                            "filename": unique_name,
                            "storage_path": storage_path,
                            "bucket": target_bucket,
                            "provider": "supabase"
                        }
                    else:
                        logger.warning(
                            f"Supabase storage upload returned status {resp.status_code}: {resp.text}. "
                            "Falling back to local storage."
                        )
            except Exception as e:
                logger.warning(f"Error during Supabase storage upload: {e}. Falling back to local storage.")

        # 2. Fallback to Local Disk Storage
        return cls._save_local(content, unique_name)

    @classmethod
    def _save_local(cls, content: bytes, unique_name: str) -> Dict[str, Any]:
        """Save file to local assets/uploads directory as a fallback."""
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        upload_dir = os.path.join(root_dir, "assets", "uploads")
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, unique_name)
        with open(file_path, "wb") as f:
            f.write(content)

        railway_domain = os.environ.get("RAILWAY_PUBLIC_DOMAIN") or "chinnijewels-production.up.railway.app"
        railway_domain = railway_domain.replace("https://", "").replace("http://", "").strip("/")
        public_url = f"https://{railway_domain}/assets/uploads/{unique_name}"

        logger.info(f"Saved image locally as fallback: {file_path}")
        return {
            "success": True,
            "url": public_url,
            "filename": unique_name,
            "storage_path": f"assets/uploads/{unique_name}",
            "provider": "local"
        }

    @classmethod
    async def delete_image(cls, target: str, bucket: Optional[str] = None) -> bool:
        """
        Delete an image from Supabase Storage or local disk.
        Accepts either a full URL or storage path.
        """
        target_bucket = bucket or settings.SUPABASE_STORAGE_BUCKET or "products"
        supabase_url = (settings.SUPABASE_URL or "").rstrip("/")
        auth_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY

        # Check if target is a Supabase Storage URL
        public_prefix = f"{supabase_url}/storage/v1/object/public/{target_bucket}/"
        if target.startswith(public_prefix):
            storage_path = target[len(public_prefix):]
        else:
            storage_path = target

        if supabase_url and auth_key and not storage_path.startswith("assets/"):
            try:
                delete_url = f"{supabase_url}/storage/v1/object/{target_bucket}/{storage_path}"
                headers = {
                    "Authorization": f"Bearer {auth_key}",
                    "apikey": auth_key,
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.delete(delete_url, headers=headers)
                    if resp.status_code in (200, 204):
                        return True
            except Exception as e:
                logger.warning(f"Failed to delete {storage_path} from Supabase storage: {e}")

        # Check local file deletion
        clean_target = target.replace("https://", "").replace("http://", "")
        if "/assets/uploads/" in clean_target or clean_target.startswith("assets/uploads/"):
            filename = clean_target.split("assets/uploads/")[-1]
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            local_path = os.path.join(root_dir, "assets", "uploads", filename)
            if os.path.exists(local_path):
                try:
                    os.remove(local_path)
                    return True
                except Exception as e:
                    logger.warning(f"Failed to delete local file {local_path}: {e}")

        return False
