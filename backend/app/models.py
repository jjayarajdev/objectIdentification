from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum

class ExportFormat(str, Enum):
    JSON = "json"
    YOLO = "yolo"
    COCO = "coco"
    CSV = "csv"

class BoundingBox(BaseModel):
    x: float = Field(..., description="X coordinate of top-left corner")
    y: float = Field(..., description="Y coordinate of top-left corner")
    width: float = Field(..., description="Width of bounding box")
    height: float = Field(..., description="Height of bounding box")

class DetectedObject(BaseModel):
    label: str = Field(..., description="Object class label")
    confidence: float = Field(..., ge=0, le=1, description="Detection confidence score")
    bounding_box: BoundingBox

class TokenUsage(BaseModel):
    input_tokens: int = Field(0, description="Number of input tokens used")
    output_tokens: int = Field(0, description="Number of output tokens used")
    total_tokens: int = Field(0, description="Total tokens used")

class CostEstimate(BaseModel):
    input_cost: float = Field(0, description="Cost for input tokens")
    output_cost: float = Field(0, description="Cost for output tokens")
    total_cost: float = Field(0, description="Total cost")

class ExifMetadata(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    datetime: Optional[str] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    iso: Optional[int] = None
    focal_length: Optional[str] = None
    f_number: Optional[str] = None
    exposure_time: Optional[str] = None
    orientation: Optional[int] = None
    software: Optional[str] = None
    additional_data: Dict[str, Any] = Field(default_factory=dict)

class ImageResult(BaseModel):
    filename: str
    upload_timestamp: datetime
    image_url: Optional[str] = None
    image_id: Optional[str] = None  # Added for batch processing
    objects: List[DetectedObject] = Field(default_factory=list)
    analysis: Optional[str] = None
    exif: Optional[ExifMetadata] = None
    token_usage: Optional[TokenUsage] = None
    cost_estimate: Optional[CostEstimate] = None
    processing_time: Optional[float] = None
    room_analysis: Optional[Dict[str, Any]] = None  # Room intelligence analysis
    error: Optional[str] = None

class BatchResult(BaseModel):
    batch_id: str
    total_images: int
    processed_images: int
    failed_images: int
    images: List[ImageResult]
    total_token_usage: TokenUsage
    total_cost_estimate: CostEstimate
    total_processing_time: float
    start_time: datetime
    end_time: Optional[datetime] = None

class UploadResponse(BaseModel):
    success: bool
    message: str
    image_id: Optional[str] = None
    batch_id: Optional[str] = None
    results: Optional[List[ImageResult]] = None
    error: Optional[str] = None

class ProcessingStatus(BaseModel):
    status: str  # "pending", "processing", "completed", "failed"
    progress: float  # 0.0 to 1.0
    current_image: Optional[str] = None
    message: Optional[str] = None