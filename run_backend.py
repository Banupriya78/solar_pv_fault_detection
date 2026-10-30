import os
import sys

# Automatically detect project root
current_dir = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(current_dir).lower() == "backend":
    root_dir = os.path.dirname(current_dir)
else:
    root_dir = current_dir

# Set working directory to project root and add to sys.path
os.chdir(root_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

if __name__ == "__main__":
    import uvicorn
    backend_dir = os.path.join(root_dir, "backend")
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=[backend_dir]
    )

