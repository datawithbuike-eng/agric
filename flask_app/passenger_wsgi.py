"""
Entry point for Hostinger's hPanel "Python App" feature (Phusion
Passenger). Passenger looks for a module-level `application` callable
in this exact file — it does not run app.py's `if __name__ == "__main__"`
block, so this is the only thing production actually imports.
"""
from app import app as application
