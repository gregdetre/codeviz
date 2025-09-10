"""
Configuration for visualizing the gdwebgen codebase

This configuration is specific to analyzing the gdwebgen static site generator.
"""
from pathlib import Path

# =============================================================================
# Target Project
# =============================================================================

TARGET_DIR = Path("/Users/greg/Dropbox/dev/blogging/gdwebgen")
PROJECT_NAME = "gdwebgen"

# =============================================================================
# Extraction Configuration
# =============================================================================

# Files to include in analysis (relative to TARGET_DIR)
# If None, all Python files are included (minus exclusions)
INCLUDE_FILES = [
    "gdwebgen.py",
    "pipeline/build.py",
    "generate.py",
    "hoover.py",
    "typ.py",
    "pipeline/site.py",
    "obsidian_utils.py",
    "feeds.py",
    "sitemap.py",
    "redirects.py",
    "webserver.py",
    "cli/build.py",
    "cli/dev.py",
    "cli/check.py",
    "cli/content.py",
    "pipeline/clean.py",
    "pipeline/copy.py",
    "pipeline/postflight.py",
    "spider_404s.py",
]

# Modules to exclude from analysis
EXCLUDE_MODULES = {
    "gjdutils",  # External library
}

# File glob patterns to exclude
EXCLUDE_FILE_GLOBS = [
    "venv/**",
    "obsolete/**",
    "tests/**",
    "test_*.py",
    "__pycache__/**",
    "*.pyc",
    ".git/**",
]

# =============================================================================
# Visualization Configuration
# =============================================================================

# Default view mode for the visualization
DEFAULT_MODE = "exec"  # Options: "exec", "modules", "datastructures"

# Output directory for generated visualization data (relative to TARGET_DIR)
OUTPUT_DIR = "codeviz_output"

# =============================================================================
# Server Configuration
# =============================================================================

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000

# =============================================================================
# Analysis Hints
# =============================================================================

# Key data structures to track through the codebase
KEY_DATASTRUCTURES = ["Page", "Frontmatter", "Site"]

# Important phases/stages in the pipeline
PIPELINE_PHASES = [
    "clean",
    "copy_content", 
    "copy_direct",
    "generate",
    "post_generate_updates",
    "feeds",
    "redirects",
    "postflight",
]