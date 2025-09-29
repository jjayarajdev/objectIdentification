import os
import shutil
from pathlib import Path
from typing import Optional
import aiofiles
from fastapi import UploadFile

from app.config import settings

class StorageService:
    """Service for handling file storage operations"""

    def __init__(self):
        self.upload_folder = Path(settings.upload_folder)
        self.results_folder = Path(settings.results_folder)

        # Ensure directories exist
        self.upload_folder.mkdir(parents=True, exist_ok=True)
        self.results_folder.mkdir(parents=True, exist_ok=True)

    async def save_uploaded_file(
        self,
        file: UploadFile,
        file_id: str,
        file_extension: str
    ) -> Path:
        """
        Save an uploaded file to the storage directory.

        Args:
            file: The uploaded file
            file_id: Unique identifier for the file
            file_extension: File extension including the dot (e.g., '.jpg')

        Returns:
            Path to the saved file
        """
        filename = f"{file_id}{file_extension}"
        file_path = self.upload_folder / filename

        # Save the file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)

        # Reset file pointer for potential reuse
        await file.seek(0)

        return file_path

    def get_file_path(self, file_id: str, file_extension: str) -> Path:
        """
        Get the full path for a file based on its ID and extension.

        Args:
            file_id: Unique identifier for the file
            file_extension: File extension including the dot

        Returns:
            Full path to the file
        """
        filename = f"{file_id}{file_extension}"
        return self.upload_folder / filename

    def delete_file(self, file_path: Path) -> bool:
        """
        Delete a file from storage.

        Args:
            file_path: Path to the file to delete

        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception:
            return False

    def cleanup_old_files(self, days: int = 7) -> int:
        """
        Clean up files older than specified days.

        Args:
            days: Number of days to keep files

        Returns:
            Number of files deleted
        """
        import time

        deleted_count = 0
        cutoff_time = time.time() - (days * 24 * 60 * 60)

        for folder in [self.upload_folder, self.results_folder]:
            for file_path in folder.iterdir():
                if file_path.is_file():
                    if file_path.stat().st_mtime < cutoff_time:
                        try:
                            file_path.unlink()
                            deleted_count += 1
                        except Exception:
                            pass

        return deleted_count

    async def save_result(
        self,
        content: str,
        result_id: str,
        extension: str = ".json"
    ) -> Path:
        """
        Save processing results to the results directory.

        Args:
            content: Content to save
            result_id: Unique identifier for the result
            extension: File extension for the result file

        Returns:
            Path to the saved result file
        """
        filename = f"{result_id}{extension}"
        file_path = self.results_folder / filename

        async with aiofiles.open(file_path, 'w') as f:
            await f.write(content)

        return file_path