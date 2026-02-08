from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.routers import monitor, analysis
from backend.app.services.orbital import orbital_service

app = FastAPI(title=settings.PROJECT_NAME, version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(monitor.router)
app.include_router(analysis.router)

@app.on_event("startup")
def startup_event():
    # Load TLE data on startup
    orbital_service.load_data()

@app.get("/")
def health_check():
    return {"status": "operational", "version": "2.0.0"}
