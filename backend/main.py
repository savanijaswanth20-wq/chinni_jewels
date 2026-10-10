import os
import sys
import types

# Ensure backend root is on sys.path
backend_root = os.path.dirname(os.path.abspath(__file__))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

# Compatibility alias: allow 'backend.*' imports when running from inside backend/
if "backend" not in sys.modules:
    backend_shim = types.ModuleType("backend")
    backend_shim.__path__ = [backend_root]
    sys.modules["backend"] = backend_shim

from app.main import app

if "backend" in sys.modules:
    import app as app_pkg
    sys.modules["backend"].app = app_pkg

__all__ = ["app"]
