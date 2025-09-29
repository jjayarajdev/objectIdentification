import exifread
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

from app.models import ExifMetadata

class ExifExtractor:
    """Service for extracting EXIF metadata from images"""

    @staticmethod
    def extract_metadata(file_path: Path) -> ExifMetadata:
        """
        Extract EXIF metadata from an image file.

        Args:
            file_path: Path to the image file

        Returns:
            ExifMetadata object containing extracted metadata
        """
        metadata = ExifMetadata()

        try:
            # Try using Pillow first for basic EXIF
            pil_exif = ExifExtractor._extract_with_pillow(file_path)
            if pil_exif:
                metadata = ExifExtractor._merge_metadata(metadata, pil_exif)

            # Try using exifread for more detailed EXIF
            exifread_data = ExifExtractor._extract_with_exifread(file_path)
            if exifread_data:
                metadata = ExifExtractor._merge_metadata(metadata, exifread_data)

        except Exception as e:
            metadata.additional_data["extraction_error"] = str(e)

        return metadata

    @staticmethod
    def _extract_with_pillow(file_path: Path) -> Dict[str, Any]:
        """
        Extract EXIF data using Pillow library.

        Args:
            file_path: Path to the image file

        Returns:
            Dictionary of EXIF data
        """
        exif_data = {}

        try:
            with Image.open(file_path) as img:
                # Basic image info
                exif_data['image_width'] = img.width
                exif_data['image_height'] = img.height

                # Get EXIF data
                exifdata = img.getexif()

                if exifdata:
                    for tag_id, value in exifdata.items():
                        tag = TAGS.get(tag_id, tag_id)

                        if tag == "Make":
                            exif_data['make'] = str(value).strip()
                        elif tag == "Model":
                            exif_data['model'] = str(value).strip()
                        elif tag == "DateTime":
                            exif_data['datetime'] = str(value)
                        elif tag == "ISOSpeedRatings":
                            exif_data['iso'] = value
                        elif tag == "FocalLength":
                            if hasattr(value, 'numerator') and hasattr(value, 'denominator'):
                                exif_data['focal_length'] = f"{value.numerator}/{value.denominator}mm"
                            else:
                                exif_data['focal_length'] = str(value)
                        elif tag == "FNumber":
                            if hasattr(value, 'numerator') and hasattr(value, 'denominator'):
                                exif_data['f_number'] = f"f/{value.numerator/value.denominator:.1f}"
                            else:
                                exif_data['f_number'] = str(value)
                        elif tag == "ExposureTime":
                            if hasattr(value, 'numerator') and hasattr(value, 'denominator'):
                                exif_data['exposure_time'] = f"{value.numerator}/{value.denominator}s"
                            else:
                                exif_data['exposure_time'] = str(value)
                        elif tag == "Orientation":
                            exif_data['orientation'] = value
                        elif tag == "Software":
                            exif_data['software'] = str(value).strip()
                        elif tag == "GPSInfo":
                            gps_data = ExifExtractor._parse_gps_info(value)
                            if gps_data:
                                exif_data.update(gps_data)

        except Exception as e:
            exif_data['pillow_error'] = str(e)

        return exif_data

    @staticmethod
    def _extract_with_exifread(file_path: Path) -> Dict[str, Any]:
        """
        Extract EXIF data using exifread library.

        Args:
            file_path: Path to the image file

        Returns:
            Dictionary of EXIF data
        """
        exif_data = {}

        try:
            with open(file_path, 'rb') as f:
                tags = exifread.process_file(f, details=True)

                for tag, value in tags.items():
                    # Camera make and model
                    if tag == "Image Make":
                        exif_data['make'] = str(value).strip()
                    elif tag == "Image Model":
                        exif_data['model'] = str(value).strip()
                    elif tag == "Image DateTime":
                        exif_data['datetime'] = str(value)
                    elif tag == "EXIF ISOSpeedRatings":
                        exif_data['iso'] = str(value)
                    elif tag == "EXIF FocalLength":
                        exif_data['focal_length'] = str(value)
                    elif tag == "EXIF FNumber":
                        exif_data['f_number'] = str(value)
                    elif tag == "EXIF ExposureTime":
                        exif_data['exposure_time'] = str(value)
                    elif tag == "Image Orientation":
                        exif_data['orientation'] = str(value)
                    elif tag == "Image Software":
                        exif_data['software'] = str(value).strip()

                    # GPS data
                    elif tag.startswith("GPS"):
                        if "gps_data" not in exif_data:
                            exif_data["gps_data"] = {}
                        exif_data["gps_data"][tag] = str(value)

                # Process GPS data if available
                if "gps_data" in exif_data:
                    gps_coords = ExifExtractor._parse_gps_from_exifread(exif_data["gps_data"])
                    if gps_coords:
                        exif_data.update(gps_coords)
                    del exif_data["gps_data"]  # Remove raw GPS data

        except Exception as e:
            exif_data['exifread_error'] = str(e)

        return exif_data

    @staticmethod
    def _parse_gps_info(gps_info: Dict) -> Dict[str, Any]:
        """
        Parse GPS information from EXIF GPS tags.

        Args:
            gps_info: GPS information dictionary

        Returns:
            Dictionary with latitude and longitude
        """
        gps_data = {}

        try:
            if gps_info:
                # Helper function to convert GPS coordinates
                def convert_to_degrees(value):
                    d = float(value[0])
                    m = float(value[1])
                    s = float(value[2])
                    return d + (m / 60.0) + (s / 3600.0)

                # Get latitude
                if 2 in gps_info and 1 in gps_info:
                    lat = convert_to_degrees(gps_info[2])
                    if gps_info[1] == 'S':
                        lat = -lat
                    gps_data['gps_latitude'] = lat

                # Get longitude
                if 4 in gps_info and 3 in gps_info:
                    lon = convert_to_degrees(gps_info[4])
                    if gps_info[3] == 'W':
                        lon = -lon
                    gps_data['gps_longitude'] = lon

        except Exception:
            pass

        return gps_data

    @staticmethod
    def _parse_gps_from_exifread(gps_tags: Dict[str, str]) -> Dict[str, Any]:
        """
        Parse GPS coordinates from exifread GPS tags.

        Args:
            gps_tags: Dictionary of GPS-related tags

        Returns:
            Dictionary with latitude and longitude
        """
        gps_data = {}

        try:
            # Helper function to parse GPS coordinate strings
            def parse_coord(coord_str: str) -> float:
                # Remove brackets and split
                coord_str = coord_str.strip('[]')
                parts = coord_str.split(', ')

                if len(parts) == 3:
                    # Parse degrees, minutes, seconds
                    deg = float(eval(parts[0]))
                    min = float(eval(parts[1]))
                    sec = float(eval(parts[2]))
                    return deg + (min / 60.0) + (sec / 3600.0)
                return 0.0

            # Extract latitude
            if "GPS GPSLatitude" in gps_tags and "GPS GPSLatitudeRef" in gps_tags:
                lat = parse_coord(gps_tags["GPS GPSLatitude"])
                if gps_tags["GPS GPSLatitudeRef"] == 'S':
                    lat = -lat
                gps_data['gps_latitude'] = lat

            # Extract longitude
            if "GPS GPSLongitude" in gps_tags and "GPS GPSLongitudeRef" in gps_tags:
                lon = parse_coord(gps_tags["GPS GPSLongitude"])
                if gps_tags["GPS GPSLongitudeRef"] == 'W':
                    lon = -lon
                gps_data['gps_longitude'] = lon

        except Exception:
            pass

        return gps_data

    @staticmethod
    def _merge_metadata(base: ExifMetadata, new_data: Dict[str, Any]) -> ExifMetadata:
        """
        Merge new EXIF data into existing ExifMetadata object.

        Args:
            base: Base ExifMetadata object
            new_data: New data to merge

        Returns:
            Updated ExifMetadata object
        """
        for key, value in new_data.items():
            if value is not None:
                if hasattr(base, key) and getattr(base, key) is None:
                    setattr(base, key, value)
                elif key not in ['pillow_error', 'exifread_error']:
                    # Store additional data
                    base.additional_data[key] = value

        return base