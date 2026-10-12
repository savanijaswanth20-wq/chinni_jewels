import os
import sys
import re
from contextlib import asynccontextmanager

# Self-register backend root directory into sys.path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

if "backend" not in sys.modules:
    import types
    backend_shim = types.ModuleType("backend")
    backend_shim.__path__ = [backend_root]
    sys.modules["backend"] = backend_shim

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.routers import auth, categories, products, gold_rates, inventory, orders, customers, admin, todos
from app.utils.seed import seed_database

from sqlalchemy import text

# Initialize database tables & perform safe column additions
def run_db_migrations():
    import time
    for attempt in range(5):
        try:
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
            return
        except Exception as e:
            if attempt < 4:
                time.sleep(1.5)
            else:
                import logging
                logging.getLogger(__name__).warning(f"Database initialization warning: {e}")

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
    description="Production-Ready REST API for CHINNI ONE GRAMGOLD Business.",
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
app.include_router(todos.router)

# Serve Frontend static directories (assets, css, js)
_CANDIDATE_DIRS = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),      # backend/ (/var/task on Vercel)
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")), # project root (local dev)
    os.getcwd(),                                                          # current working directory
    "/var/task"                                                           # Vercel serverless task root
]
ROOT_DIR = next((d for d in _CANDIDATE_DIRS if os.path.exists(os.path.join(d, "index.html"))), _CANDIDATE_DIRS[0])

# Locate static directories from candidate dirs
assets_dir = next((os.path.join(d, "assets") for d in _CANDIDATE_DIRS if os.path.exists(os.path.join(d, "assets"))), os.path.join(ROOT_DIR, "assets"))
css_dir = next((os.path.join(d, "css") for d in _CANDIDATE_DIRS if os.path.exists(os.path.join(d, "css"))), os.path.join(ROOT_DIR, "css"))
js_dir = next((os.path.join(d, "js") for d in _CANDIDATE_DIRS if os.path.exists(os.path.join(d, "js"))), os.path.join(ROOT_DIR, "js"))

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
if os.path.exists(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css")
if os.path.exists(js_dir):
    app.mount("/js", StaticFiles(directory=js_dir), name="js")

# Allowed HTML page names (alphanumeric + hyphens/underscores only) (#16)
_SAFE_PAGE_RE = re.compile(r'^[a-zA-Z0-9_-]+$')

@app.get("/")
@app.get("/index")
@app.get("/index.html")
def serve_root():
    for d in [ROOT_DIR] + _CANDIDATE_DIRS:
        index_file = os.path.join(d, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
    return {"brand": "CHINNI ONE GRAMGOLD", "docs": "/docs", "status": "online"}

@app.get("/favicon.ico")
def serve_favicon_ico():
    for d in [ROOT_DIR] + _CANDIDATE_DIRS:
        ico_path = os.path.join(d, "favicon.ico")
        if os.path.exists(ico_path):
            return FileResponse(ico_path)
    raise HTTPException(status_code=404, detail="Favicon not found")

@app.get("/favicon.svg")
def serve_favicon_svg():
    for d in [ROOT_DIR] + _CANDIDATE_DIRS:
        svg_path = os.path.join(d, "favicon.svg")
        if os.path.exists(svg_path):
            return FileResponse(svg_path, media_type="image/svg+xml")
    raise HTTPException(status_code=404, detail="Favicon not found")

@app.get("/api")
@app.get("/api/")
def api_status():
    return {"brand": "CHINNI ONE GRAMGOLD", "docs": "/docs", "status": "online"}

@app.get("/{page_name}.html")
@app.get("/{page_name}")
def serve_html_page(page_name: str):
    clean_name = page_name[:-5] if page_name.endswith(".html") else page_name
    if not _SAFE_PAGE_RE.match(clean_name):
        raise HTTPException(status_code=400, detail="Invalid page name")
    for d in [ROOT_DIR] + _CANDIDATE_DIRS:
        html_file = os.path.join(d, f"{clean_name}.html")
        if os.path.exists(html_file):
            return FileResponse(html_file)
        exact_file = os.path.join(d, page_name)
        if os.path.exists(exact_file) and os.path.isfile(exact_file):
            return FileResponse(exact_file)
    raise HTTPException(status_code=404, detail="Page not found")
