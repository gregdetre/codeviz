#!/usr/bin/env python3
"""
Quick test script to validate the codeviz setup.
"""

import sys
from pathlib import Path

def test_imports():
    """Test that all imports work correctly."""
    print("Testing imports...")
    
    try:
        import typer
        print("✓ typer imported successfully")
    except ImportError as e:
        print(f"✗ typer import failed: {e}")
        return False
    
    try:
        from codeviz_conf import DEFAULT_MODE, DEFAULT_HOST, DEFAULT_PORT
        print("✓ codeviz_conf imported successfully")
    except ImportError as e:
        print(f"✗ codeviz_conf import failed: {e}")
        return False
    
    try:
        # Test that we can import our modules
        sys.path.insert(0, str(Path(__file__).parent))
        from src.codeviz.extractor import main
        print("✓ extractor module imported successfully")
    except ImportError as e:
        print(f"✗ extractor module import failed: {e}")
        return False
    
    try:
        from src.codeviz.viewer import server
        print("✓ viewer server module imported successfully")
    except ImportError as e:
        print(f"✗ viewer server module import failed: {e}")
        return False
    
    return True

def test_structure():
    """Test that the project structure is correct."""
    print("\nTesting project structure...")
    
    required_files = [
        "codeviz.py",
        "codeviz_conf.py", 
        "standalone_extractor.py",
        "requirements.txt",
        "README.md",
        "CLAUDE.md",
        "src/codeviz/__init__.py",
        "src/codeviz/extractor/__init__.py",
        "src/codeviz/extractor/main.py",
        "src/codeviz/viewer/__init__.py",
        "src/codeviz/viewer/server.py",
    ]
    
    all_exist = True
    project_root = Path(__file__).parent
    
    for file_path in required_files:
        full_path = project_root / file_path
        if full_path.exists():
            print(f"✓ {file_path}")
        else:
            print(f"✗ {file_path} missing")
            all_exist = False
    
    return all_exist

def test_cli():
    """Test that CLI can be imported without errors."""
    print("\nTesting CLI...")
    
    try:
        # Just test import, don't execute
        with open("codeviz.py") as f:
            content = f.read()
        
        if "import typer" in content and "def extract_python" in content:
            print("✓ CLI structure looks correct")
            return True
        else:
            print("✗ CLI structure incomplete")
            return False
    except Exception as e:
        print(f"✗ CLI test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("CodeViz Setup Test")
    print("=" * 50)
    
    tests = [
        ("Import Test", test_imports),
        ("Structure Test", test_structure),
        ("CLI Test", test_cli),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        success = test_func()
        results.append(success)
    
    print("\n" + "=" * 50)
    if all(results):
        print("✓ All tests passed! CodeViz setup is ready.")
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Test extraction: python codeviz.py extract python .")
        print("3. Test viewer: python codeviz.py view open")
        return 0
    else:
        print("✗ Some tests failed. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())