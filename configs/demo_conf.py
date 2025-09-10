# Demo codebase configuration
from codeviz_conf import CodeVizConfig

demo_config = CodeVizConfig(
    exclude_patterns=[
        "__pycache__/*",
        "*.pyc",
        ".git/*"
    ],
    exclude_modules=set(),
    include_only_patterns=[],
    max_depth=10,
    follow_imports=True,
    extract_docstrings=True,
    extract_type_hints=True,
    group_by_module=True
)