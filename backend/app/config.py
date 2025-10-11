import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # OpenAI Configuration
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")

    # Server Configuration
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    reload: bool = os.getenv("RELOAD", "True").lower() == "true"

    # Upload Configuration
    max_file_size_mb: int = int(os.getenv("MAX_FILE_SIZE_MB", "20"))
    allowed_extensions: list = [".jpg", ".jpeg", ".png", ".webp"]

    # Cost Configuration (per 1K tokens)
    input_token_cost: float = float(os.getenv("INPUT_TOKEN_COST", "0.0025"))
    output_token_cost: float = float(os.getenv("OUTPUT_TOKEN_COST", "0.01"))

    # Batch Processing
    max_concurrent_requests: int = int(os.getenv("MAX_CONCURRENT_REQUESTS", "5"))
    request_timeout: int = int(os.getenv("REQUEST_TIMEOUT", "30"))

    # Storage Paths
    upload_folder: str = os.getenv("UPLOAD_FOLDER", "./uploads")
    results_folder: str = os.getenv("RESULTS_FOLDER", "./results")

    # Google Maps Configuration
    google_maps_api_key: str = os.getenv("GOOGLE_MAPS_API_KEY", "")

    # CORS Configuration
    cors_origins: list = ["http://localhost:3000", "http://localhost:5173"]

settings = Settings()

# Create necessary directories
os.makedirs(settings.upload_folder, exist_ok=True)
os.makedirs(settings.results_folder, exist_ok=True)