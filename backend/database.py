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

async def get_category_limit(category_name):
    """Fetch the configured spending limit for a category."""
    if not category_name:
        return None

    query = """
        SELECT spending_limit
        FROM budget_app.spending_categories
        WHERE LOWER(category_name) = %s
        LIMIT 1
    """

    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        with conn.cursor() as cursor:
            cursor.execute(query, (category_name.lower(),))
            result = cursor.fetchone()

        if not result:
            return None

        limit_value = result[0]
        return float(limit_value) if limit_value is not None else None
    except Exception as e:
        print(f"Database error fetching limit for {category_name}: {e}")
        return None
    finally:
        if conn:
            conn.close()

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
        # Parse YYYY-MM format and create date range
        # This ensures we only get transactions from the 1st through the last day of the month
        conditions.append("transaction_date >= %s::date AND transaction_date < (%s::date + INTERVAL '1 month')")
        params.extend([f"{month}-01", f"{month}-01"])
        
        
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

async def get_all_categories():
    """
    Fetch all available spending categories from the database
    """
    query = """
    SELECT category_name 
    FROM budget_app.spending_categories 
    ORDER BY category_name;
    """
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        df = pd.read_sql(query, conn)
        conn.close()
        return df['category_name'].tolist()
    except Exception as e:
        print(f"Database error: {e}")
        return []

async def update_transaction_category(
    transaction_date,
    merchant_name,
    amount,
    person,
    new_category
):
    """
    Update the spending category for a specific transaction
    Uses composite key (date, merchant, amount, person) to identify the transaction
    
    Args:
        transaction_date: Transaction date (YYYY-MM-DD format)
        merchant_name: Merchant name
        amount: Transaction amount
        person: Person name who made the transaction
        new_category: New category name to assign
    
    Returns:
        True if update successful, False otherwise
    """
    # First, get the category_id and person_id from their names
    lookup_query = """
    SELECT 
        (SELECT id FROM budget_app.spending_categories WHERE category_name = %s) as category_id,
        (SELECT id FROM budget_app.persons WHERE name = %s) as person_id
    """
    
    update_query = """
    UPDATE budget_app.transactions
    SET category_id = %s
    WHERE transaction_date = %s::date
      AND merchant_name = %s
      AND amount = %s
      AND person_id = %s
    """
    
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        with conn.cursor() as cursor:
            # Look up the IDs
            cursor.execute(lookup_query, (new_category, person))
            result = cursor.fetchone()
            
            if not result or result[0] is None or result[1] is None:
                print(f"Could not find category '{new_category}' or person '{person}'")
                return False
            
            category_id, person_id = result
            
            # Update the transaction
            cursor.execute(update_query, (
                category_id,
                transaction_date,
                merchant_name,
                amount,
                person_id
            ))
            rows_affected = cursor.rowcount
            conn.commit()
            
        return rows_affected > 0
    except Exception as e:
        print(f"Database error updating transaction: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

async def get_all_categories_with_limits():
    """
    Fetch all categories with their spending limits
    Returns list of dicts with category_name and spending_limit
    """
    query = """
    SELECT category_name, spending_limit
    FROM budget_app.spending_categories
    ORDER BY category_name;
    """
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        df = pd.read_sql(query, conn)
        conn.close()
        return df.to_dict('records')
    except Exception as e:
        print(f"Database error: {e}")
        return []

async def update_category_limit(category_name, new_limit):
    """
    Update the spending limit for a category
    
    Args:
        category_name: Name of the category to update
        new_limit: New spending limit value
    
    Returns:
        True if update successful, False otherwise
    """
    query = """
    UPDATE budget_app.spending_categories
    SET spending_limit = %s
    WHERE category_name = %s
    """
    
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        with conn.cursor() as cursor:
            cursor.execute(query, (new_limit, category_name))
            rows_affected = cursor.rowcount
            conn.commit()
            
        return rows_affected > 0
    except Exception as e:
        print(f"Database error updating category limit: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

async def add_new_category(category_name, spending_limit=0.0):
    """
    Add a new spending category
    
    Args:
        category_name: Name of the new category
        spending_limit: Initial spending limit (default 0.0)
    
    Returns:
        True if category added successfully, False otherwise
    """
    query = """
    INSERT INTO budget_app.spending_categories (category_name, spending_limit)
    VALUES (%s, %s)
    """
    
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        with conn.cursor() as cursor:
            cursor.execute(query, (category_name, spending_limit))
            conn.commit()
            
        return True
    except Exception as e:
        print(f"Database error adding category: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()
