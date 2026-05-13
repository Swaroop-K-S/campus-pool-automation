from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import datetime

from contextlib import asynccontextmanager
from app.core.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize MongoDB and Beanie
    await init_db()
    yield
    # Shutdown: Add cleanup here if needed

app = FastAPI(
    title="CampusPool Backend",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import auth, drive, checkin

app.include_router(auth.router, prefix="/api/v1")
app.include_router(drive.router, prefix="/api/v1")
app.include_router(checkin.router, prefix="/api/v1")

@app.get("/api/v1/health")
async def health_check():
    return {
        "success": True,
        "data": {
            "status": "ok",
            "timestamp": datetime.datetime.now().isoformat()
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=5000, reload=True)
