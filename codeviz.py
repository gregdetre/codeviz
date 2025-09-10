#!/usr/bin/env python3
"""
CodeViz - Codebase visualization tool

A generic tool for visualizing Python codebases (with future TypeScript support).
Extracts code structure and provides an interactive viewer for exploring dependencies,
imports, functions, and data structures.
"""

from pathlib import Path
from typing import Optional
import webbrowser

import typer
from typing_extensions import Annotated

from codeviz_conf import DEFAULT_MODE, DEFAULT_OUTPUT_DIR, DEFAULT_HOST, DEFAULT_PORT

app = typer.Typer(
    name="codeviz",
    help="Codebase visualization tool for exploring code structure and dependencies",
    no_args_is_help=True,
)

# Extraction command group
extract_app = typer.Typer(name="extract", help="Extract codebase structure and dependencies")
app.add_typer(extract_app)

# Viewer command group  
view_app = typer.Typer(name="view", help="Interactive viewer for exploring extracted codebase")
app.add_typer(view_app)


@extract_app.command("python")
def extract_python(
    target_dir: Annotated[
        Path,
        typer.Argument(help="Directory containing Python code to analyze")
    ],
    out_path: Annotated[
        Optional[Path],
        typer.Option("--out", "-o", help="Output path for codebase graph JSON")
    ] = None,
    verbose: Annotated[
        bool,
        typer.Option("--verbose", "-v", help="Enable verbose output")
    ] = False,
):
    """Extract static codebase graph from Python code (AST + heuristics)."""
    try:
        from src.codeviz.extractor.main import extract as _extract
    except ImportError as e:
        typer.echo(f"Failed to import extractor: {e}", err=True)
        raise typer.Exit(1)
    
    try:
        if not target_dir.exists():
            typer.echo(f"Target directory does not exist: {target_dir}", err=True)
            raise typer.Exit(1)
            
        if not target_dir.is_dir():
            typer.echo(f"Target path is not a directory: {target_dir}", err=True)
            raise typer.Exit(1)
        
        # Set the target directory in our configuration
        from src.codeviz.extractor import main
        main.TARGET_DIR = target_dir
        
        output_path = _extract(str(out_path) if out_path else None)
        
        if verbose:
            typer.echo(f"Extracted codebase graph to: {output_path}")
        else:
            typer.echo(f"✓ {output_path}")
            
    except Exception as e:
        typer.echo(f"Extraction failed: {e}", err=True)
        raise typer.Exit(1)


@view_app.command("open")
def view_open(
    host: Annotated[
        str,
        typer.Option("--host", "-h", help="Host interface to bind")
    ] = DEFAULT_HOST,
    port: Annotated[
        int,
        typer.Option("--port", "-p", help="Port to serve on", min=1, max=65535)
    ] = DEFAULT_PORT,
    mode: Annotated[
        str,
        typer.Option("--mode", "-m", help="Viewer mode: default, exec, modules, datastruct")
    ] = DEFAULT_MODE,
    no_browser: Annotated[
        bool,
        typer.Option("--no-browser", help="Don't automatically open browser")
    ] = False,
    viewer_dir: Annotated[
        Optional[Path],
        typer.Option("--viewer-dir", help="Path to viewer files directory")
    ] = None,
):
    """Start interactive viewer for exploring codebase structure."""
    try:
        # Import the viewer startup logic
        from src.codeviz.viewer.server import start_viewer
    except ImportError as e:
        typer.echo(f"Failed to import viewer: {e}", err=True)
        raise typer.Exit(1)
    
    try:
        # Determine viewer directory
        if viewer_dir is None:
            viewer_dir = Path(__file__).parent / "src" / "codeviz" / "viewer"
            
        if not viewer_dir.exists():
            typer.echo(f"Viewer directory does not exist: {viewer_dir}", err=True)
            raise typer.Exit(1)
            
        url = f"http://{host}:{port}"
        
        # Check if graph data exists
        graph_path = Path(DEFAULT_OUTPUT_DIR) / "codebase_graph.json"
        if not graph_path.exists():
            typer.echo(f"No codebase graph found at {graph_path}")
            typer.echo("Run 'codeviz extract python <target_dir>' first")
            raise typer.Exit(1)
        
        typer.echo(f"Starting viewer at {url}")
        typer.echo(f"Viewer mode: {mode}")
        typer.echo(f"Graph data: {graph_path}")
        
        # Start the server
        server_process = start_viewer(
            host=host, 
            port=port, 
            viewer_dir=viewer_dir,
            mode=mode
        )
        
        # Open browser if requested
        if not no_browser:
            typer.echo(f"Opening {url} in browser...")
            webbrowser.open(url)
        
        typer.echo("Press Ctrl+C to stop the server")
        
        # Wait for server process
        try:
            server_process.wait()
        except KeyboardInterrupt:
            typer.echo("\nStopping server...")
            server_process.terminate()
            server_process.wait()
            
    except Exception as e:
        typer.echo(f"Failed to start viewer: {e}", err=True)
        raise typer.Exit(1)


@app.command("version")
def version():
    """Show version information."""
    typer.echo("CodeViz 0.1.0")
    typer.echo("Generic codebase visualization tool")


if __name__ == "__main__":
    app()