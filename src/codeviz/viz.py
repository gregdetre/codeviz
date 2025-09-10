from pathlib import Path
from typing import Optional

import click
import webbrowser

from gjdutils.ports import free_port_if_in_use, looks_like_addr_in_use
from gjdutils.webserver import start_server


viz = click.Group(name="viz", help="Codebase visualization tools.")


@viz.command(name="extract")
@click.option(
    "--out",
    "out_path",
    type=click.Path(dir_okay=False, writable=True, resolve_path=True),
    default=None,
    help="Write codebase graph JSON to this path (default: gdviz/out/codebase_graph.json)",
)
@click.pass_context
def viz_extract(ctx, out_path: Optional[str]):
    """Extract static codebase graph JSON (AST + heuristics)."""
    verbose = ctx.obj["VERBOSE"]
    try:
        # Import lazily to avoid import-time issues when packaging
        from gdviz.extractor.main import extract as _extract
    except Exception as e:
        raise click.ClickException(f"Failed to import extractor: {e}")
    try:
        out = _extract(out_path)
        if verbose >= 1:
            click.echo(f"Wrote codebase graph to {out}")
    except Exception as e:
        raise click.ClickException(f"Extraction failed: {e}")


@viz.command(name="open")
@click.option(
    "--host", default="127.0.0.1", show_default=True, help="Host interface to bind."
)
@click.option(
    "--port",
    type=click.IntRange(1, 65535),
    default=8000,
    show_default=True,
    help="Port to serve on.",
)
@click.option(
    "--no-open",
    is_flag=True,
    default=False,
    help="Do not open the browser automatically.",
)
@click.option(
    "--kill-port/--no-kill-port",
    default=True,
    show_default=True,
    help="Automatically terminate any processes already listening on the chosen port before starting.",
)
@click.pass_context
def viz_open(ctx, host: str, port: int, no_open: bool, kill_port: bool):
    """Serve the repo root and open the viewer."""
    # Ensure a graph exists; if not, extract it first
    try:
        from gdviz.extractor.main import DEFAULT_OUTPUT as _DEFAULT_GRAPH

        p = Path(_DEFAULT_GRAPH)
        if not p.exists():
            from gdviz.extractor.main import extract as _extract

            _extract(None)
    except Exception:
        # Best-effort; continue to serve regardless
        pass

    url = f"http://{host}:{port}/gdviz/viewer/index.html"
    if not no_open:
        try:
            webbrowser.open(url)
        except Exception:
            pass
    verbose = ctx.obj["VERBOSE"]
    if verbose >= 1:
        click.echo(f"Serving repo root at {url}")
    # Best-effort: free the port if requested
    if kill_port:
        free_port_if_in_use(port, verbose)
    try:
        # Serve the repo root so the viewer and JSON are accessible
        repo_root = str(Path(__file__).resolve().parent.parent)
        start_server(
            host,
            port,
            repo_root,
            disable_cache=True,
            quiet_requests=False,
        )
    except OSError as e:
        if kill_port and looks_like_addr_in_use(e):
            if verbose >= 1:
                click.echo(
                    f"Port {port} appears busy; attempting to free it and retry..."
                )
            free_port_if_in_use(port, verbose)
            try:
                repo_root = str(Path(__file__).resolve().parent.parent)
                start_server(
                    host,
                    port,
                    repo_root,
                    disable_cache=True,
                    quiet_requests=False,
                )
                return
            except OSError as e2:
                raise click.ClickException(
                    f"Could not start server on port {port} after freeing: {e2}"
                )
        raise click.ClickException(f"Could not start server on port {port}: {e}")


def register(root_cli: click.Group) -> None:
    """Register the viz group with the root CLI."""
    root_cli.add_command(viz)
