# Configuration

CodeViz uses a flexible configuration system to customize codebase analysis and visualization. Configuration is handled through Python configuration files that define what to analyze, how to analyze it, and how to display the results.

## See also

- [SETUP.md](SETUP.md) - Initial setup and installation
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture overview
- [LAYOUT.md](LAYOUT.md) - Viewer layout and display options

## Configuration Files

CodeViz uses two types of configuration files:

1. **Main configuration** (`codeviz_conf.py`) - Global defaults and system settings
2. **Project-specific configuration** (`configs/*.py`) - Custom settings for specific codebases

### Main Configuration: `codeviz_conf.py`

The main configuration file contains global defaults that apply to all codebase analysis. This file is located in the project root and defines system-wide settings.

**Key sections:**

```python
# Extraction Configuration
EXCLUDE_MODULES = set()  # Modules to exclude by name
EXCLUDE_FILE_GLOBS = [   # File patterns to exclude
    "venv/**", "tests/**", "__pycache__/**", "*.pyc",
    ".git/**", "node_modules/**", "build/**", "dist/**"
]
INCLUDE_FILES = None     # Specific files to include (overrides exclusions)
TARGET_DIR = None        # Target directory (set by CLI)

# Viewer Configuration  
DEFAULT_MODE = "exec"    # Default viewer mode: "default", "exec", "modules", "datastruct"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8080

# Output Configuration
DEFAULT_OUTPUT_DIR = Path("out")
DEFAULT_GRAPH_FILENAME = "codebase_graph.json"

# Analysis Configuration
MAX_IMPORT_DEPTH = 10
INCLUDE_EXTERNAL_IMPORTS = False
INCLUDE_BUILTIN_IMPORTS = False
ANALYZE_DECORATORS = True
ANALYZE_INHERITANCE = True
```

### Project-Specific Configurations

Project-specific configurations are stored in the `configs/` directory and override the main configuration for specific codebases. Each configuration file is named after the project it analyzes.

**Example: `configs/gdwebgen_conf.py`**

```python
from pathlib import Path

# Target Project
TARGET_DIR = Path("/Users/greg/Dropbox/dev/blogging/gdwebgen")
PROJECT_NAME = "gdwebgen"

# Extraction Configuration
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
]

EXCLUDE_MODULES = {
    "gjdutils",  # External library
}

EXCLUDE_FILE_GLOBS = [
    "venv/**",
    "obsolete/**", 
    "tests/**",
    "test_*.py",
    "__pycache__/**",
    "*.pyc",
    ".git/**",
]

# Visualization Configuration
DEFAULT_MODE = "exec"
OUTPUT_DIR = "codeviz_output"

# Server Configuration
DEFAULT_HOST = "127.0.0.1" 
DEFAULT_PORT = 8000

# Analysis Hints
KEY_DATASTRUCTURES = ["Page", "Frontmatter", "Site"]
PIPELINE_PHASES = [
    "clean", "copy_content", "copy_direct", "generate",
    "post_generate_updates", "feeds", "redirects", "postflight"
]
```

## Configuration Loading

CodeViz loads configurations in the following order:

1. **Main config** (`codeviz_conf.py`) - Provides defaults
2. **CLI parameters** - Override config values
3. **Project-specific config** - Can be loaded dynamically (future feature)

The main configuration is imported directly by the CLI and extractor modules:

```python
from codeviz_conf import DEFAULT_MODE, DEFAULT_OUTPUT_DIR, DEFAULT_HOST, DEFAULT_PORT
```

## Configuration Options

### File Selection

**`INCLUDE_FILES`** - List of specific files to analyze
- Set to `None` to include all Python files (minus exclusions)
- Use relative paths from the target directory
- Overrides exclusion patterns for listed files

**`EXCLUDE_MODULES`** - Set of module names to exclude
- Prevents analysis of specific modules by name
- Useful for excluding external libraries or generated code

**`EXCLUDE_FILE_GLOBS`** - List of file patterns to exclude
- Uses glob patterns (wildcards supported)
- Applied before `INCLUDE_FILES` processing
- Common patterns: `"tests/**"`, `"**/test_*.py"`, `"venv/**"`

### Analysis Behavior

**`MAX_IMPORT_DEPTH`** - Maximum depth for import analysis (default: 10)
- Controls how deep the import tree analysis goes
- Higher values provide more complete graphs but slower analysis

**`INCLUDE_EXTERNAL_IMPORTS`** - Include imports from external libraries (default: False)
- When True, includes imports from pip-installed packages
- Increases graph size significantly

**`INCLUDE_BUILTIN_IMPORTS`** - Include Python builtin imports (default: False)
- When True, includes imports like `os`, `sys`, `json`
- Usually not needed for codebase structure analysis

**`ANALYZE_DECORATORS`** - Track decorator usage (default: True)
- Creates nodes and edges for decorator relationships
- Useful for frameworks that rely heavily on decorators

**`ANALYZE_INHERITANCE`** - Track class inheritance (default: True)
- Creates edges for class inheritance relationships
- Essential for understanding object-oriented codebases

### Visualization Settings

**`DEFAULT_MODE`** - Default viewer mode
- `"exec"` - Focus on execution flow and function calls
- `"modules"` - Module-level dependencies and structure  
- `"datastruct"` - Data structures and their relationships
- `"default"` - Balanced view of all relationships

**`OUTPUT_DIR`** - Directory for generated files (default: `"out"`)
- Where the codebase graph JSON and other outputs are saved
- Can be relative to target directory or absolute path

### Server Settings

**`DEFAULT_HOST`** - Host interface for the viewer (default: `"127.0.0.1"`)
- Use `"0.0.0.0"` to allow external connections
- Use `"127.0.0.1"` for localhost-only access

**`DEFAULT_PORT`** - Port for the viewer server (default: 8080)
- Choose an available port on your system
- Avoid conflicts with other development servers

### Analysis Hints

**`KEY_DATASTRUCTURES`** - Important data structures to highlight
- List of class/dataclass names that are central to the codebase
- Helps the viewer emphasize these structures in layouts

**`PIPELINE_PHASES`** - Important execution phases or stages
- List of function/method names that represent key processing steps
- Useful for understanding workflow in pipeline-style codebases

## Creating Project-Specific Configurations

1. **Create a new config file** in the `configs/` directory:
   ```bash
   touch configs/myproject_conf.py
   ```

2. **Define your project settings**:
   ```python
   from pathlib import Path
   
   # Project identification
   TARGET_DIR = Path("/path/to/your/project")
   PROJECT_NAME = "myproject"
   
   # Customize file selection
   INCLUDE_FILES = [
       "main.py",
       "core/__init__.py", 
       "core/processor.py",
       # Add your key files
   ]
   
   # Exclude unnecessary parts
   EXCLUDE_MODULES = {"external_lib", "vendor"}
   EXCLUDE_FILE_GLOBS = ["tests/**", "docs/**", "scripts/**"]
   
   # Set visualization preferences
   DEFAULT_MODE = "exec"  # or "modules", "datastruct"
   OUTPUT_DIR = "codeviz_analysis"
   DEFAULT_PORT = 8081  # Use different port if needed
   
   # Analysis hints for your domain
   KEY_DATASTRUCTURES = ["Config", "Request", "Response"]
   PIPELINE_PHASES = ["parse", "validate", "process", "output"]
   ```

3. **Test your configuration**:
   ```bash
   python codeviz.py extract python /path/to/your/project
   python codeviz.py view open
   ```

## Common Configuration Patterns

### Web Application
```python
# Focus on request/response flow and models
DEFAULT_MODE = "exec"
KEY_DATASTRUCTURES = ["Request", "Response", "User", "Session"]
PIPELINE_PHASES = ["authenticate", "validate", "process", "render"]
EXCLUDE_FILE_GLOBS = ["static/**", "templates/**", "migrations/**"]
```

### Data Processing Pipeline  
```python
# Emphasize data flow and transformations
DEFAULT_MODE = "datastruct"
KEY_DATASTRUCTURES = ["DataFrame", "Dataset", "Model", "Pipeline"]
PIPELINE_PHASES = ["extract", "transform", "validate", "load", "export"]
EXCLUDE_FILE_GLOBS = ["data/**", "output/**", "logs/**"]
```

### Library/Package
```python
# Show module structure and public APIs
DEFAULT_MODE = "modules"  
INCLUDE_FILES = None  # Include all files
EXCLUDE_FILE_GLOBS = ["examples/**", "benchmarks/**", "docs/**"]
KEY_DATASTRUCTURES = ["Config", "Client", "Response"]
```

### CLI Application
```python
# Focus on command structure and main functions
DEFAULT_MODE = "exec"
KEY_DATASTRUCTURES = ["Command", "Context", "Config"]
PIPELINE_PHASES = ["parse_args", "validate", "execute", "output"]
EXCLUDE_FILE_GLOBS = ["tests/**", "assets/**"]
```

## Troubleshooting Configuration

### No Files Found
- Check that `TARGET_DIR` points to the correct directory
- Verify `EXCLUDE_FILE_GLOBS` aren't too restrictive
- Use `INCLUDE_FILES` to explicitly specify files if needed

### Too Many Files
- Add more specific patterns to `EXCLUDE_FILE_GLOBS`
- Use `INCLUDE_FILES` to limit analysis to core files
- Exclude test directories and external dependencies

### Missing Relationships
- Enable `ANALYZE_DECORATORS` and `ANALYZE_INHERITANCE` 
- Increase `MAX_IMPORT_DEPTH` if import chains are cut short
- Check that important modules aren't in `EXCLUDE_MODULES`

### Viewer Performance Issues
- Reduce the number of files being analyzed
- Use `INCLUDE_FILES` to focus on core functionality
- Exclude large external dependencies
- Choose appropriate `DEFAULT_MODE` for your use case

### Server Won't Start
- Change `DEFAULT_PORT` if the port is in use
- Check firewall settings if using external host
- Verify the output directory exists and is writable