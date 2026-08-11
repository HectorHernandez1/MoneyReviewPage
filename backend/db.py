"""
Single source of truth for database connection config and shared query
constants. queries.py, database.py, and storage.py all import from here —
previously each kept its own copy, which invited drift.
"""

import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "dbname": os.environ.get("DB_NAME"),
    "user": os.environ.get("DB_USER"),
    "password": os.environ.get("DB_PASSWORD"),
    "host": os.environ.get("DB_HOST"),
    "port": os.environ.get("DB_PORT"),
    "options": "-c search_path=budget_app",
}

# Transfer/bookkeeping categories excluded from every spending query
EXCLUDED_CATEGORY_NAMES = ("Installment", "Payments", "Refunds & Returns")

# The same list as a SQL fragment: "('Installment','Payments','Refunds & Returns')"
EXCLUDED_CATEGORIES = "(" + ",".join(f"'{name}'" for name in EXCLUDED_CATEGORY_NAMES) + ")"
