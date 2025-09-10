"""
Simple HTTP server for serving the codebase visualization viewer.
"""

import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

def start_viewer(host: str, port: int, viewer_dir: Path, mode: str) -> subprocess.Popen:
    """Start the viewer server.
    
    Args:
        host: Host to bind to
        port: Port to serve on
        viewer_dir: Path to viewer files
        mode: Viewer mode
        
    Returns:
        Server process
    """
    # Check if the viewer directory contains a Vite project
    cyto_dir = viewer_dir / "cyto"
    if cyto_dir.exists() and (cyto_dir / "package.json").exists():
        # Use the Vite dev server
        return start_vite_server(host, port, cyto_dir)
    else:
        # Fall back to simple HTTP server
        return start_simple_server(host, port, viewer_dir)


def start_vite_server(host: str, port: int, vite_dir: Path) -> subprocess.Popen:
    """Start Vite development server."""
    try:
        # Check if node_modules exists, if not run npm install
        if not (vite_dir / "node_modules").exists():
            print("Installing dependencies...")
            install_process = subprocess.run(
                ["npm", "install"],
                cwd=vite_dir,
                capture_output=True,
                text=True
            )
            if install_process.returncode != 0:
                raise RuntimeError(f"npm install failed: {install_process.stderr}")
        
        # Start the Vite dev server
        cmd = ["npm", "run", "dev", "--", "--host", host, "--port", str(port)]
        process = subprocess.Popen(
            cmd,
            cwd=vite_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        
        # Give it a moment to start
        time.sleep(2)
        
        return process
        
    except FileNotFoundError:
        print("Warning: npm not found, falling back to simple HTTP server")
        return start_simple_server(host, port, vite_dir.parent)
    except Exception as e:
        print(f"Warning: Failed to start Vite server ({e}), falling back to simple HTTP server")
        return start_simple_server(host, port, vite_dir.parent)


def start_simple_server(host: str, port: int, serve_dir: Path) -> subprocess.Popen:
    """Start a simple Python HTTP server."""
    import http.server
    import socketserver
    import os
    
    # Change to serve directory
    original_cwd = Path.cwd()
    os.chdir(serve_dir)
    
    try:
        # Create a simple server
        handler = http.server.SimpleHTTPRequestHandler
        
        class CustomHandler(handler):
            def end_headers(self):
                # Add CORS headers for development
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', '*')
                super().end_headers()
        
        with socketserver.TCPServer((host, port), CustomHandler) as httpd:
            print(f"Serving at http://{host}:{port}")
            
            # Start server in background
            process = subprocess.Popen(
                [sys.executable, "-m", "http.server", str(port), "--bind", host],
                cwd=serve_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            return process
            
    finally:
        os.chdir(original_cwd)