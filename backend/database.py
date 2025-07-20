import os
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://username:password@localhost:5432/dbname"
)

engine = create_engine(DATABASE_URL)

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
    ORDER BY transaction_date DESC;
    """
    
    try:
        df = pd.read_sql(query, engine)
        return df
    except Exception as e:
        print(f"Database error: {e}")
        return pd.DataFrame()

def test_connection():
    """Test database connection"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            return True
    except Exception as e:
        print(f"Connection failed: {e}")
        return False