from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os

from app.config import settings
from app.routers import upload, detection, exif, export, health, room_analysis, config, transactions
from app.middleware import TransactionLoggingMiddleware

# Create FastAPI app with enhanced documentation
app = FastAPI(
    title="Room Intelligence & Object Detection API",
    description="""
    ## Advanced Room Analysis with Object Detection

    This API provides comprehensive scene analysis using state-of-the-art AI technologies:

    ### 🚀 **Key Features**
    - **Scene Analysis**: AI-powered room/property analysis with detailed categorization
    - **Object Detection**: Accurate identification and counting of furniture, people, and infrastructure
    - **Cost Estimation**: Automated property valuation and item cost calculations
    - **DSPy Integration**: Consistent prompting with structured output validation
    - **Report Generation**: Professional Word documents and comprehensive analysis reports
    - **Batch Processing**: Multiple image analysis with concurrent processing

    ### 🔧 **Technologies Used**
    - **OpenAI GPT-4 Vision**: Advanced image understanding and analysis
    - **DSPy Framework**: Structured prompting for consistent outputs
    - **FastAPI**: High-performance async web framework
    - **Pydantic**: Data validation and serialization

    ### 📊 **Supported Scene Types**
    - Indoor Office Spaces
    - Residential Properties
    - Commercial Buildings
    - Industrial Facilities
    - Construction Sites
    - Infrastructure & Parking Areas

    ### 🎯 **Use Cases**
    - Property surveys and valuations
    - Facility management assessments
    - Insurance documentation
    - Real estate analysis
    - Construction progress monitoring
    """,
    version="1.0.0",
    contact={
        "name": "CBRE Object Identification Team",
        "email": "support@cbre-objectid.com"
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT"
    },
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc
    openapi_url="/openapi.json"
)

# Add Transaction Logging Middleware
app.add_middleware(TransactionLoggingMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for serving uploaded images
if os.path.exists(settings.upload_folder):
    app.mount("/uploads", StaticFiles(directory=settings.upload_folder), name="uploads")

# Mount static files for serving reports
if os.path.exists(settings.results_folder):
    app.mount("/reports", StaticFiles(directory=settings.results_folder), name="reports")

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(upload.router, prefix="/api/v1", tags=["Upload"])
app.include_router(detection.router, prefix="/api/v1", tags=["Detection"])
app.include_router(exif.router, prefix="/api/v1", tags=["EXIF"])
app.include_router(export.router, prefix="/api/v1", tags=["Export"])
app.include_router(room_analysis.router, prefix="/api/room-analysis", tags=["Room Intelligence"])
app.include_router(config.router, tags=["Configuration"])
app.include_router(transactions.router, tags=["Transactions"])

@app.on_event("startup")
async def startup_event():
    print(f"Starting Object Detection API...")
    print(f"Upload folder: {settings.upload_folder}")
    print(f"Results folder: {settings.results_folder}")
    if not settings.openai_api_key:
        print("⚠️  Warning: OPENAI_API_KEY not set in environment variables")

@app.get("/")
async def root():
    return {
        "name": "Room Intelligence & Object Detection API",
        "version": "1.0.0",
        "status": "operational",
        "description": "Advanced room analysis with AI-powered object detection and DSPy integration",
        "endpoints": {
            "health": "/health",
            "room_analysis": "/api/room-analysis",
            "upload": "/api/v1/upload",
            "documentation": {
                "swagger_ui": "/docs",
                "redoc": "/redoc",
                "documentation_hub": "/documentation",
                "openapi_json": "/openapi.json"
            }
        },
        "features": [
            "Scene Analysis with DSPy Integration",
            "Object Detection & Classification",
            "Cost Estimation & Property Valuation",
            "Batch Processing Support",
            "Professional Report Generation"
        ]
    }

@app.get("/documentation", response_class=HTMLResponse)
async def documentation_hub():
    """API Documentation Hub with links to Swagger UI and ReDoc"""
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Documentation - Room Intelligence</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: #333;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                text-align: center;
                color: white;
                margin-bottom: 40px;
                padding: 40px 20px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
            }
            .header h1 {
                font-size: 3em;
                margin: 0 0 10px 0;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .header p {
                font-size: 1.2em;
                opacity: 0.9;
            }
            .docs-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: 30px;
                margin-bottom: 40px;
            }
            .doc-card {
                background: white;
                border-radius: 15px;
                padding: 30px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            .doc-card:hover {
                transform: translateY(-10px);
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            }
            .doc-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #667eea, #764ba2);
            }
            .doc-card h2 {
                color: #333;
                font-size: 1.8em;
                margin: 0 0 15px 0;
            }
            .doc-card p {
                color: #666;
                margin-bottom: 25px;
                line-height: 1.6;
            }
            .doc-link {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 12px 30px;
                border-radius: 25px;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            .doc-link:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            .features {
                background: white;
                border-radius: 15px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .features h2 {
                text-align: center;
                color: #333;
                margin-bottom: 25px;
                font-size: 2em;
            }
            .feature-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
            }
            .feature-item {
                display: flex;
                align-items: center;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 10px;
                border-left: 4px solid #667eea;
            }
            .feature-icon {
                font-size: 1.5em;
                margin-right: 15px;
            }
            .footer {
                text-align: center;
                color: white;
                margin-top: 40px;
                padding: 20px;
                opacity: 0.8;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🤖 Room Intelligence API</h1>
                <p>Advanced Scene Analysis with AI-Powered Object Detection</p>
            </div>

            <div class="docs-grid">
                <div class="doc-card">
                    <h2>📋 Swagger UI</h2>
                    <p>Interactive API documentation with the ability to test endpoints directly in your browser. Perfect for exploring and understanding the API structure.</p>
                    <a href="/docs" class="doc-link">Open Swagger UI</a>
                </div>

                <div class="doc-card">
                    <h2>📖 ReDoc</h2>
                    <p>Beautiful, three-panel API documentation with detailed descriptions, examples, and schema information. Great for comprehensive API reference.</p>
                    <a href="/redoc" class="doc-link">Open ReDoc</a>
                </div>
            </div>

            <div class="features">
                <h2>🚀 Key Features</h2>
                <div class="feature-grid">
                    <div class="feature-item">
                        <span class="feature-icon">🎯</span>
                        <div>
                            <strong>DSPy Integration</strong><br>
                            Consistent prompting with structured validation
                        </div>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">🔍</span>
                        <div>
                            <strong>Object Detection</strong><br>
                            AI-powered identification and counting
                        </div>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">💰</span>
                        <div>
                            <strong>Cost Estimation</strong><br>
                            Automated property valuation
                        </div>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">📄</span>
                        <div>
                            <strong>Report Generation</strong><br>
                            Professional Word documents
                        </div>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">⚡</span>
                        <div>
                            <strong>Batch Processing</strong><br>
                            Multiple image analysis
                        </div>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">🏢</span>
                        <div>
                            <strong>Scene Types</strong><br>
                            Office, residential, commercial support
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <p>Room Intelligence & Object Detection API v1.0.0 | Powered by FastAPI & OpenAI GPT-4</p>
            </div>
        </div>
    </body>
    </html>
    """

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload
    )