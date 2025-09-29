from PIL import Image
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import io
import base64

class ImageProcessor:
    """Service for basic image processing operations"""

    @staticmethod
    def validate_image(file_path: Path) -> Tuple[bool, Optional[str]]:
        """
        Validate if the file is a valid image.

        Args:
            file_path: Path to the image file

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            with Image.open(file_path) as img:
                img.verify()
            return True, None
        except Exception as e:
            return False, str(e)

    @staticmethod
    def get_image_info(file_path: Path) -> Dict[str, Any]:
        """
        Get basic information about an image.

        Args:
            file_path: Path to the image file

        Returns:
            Dictionary containing image information
        """
        try:
            with Image.open(file_path) as img:
                return {
                    "width": img.width,
                    "height": img.height,
                    "format": img.format,
                    "mode": img.mode,
                    "size_bytes": file_path.stat().st_size
                }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def resize_image(
        file_path: Path,
        max_width: int = 1920,
        max_height: int = 1080
    ) -> Path:
        """
        Resize an image if it exceeds maximum dimensions.

        Args:
            file_path: Path to the image file
            max_width: Maximum width in pixels
            max_height: Maximum height in pixels

        Returns:
            Path to the resized image (same as input if no resize needed)
        """
        try:
            with Image.open(file_path) as img:
                if img.width > max_width or img.height > max_height:
                    img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
                    img.save(file_path, optimize=True, quality=95)
            return file_path
        except Exception:
            return file_path

    @staticmethod
    def image_to_base64(file_path: Path) -> Optional[str]:
        """
        Convert an image to base64 string for API transmission.

        Args:
            file_path: Path to the image file

        Returns:
            Base64 encoded string of the image
        """
        try:
            with open(file_path, "rb") as img_file:
                return base64.b64encode(img_file.read()).decode('utf-8')
        except Exception:
            return None

    @staticmethod
    def create_thumbnail(
        file_path: Path,
        thumbnail_size: Tuple[int, int] = (150, 150)
    ) -> Optional[bytes]:
        """
        Create a thumbnail of an image.

        Args:
            file_path: Path to the image file
            thumbnail_size: Tuple of (width, height) for the thumbnail

        Returns:
            Bytes of the thumbnail image
        """
        try:
            with Image.open(file_path) as img:
                img.thumbnail(thumbnail_size, Image.Resampling.LANCZOS)

                # Save thumbnail to bytes
                thumb_io = io.BytesIO()
                img.save(thumb_io, format=img.format or 'JPEG')
                thumb_io.seek(0)

                return thumb_io.getvalue()
        except Exception:
            return None

    @staticmethod
    def draw_bounding_boxes(
        file_path: Path,
        bounding_boxes: list,
        output_path: Optional[Path] = None
    ) -> Path:
        """
        Draw bounding boxes on an image.

        Args:
            file_path: Path to the image file
            bounding_boxes: List of bounding box dictionaries
            output_path: Optional output path for the modified image

        Returns:
            Path to the image with bounding boxes
        """
        from PIL import ImageDraw, ImageFont

        try:
            with Image.open(file_path) as img:
                draw = ImageDraw.Draw(img)

                for box in bounding_boxes:
                    # Extract box coordinates
                    x = box.get('x', 0)
                    y = box.get('y', 0)
                    width = box.get('width', 0)
                    height = box.get('height', 0)
                    label = box.get('label', '')
                    confidence = box.get('confidence', 0)

                    # Draw rectangle
                    draw.rectangle(
                        [(x, y), (x + width, y + height)],
                        outline='red',
                        width=2
                    )

                    # Add label
                    if label:
                        text = f"{label} ({confidence:.2f})"
                        draw.text((x, y - 10), text, fill='red')

                # Save the modified image
                if output_path is None:
                    output_path = file_path.parent / f"{file_path.stem}_boxes{file_path.suffix}"

                img.save(output_path)
                return output_path

        except Exception as e:
            print(f"Error drawing bounding boxes: {e}")
            return file_path