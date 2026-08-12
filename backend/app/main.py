import os
from fastapi import FastAPI
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
        cols_to_add = [
            ("orders", "payment_preference", "VARCHAR DEFAULT 'UPI'"),
            ("order_items", "product_image_url", "VARCHAR"),
            ("order_items", "gold_rate", "FLOAT DEFAULT 0.0"),
            ("order_items", "gold_value", "FLOAT DEFAULT 0.0")
        ]
        for tbl, col, col_def in cols_to_add:
            try:
                conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_def};"))
            except Exception:
                pass
        conn.commit()

run_db_migrations()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-Ready REST API for CNINNI JEWELS 1-Gram Gold Business.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database on startup
@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

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

@app.get("/")
def serve_index():
    index_file = os.path.join(ROOT_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"brand": "CNINNI JEWELS", "docs": "/docs"}

@app.get("/{page_name}.html")
def serve_html_page(page_name: str):
    file_path = os.path.join(ROOT_DIR, f"{page_name}.html")
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return {"error": "Page not found"}

