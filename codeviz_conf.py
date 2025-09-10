"""
Configuration for CodeViz - Generic codebase visualization tool

Define exclusions, include overrides, and other settings for analysis and visualization.
"""
from pathlib import Path

# =============================================================================
# Extraction Configuration
# =============================================================================

# Modules to exclude from analysis (by name)
EXCLUDE_MODULES = set()

# File glob patterns to exclude from analysis
EXCLUDE_FILE_GLOBS = [
    "venv/**",
    "env/**",
    ".venv/**",
    "tests/**",
    "test_*",
    "**/tests/**",
    "__pycache__/**",
    "*.pyc",
    ".git/**",
    ".pytest_cache/**",
    "node_modules/**",
    "build/**",
    "dist/**",
    "*.egg-info/**",
    ".tox/**",
]

# Specific files to include (overrides exclusions)
# Set to None to disable, or provide a list of Path objects
INCLUDE_FILES = None

# Target directory for analysis (can be overridden by CLI)
# This should be set by the CLI or calling code
TARGET_DIR = None

# =============================================================================
# Viewer Configuration
# =============================================================================

# Default viewer mode: one of "default", "exec", "modules", "datastruct"
DEFAULT_MODE = "exec"

# Default server settings for viewer
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8080

# =============================================================================
# Output Configuration
# =============================================================================

# Default output directory for generated files
DEFAULT_OUTPUT_DIR = Path("out")

# Default filename for codebase graph JSON
DEFAULT_GRAPH_FILENAME = "codebase_graph.json"

# Ensure output directory exists
DEFAULT_OUTPUT_DIR.mkdir(exist_ok=True)

# =============================================================================
# Analysis Configuration
# =============================================================================

# Maximum depth for import analysis
MAX_IMPORT_DEPTH = 10

# Include external library imports in analysis
INCLUDE_EXTERNAL_IMPORTS = False

# Include builtin module imports in analysis  
INCLUDE_BUILTIN_IMPORTS = False

# Analyze decorators
ANALYZE_DECORATORS = True

# Analyze class inheritance
ANALYZE_INHERITANCE = True

# =============================================================================
# Language Support (for future expansion)
# =============================================================================

# Supported languages and their file extensions
SUPPORTED_LANGUAGES = {
    "python": [".py", ".pyx", ".pyi"],
    # Future: "typescript": [".ts", ".tsx"],
    # Future: "javascript": [".js", ".jsx"],
}

# Default language when not auto-detected
DEFAULT_LANGUAGE = "python"