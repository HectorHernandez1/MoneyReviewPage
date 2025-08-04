import os
import pandas as pd
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Database configuration for remote server
DB_CONFIG = {
    "dbname": os.environ.get("DB_NAME"),
    "user": os.environ.get("DB_USER"),
    "password": os.environ.get("DB_PASSWORD"),
    "host": os.environ.get("DB_HOST"),
    "port": os.environ.get("DB_PORT"),
    "options": "-c search_path=budget_app"
}

async def get_transactions_data(
    user=None, 
    period=None, 
    year=None, 
    month=None
):
    """
    Fetch filtered data from the transactions_view
    
    Args:
        user: Filter by specific user/person (None for all users)
        period: 'monthly' or 'yearly'
        year: Specific year (for yearly periods)
        month: Specific month in YYYY-MM format (for monthly period)
    
    Default behavior: Returns current month data if no parameters provided
    """
    
    # Base query
    base_query = """
    SELECT 
        amount,
        merchant_name,
        spending_category,
        person,
        transaction_date,
        account_type
    FROM budget_app.transactions_view
    WHERE spending_category NOT IN ('Installment','Payments','Refunds & Returns')
    """
    
    # Build WHERE conditions
    conditions = []
    params = []
    
    # User filter
    if user and user.lower() != 'all':
        conditions.append("LOWER(person) = %s")
        params.append(user.lower())
    
    # Period filters - default to current month if nothing specified
    if period == 'monthly' and month:
        # Parse YYYY-MM format
        year_val, month_val = month.split('-')
        conditions.append("EXTRACT(YEAR FROM transaction_date) = %s AND EXTRACT(MONTH FROM transaction_date) = %s")
        params.extend([int(year_val), int(month_val)])
        
        
    elif period == 'yearly' and year:
        conditions.append("EXTRACT(YEAR FROM transaction_date) = %s")
        params.append(int(year))
        
    elif period == 'yearly' and year:
        conditions.append("EXTRACT(YEAR FROM transaction_date) = %s")
        params.append(int(year))
        
    else:
        # Default: current month only
        from datetime import datetime
        current_date = datetime.now()
        conditions.append("EXTRACT(YEAR FROM transaction_date) = %s AND EXTRACT(MONTH FROM transaction_date) = %s")
        params.extend([current_date.year, current_date.month])
    
    # Combine conditions
    if conditions:
        base_query += " AND " + " AND ".join(conditions)
    
    # Add ordering
    base_query += " ORDER BY transaction_date DESC"
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        df = pd.read_sql(base_query, conn, params=params)
        conn.close()
        return df
    except Exception as e:
        print(f"Database error: {e}")
        print(f"Query: {base_query}")
        print(f"Params: {params}")
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
    Fetch distinct months and years from the transactions_view
    """
    query = """
    SELECT DISTINCT 
        EXTRACT(YEAR FROM transaction_date) as year,
        EXTRACT(MONTH FROM transaction_date) as month
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
        
        
        return {
            'years': [int(year) for year in years],
            'months': month_options
        }
    except Exception as e:
        print(f"Database error: {e}")
        return {'years': [], 'months': []}

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