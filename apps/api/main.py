from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AI Personal Wardrobe Assistant API",
    description="Backend API for the AI Personal Wardrobe Assistant",
    version="0.1.0",
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "ai-stylish-api",
        "version": "0.1.0",
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AI Personal Wardrobe Assistant API",
        "version": "0.1.0",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
