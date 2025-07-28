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

async def get_available_periods():
    """
    Fetch distinct months, quarters, and years from the transactions_view
    """
    query = """
    SELECT DISTINCT 
        EXTRACT(YEAR FROM transaction_date) as year,
        EXTRACT(MONTH FROM transaction_date) as month,
        EXTRACT(QUARTER FROM transaction_date) as quarter
    FROM budget_app.transactions_view 
    ORDER BY year DESC, month DESC;
    """
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        df = pd.read_sql(query, conn)
        conn.close()
        
        # Get distinct years
        years = sorted(df['year'].unique(), reverse=True)
        
        # Get months with year info
        months = df[['year', 'month']].drop_duplicates().sort_values(['year', 'month'], ascending=[False, False])
        month_options = []
        for _, row in months.iterrows():
            month_name = pd.to_datetime(f"{int(row['year'])}-{int(row['month'])}-01").strftime("%B")
            month_options.append({
                'value': f"{int(row['year'])}-{int(row['month']):02d}",
                'label': f"{month_name} {int(row['year'])}"
            })
        
        # Get quarters with year info
        quarters = df[['year', 'quarter']].drop_duplicates().sort_values(['year', 'quarter'], ascending=[False, False])
        quarter_options = []
        for _, row in quarters.iterrows():
            quarter_options.append({
                'value': f"{int(row['year'])}-Q{int(row['quarter'])}",
                'label': f"Q{int(row['quarter'])} {int(row['year'])}"
            })
        
        return {
            'years': [int(year) for year in years],
            'months': month_options,
            'quarters': quarter_options
        }
    except Exception as e:
        print(f"Database error: {e}")
        return {'years': [], 'months': [], 'quarters': []}

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