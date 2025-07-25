from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import get_transactions_data, get_users_data
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
    user: Optional[str] = None
):
    """
    Get transaction data aggregated by period
    period: 'monthly', 'quarterly', 'ytd'
    """
    df = await get_transactions_data()
    
    if df.empty:
        return {"data": [], "summary": {}}
    
    df['transaction_date'] = pd.to_datetime(df['transaction_date'])
    
    current_year = year or datetime.now().year
    df_filtered = df[df['transaction_date'].dt.year == current_year]
    
    # Apply user filter if specified
    if user and user != "all":
        df_filtered = df_filtered[df_filtered['person'].str.lower() == user.lower()]
    
    if period == "monthly":
        # Include current month and previous month
        current_month = pd.Period.now('M')
        previous_month = current_month - 1
        
        # Filter for both current and previous month
        df_period = df_filtered[
            (df_filtered['transaction_date'].dt.to_period('M') == current_month) |
            (df_filtered['transaction_date'].dt.to_period('M') == previous_month)
        ]
        
        # Create period info showing both months
        current_period_info = f"{previous_month}/{current_month}"
        
        grouped = df_period.groupby('spending_category')['amount'].sum().reset_index()
        grouped['period'] = current_period_info
        
    elif period == "quarterly":
        # Get the latest quarter with data
        latest_quarter = df_filtered['transaction_date'].dt.to_period('Q').max()
        df_period = df_filtered[df_filtered['transaction_date'].dt.to_period('Q') == latest_quarter]
        
        grouped = df_period.groupby('spending_category')['amount'].sum().reset_index()
        grouped['period'] = str(latest_quarter)
        current_period_info = str(latest_quarter)
        
    elif period == "ytd":
        df_period = df_filtered
        grouped = df_period.groupby('spending_category')['amount'].sum().reset_index()
        grouped['period'] = f"{current_year}-YTD"
        current_period_info = f"{current_year}-YTD"
    
    return {
        "data": grouped.to_dict('records'),
        "summary": {
            "total_amount": float(df_period['amount'].sum()),
            "transaction_count": len(df_period),
            "period": period,
            "year": current_year,
            "current_period": current_period_info
        }
    }

@app.get("/categories")
async def get_categories(
    period: Optional[str] = "monthly",
    year: Optional[int] = None,
    user: Optional[str] = None
):
    """Get spending categories summary for the specified period"""
    df = await get_transactions_data()
    
    if df.empty:
        return {"categories": []}
    
    df['transaction_date'] = pd.to_datetime(df['transaction_date'])
    
    current_year = year or datetime.now().year
    df_filtered = df[df['transaction_date'].dt.year == current_year]
    
    # Apply user filter if specified
    if user and user != "all":
        df_filtered = df_filtered[df_filtered['person'].str.lower() == user.lower()]
    
    # Apply same period filtering as transactions endpoint
    if period == "monthly":
        latest_month = df_filtered['transaction_date'].dt.to_period('M').max()
        df_period = df_filtered[df_filtered['transaction_date'].dt.to_period('M') == latest_month]
    elif period == "quarterly":
        latest_quarter = df_filtered['transaction_date'].dt.to_period('Q').max()
        df_period = df_filtered[df_filtered['transaction_date'].dt.to_period('Q') == latest_quarter]
    elif period == "ytd":
        df_period = df_filtered
    
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
    user: Optional[str] = None
):
    """
    Get raw transaction data for line chart
    """
    df = await get_transactions_data()
    
    if df.empty:
        return {"data": []}
    
    df['transaction_date'] = pd.to_datetime(df['transaction_date'])
    
    current_year = year or datetime.now().year
    df_filtered = df[df['transaction_date'].dt.year == current_year]
    
    # Apply user filter if specified
    if user and user != "all":
        df_filtered = df_filtered[df_filtered['person'].str.lower() == user.lower()]
    
    # Filter by period
    if period == "monthly":
        # Include current month and previous month
        current_month = pd.Period.now('M')
        previous_month = current_month - 1
        
        df_period = df_filtered[
            (df_filtered['transaction_date'].dt.to_period('M') == current_month) |
            (df_filtered['transaction_date'].dt.to_period('M') == previous_month)
        ]
        
    elif period == "quarterly":
        # Get the current quarter
        current_quarter = pd.Period.now('Q')
        df_period = df_filtered[df_filtered['transaction_date'].dt.to_period('Q') == current_quarter]
        
    elif period == "ytd":
        df_period = df_filtered
    
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)