from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import get_transactions_data, get_users_data, get_available_periods
import pandas as pd
from datetime import datetime
from typing import Optional

app = FastAPI(title="Budget Data API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
    quarter: Optional[str] = None,
    user: Optional[str] = None
):
    """
    Get transaction data aggregated by period
    period: 'monthly', 'quarterly', 'ytd'
    month: 'YYYY-MM' format for specific month
    quarter: 'YYYY-QN' format for specific quarter
    """
    df = await get_transactions_data()
    
    if df.empty:
        return {"data": [], "summary": {}}
    
    df['transaction_date'] = pd.to_datetime(df['transaction_date'])
    
    # Apply user filter if specified
    if user and user != "all":
        df = df[df['person'].str.lower() == user.lower()]
    
    if period == "monthly" and month:
        # Parse month parameter (YYYY-MM)
        year_val, month_val = map(int, month.split('-'))
        df_period = df[
            (df['transaction_date'].dt.year == year_val) &
            (df['transaction_date'].dt.month == month_val)
        ]
        current_period_info = pd.to_datetime(f"{year_val}-{month_val:02d}-01").strftime("%B %Y")
        
    elif period == "quarterly" and quarter:
        # Parse quarter parameter (YYYY-QN)
        year_val, quarter_val = quarter.split('-Q')
        year_val = int(year_val)
        quarter_val = int(quarter_val)
        df_period = df[
            (df['transaction_date'].dt.year == year_val) &
            (df['transaction_date'].dt.quarter == quarter_val)
        ]
        current_period_info = f"Q{quarter_val} {year_val}"
        
    elif period == "ytd":
        current_year = year or datetime.now().year
        df_period = df[df['transaction_date'].dt.year == current_year]
        current_period_info = f"{current_year}-YTD"
        
    else:
        # Default fallback - current year
        current_year = year or datetime.now().year
        df_period = df[df['transaction_date'].dt.year == current_year]
        current_period_info = f"{current_year}"
    
    grouped = df_period.groupby('spending_category')['amount'].sum().reset_index()
    grouped['period'] = current_period_info
    
    return {
        "data": grouped.to_dict('records'),
        "summary": {
            "total_amount": float(df_period['amount'].sum()),
            "transaction_count": len(df_period),
            "period": period,
            "current_period": current_period_info
        }
    }

@app.get("/categories")
async def get_categories(
    period: Optional[str] = "monthly",
    year: Optional[int] = None,
    month: Optional[str] = None,
    quarter: Optional[str] = None,
    user: Optional[str] = None
):
    """Get spending categories summary for the specified period"""
    df = await get_transactions_data()
    
    if df.empty:
        return {"categories": []}
    
    df['transaction_date'] = pd.to_datetime(df['transaction_date'])
    
    # Apply user filter if specified
    if user and user != "all":
        df = df[df['person'].str.lower() == user.lower()]
    
    # Apply same period filtering as transactions endpoint
    if period == "monthly" and month:
        year_val, month_val = map(int, month.split('-'))
        df_period = df[
            (df['transaction_date'].dt.year == year_val) &
            (df['transaction_date'].dt.month == month_val)
        ]
    elif period == "quarterly" and quarter:
        year_val, quarter_val = quarter.split('-Q')
        year_val = int(year_val)
        quarter_val = int(quarter_val)
        df_period = df[
            (df['transaction_date'].dt.year == year_val) &
            (df['transaction_date'].dt.quarter == quarter_val)
        ]
    elif period == "ytd":
        current_year = year or datetime.now().year
        df_period = df[df['transaction_date'].dt.year == current_year]
    else:
        current_year = year or datetime.now().year
        df_period = df[df['transaction_date'].dt.year == current_year]
    
    category_summary = df_period.groupby('spending_category').agg({
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
    quarter: Optional[str] = None,
    user: Optional[str] = None
):
    """
    Get raw transaction data for line chart
    """
    df = await get_transactions_data()
    
    if df.empty:
        return {"data": []}
    
    df['transaction_date'] = pd.to_datetime(df['transaction_date'])
    
    # Apply user filter if specified
    if user and user != "all":
        df = df[df['person'].str.lower() == user.lower()]
    
    # Apply same period filtering as transactions endpoint
    if period == "monthly" and month:
        year_val, month_val = map(int, month.split('-'))
        df_period = df[
            (df['transaction_date'].dt.year == year_val) &
            (df['transaction_date'].dt.month == month_val)
        ]
    elif period == "quarterly" and quarter:
        year_val, quarter_val = quarter.split('-Q')
        year_val = int(year_val)
        quarter_val = int(quarter_val)
        df_period = df[
            (df['transaction_date'].dt.year == year_val) &
            (df['transaction_date'].dt.quarter == quarter_val)
        ]
    elif period == "ytd":
        current_year = year or datetime.now().year
        df_period = df[df['transaction_date'].dt.year == current_year]
    else:
        current_year = year or datetime.now().year
        df_period = df[df['transaction_date'].dt.year == current_year]
    
    # Convert to records and return raw transaction data
    transactions = df_period[['amount', 'spending_category', 'transaction_date']].to_dict('records')
    
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
    """Get available periods (months, quarters, years) from database"""
    periods = await get_available_periods()
    return periods

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)