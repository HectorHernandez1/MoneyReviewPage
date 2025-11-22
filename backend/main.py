from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import (
    get_transactions_data,
    get_users_data,
    get_available_periods,
    get_category_limit
)
import pandas as pd
from datetime import datetime
from typing import Optional

app = FastAPI(title="Budget Data API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://your-server.local",
        "http://your-server.local:3000",
        "http://your-server.local:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Budget Data API"}

@app.get("/transactions")
async def get_transactions(
    period: Optional[str] = "monthly",
    year: Optional[int] = None,
    month: Optional[str] = None,
    user: Optional[str] = None
):
    """
    Get transaction data aggregated by period
    period: 'monthly', 'yearly'
    month: 'YYYY-MM' format for specific month
    """
    # Get filtered data directly from database
    df = await get_transactions_data(
        user=user,
        period=period,
        year=year,
        month=month
    )
    
    if df.empty:
        return {"data": [], "summary": {}}
    
    df['transaction_date'] = pd.to_datetime(df['transaction_date'])
    
    # Generate period info for display
    if period == "monthly" and month:
        year_val, month_val = month.split('-')
        current_period_info = pd.to_datetime(f"{year_val}-{month_val}-01").strftime("%B %Y")
    elif period == "yearly":
        current_year = year or datetime.now().year
        current_period_info = f"{current_year}"
    else:
        # Default: current month
        current_period_info = datetime.now().strftime("%B %Y")
    
    # Group by spending category
    grouped = df.groupby('spending_category')['amount'].sum().reset_index()
    grouped['period'] = current_period_info
    
    return {
        "data": grouped.to_dict('records'),
        "summary": {
            "total_amount": float(df['amount'].sum()),
            "transaction_count": len(df),
            "period": period,
            "current_period": current_period_info
        }
    }

@app.get("/categories")
async def get_categories(
    period: Optional[str] = "monthly",
    year: Optional[int] = None,
    month: Optional[str] = None,
    user: Optional[str] = None
):
    """Get spending categories summary for the specified period"""
    # Get filtered data directly from database
    df = await get_transactions_data(
        user=user,
        period=period,
        year=year,
        month=month
    )
    
    if df.empty:
        return {"categories": []}
    
    # Generate category summary statistics
    category_summary = df.groupby('spending_category').agg({
        'amount': ['sum', 'count', 'mean']
    }).round(2)
    
    category_summary.columns = ['total_amount', 'transaction_count', 'avg_amount']
    category_summary = category_summary.reset_index()
    
    return {"categories": category_summary.to_dict('records')}

@app.get("/raw-transactions")
async def get_raw_transactions(
    period: Optional[str] = "monthly",
    year: Optional[int] = None,
    month: Optional[str] = None,
    user: Optional[str] = None
):
    """
    Get raw transaction data for line chart
    """
    # Get filtered data directly from database
    df = await get_transactions_data(
        user=user,
        period=period,
        year=year,
        month=month
    )
    
    if df.empty:
        return {"data": []}
    
    df['transaction_date'] = pd.to_datetime(df['transaction_date'])
    
    # Convert to records and return raw transaction data
    transactions = df[['amount', 'spending_category', 'transaction_date']].to_dict('records')
    
    # Convert datetime to string for JSON serialization
    for transaction in transactions:
        transaction['transaction_date'] = transaction['transaction_date'].strftime('%Y-%m-%d')
    
    return {"data": transactions}

@app.get("/users")
async def get_users():
    """Get list of available users/persons"""
    users = await get_users_data()
    
    # Filter out empty values and sort
    users = [user for user in users if user and str(user).strip()]
    
    return {"users": users}

@app.get("/periods")
async def get_periods():
    """Get available periods (months, years) from database"""
    periods = await get_available_periods()
    return periods

@app.get("/category-transactions")
async def get_category_transactions(
    category: str,
    period: Optional[str] = "monthly",
    year: Optional[int] = None,
    month: Optional[str] = None,
    user: Optional[str] = None
):
    """
    Get detailed transactions for a specific category
    """
    print(f"DEBUG: Requested category: '{category}'")
    print(f"DEBUG: Parameters - period: {period}, user: {user}, month: {month}, year: {year}")
    
    # Get filtered data from database
    df = await get_transactions_data(
        user=user,
        period=period,
        year=year,
        month=month
    )
    
    print(f"DEBUG: Total transactions from database: {len(df)}")
    
    if df.empty:
        print("DEBUG: No transactions found from database")
        return {"transactions": []}
    
    # Debug: Print available categories
    available_categories = df['spending_category'].unique().tolist()
    print(f"DEBUG: Available categories: {available_categories}")
    
    # Filter by category (case-insensitive comparison)
    category_df = df[df['spending_category'].str.lower() == category.lower()].copy()
    
    print(f"DEBUG: Transactions found for category '{category}': {len(category_df)}")
    
    if category_df.empty:
        return {"transactions": []}
    
    # Ensure transaction_date is properly formatted
    category_df['transaction_date'] = pd.to_datetime(category_df['transaction_date'])
    
    # Sort by date descending (most recent first)
    category_df = category_df.sort_values('transaction_date', ascending=False)
    
    # Calculate totals and limit context before serialization
    total_spent = float(category_df['amount'].abs().sum())
    unique_months = category_df['transaction_date'].dt.to_period('M').nunique()
    months_multiplier = int(unique_months) if unique_months else 1

    limit_value = await get_category_limit(category)
    limit_info = {
        "category": category,
        "base_limit": limit_value,
        "months_multiplier": months_multiplier,
        "effective_limit": float(limit_value * months_multiplier) if limit_value is not None else None,
        "total_spent": total_spent,
        "difference": None
    }

    if limit_value is not None:
        limit_info["difference"] = limit_info["effective_limit"] - total_spent

    # Convert to records with all requested columns
    transactions = category_df[[
        'amount',
        'merchant_name', 
        'spending_category',
        'person',
        'transaction_date',
        'account_type'
    ]].to_dict('records')
    
    # Convert datetime to string for JSON serialization
    for transaction in transactions:
        transaction['transaction_date'] = transaction['transaction_date'].strftime('%Y-%m-%d')
    
    print(f"DEBUG: Returning {len(transactions)} transactions")
    return {
        "transactions": transactions,
        "limit_info": limit_info
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
