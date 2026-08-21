import os
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.routers import auth, categories, products, gold_rates, inventory, orders, customers, admin
from app.utils.seed import seed_database

from sqlalchemy import text

# Initialize database tables & perform safe column additions
def run_db_migrations():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        # SAFETY NOTE (#1): These values are strictly hardcoded below.
        # NEVER use dynamic/user-supplied values here — raw SQL injection risk.
        cols_to_add = [
            ("orders", "payment_preference", "VARCHAR DEFAULT 'UPI'"),
            ("order_items", "product_image_url", "VARCHAR"),
            ("order_items", "gold_rate", "FLOAT DEFAULT 0.0"),
            ("order_items", "gold_value", "FLOAT DEFAULT 0.0"),
            ("products", "price", "FLOAT DEFAULT 0.0"),
            ("products", "image_url", "VARCHAR")
        ]
        for tbl, col, col_def in cols_to_add:
            try:
                conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_def};"))
            except Exception:
                pass
        conn.commit()

run_db_migrations()

# Lifespan context manager (replaces deprecated @app.on_event) (#15)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed database
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    # Shutdown: nothing to clean up

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-Ready REST API for CHINNI ONE GRAM GOLD Business.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(categories.router, prefix=settings.API_V1_STR)
app.include_router(products.router, prefix=settings.API_V1_STR)
app.include_router(gold_rates.router, prefix=settings.API_V1_STR)
app.include_router(inventory.router, prefix=settings.API_V1_STR)
app.include_router(orders.router, prefix=settings.API_V1_STR)
app.include_router(customers.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

# Serve Frontend static directories (assets, css, js)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
assets_dir = os.path.join(ROOT_DIR, "assets")
css_dir = os.path.join(ROOT_DIR, "css")
js_dir = os.path.join(ROOT_DIR, "js")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
if os.path.exists(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css")
if os.path.exists(js_dir):
    app.mount("/js", StaticFiles(directory=js_dir), name="js")

# Allowed HTML page names (alphanumeric + hyphens/underscores only) (#16)
_SAFE_PAGE_RE = re.compile(r'^[a-zA-Z0-9_-]+$')

@app.get("/")
def serve_index():
    index_file = os.path.join(ROOT_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"brand": "CHINNI ONE GRAM GOLD", "docs": "/docs"}

@app.get("/{page_name}.html")
def serve_html_page(page_name: str):
    # Path traversal guard: only allow safe page names (#16)
    if not _SAFE_PAGE_RE.match(page_name):
        raise HTTPException(status_code=400, detail="Invalid page name")
    file_path = os.path.join(ROOT_DIR, f"{page_name}.html")
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Page not found")
