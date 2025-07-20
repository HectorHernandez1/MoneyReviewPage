from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import get_transactions_data
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
    year: Optional[int] = None
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
    
    if period == "monthly":
        grouped = df_filtered.groupby([
            df_filtered['transaction_date'].dt.month,
            'spending_category'
        ])['amount'].sum().reset_index()
        grouped['period'] = grouped['transaction_date'].apply(lambda x: f"{current_year}-{x:02d}")
        
    elif period == "quarterly":
        grouped = df_filtered.groupby([
            df_filtered['transaction_date'].dt.quarter,
            'spending_category'
        ])['amount'].sum().reset_index()
        grouped['period'] = grouped['transaction_date'].apply(lambda x: f"{current_year}-Q{x}")
        
    elif period == "ytd":
        grouped = df_filtered.groupby('spending_category')['amount'].sum().reset_index()
        grouped['period'] = f"{current_year}-YTD"
    
    return {
        "data": grouped.to_dict('records'),
        "summary": {
            "total_amount": float(df_filtered['amount'].sum()),
            "transaction_count": len(df_filtered),
            "period": period,
            "year": current_year
        }
    }

@app.get("/categories")
async def get_categories():
    """Get spending categories summary"""
    df = await get_transactions_data()
    
    if df.empty:
        return {"categories": []}
    
    category_summary = df.groupby('spending_category').agg({
        'amount': ['sum', 'count', 'mean']
    }).round(2)
    
    category_summary.columns = ['total_amount', 'transaction_count', 'avg_amount']
    category_summary = category_summary.reset_index()
    
    return {"categories": category_summary.to_dict('records')}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)