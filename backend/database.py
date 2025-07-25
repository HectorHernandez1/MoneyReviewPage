import os
import pandas as pd
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Database configuration like the working script
DB_CONFIG = {
    "dbname": "money_stuff",
    "user": os.environ.get("DB_USER", "hhhector9"),
    "password": os.environ.get("DB_PASSWORD", "REDACTED_PASSWORD"),
    "host": "localhost",
    "port": "5432",
    "options": "-c search_path=budget_app"
}

async def get_transactions_data():
    """
    Fetch data from the transactions_view
    """
    query = """
    SELECT 
        amount,
        merchant_name,
        spending_category,
        person,
        transaction_date,
        account_type
    FROM budget_app.transactions_view
    where spending_category NOT IN ( 'Installment','Payments','Refunds & Returns')
    ORDER BY transaction_date DESC;
    """
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        df = pd.read_sql(query, conn)
        conn.close()
        return df
    except Exception as e:
        print(f"Database error: {e}")
        return pd.DataFrame()

async def get_users_data():
    """
    Fetch distinct users from the transactions_view
    """
    query = "SELECT DISTINCT person FROM budget_app.transactions_view WHERE person IS NOT NULL ORDER BY person;"
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        df = pd.read_sql(query, conn)
        conn.close()
        return df['person'].tolist()
    except Exception as e:
        print(f"Database error: {e}")
        return []

def test_connection():
    """Test database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Connection failed: {e}")
        return False