"""
Application entry point for NeuraReport v2.

Usage:
    uvicorn backend.v2.main:app --reload --port 8000
"""

import logging
import os

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

from .api import create_app

# Create the FastAPI application
app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.v2.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "true").lower() == "true",
    )
