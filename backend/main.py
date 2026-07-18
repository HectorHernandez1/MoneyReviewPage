from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from database import (
    get_transactions_data,
    get_users_data,
    get_available_periods,
    get_category_limit,
    get_all_categories,
    update_transaction_category,
    get_all_categories_with_limits,
    update_category_limit,
    add_new_category
)
from chatbot import process_chat_message
from queries import (
    handle_get_category_budget_status,
    handle_get_spending_by_category,
    handle_find_recurring_charges,
    get_category_monthly_averages,
)
import calendar
import os
import subprocess
import pandas as pd
from datetime import datetime, date
from typing import Optional, List, Any


def _get_git_version():
    """Short git hash of the checked-out code, resolved once at startup."""
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
    except Exception:
        return "unknown"


APP_VERSION = _get_git_version()
STARTED_AT = datetime.now().strftime("%Y-%m-%d %H:%M")

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

@app.get("/version")
async def get_version():
    """Deployed backend version, for checking whether an update is live"""
    return {"version": APP_VERSION, "started_at": STARTED_AT}

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
    transactions = df[[
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
@app.get("/categories-list")
async def get_categories_list():
    """
    Get list of all available spending categories
    """
    categories = await get_all_categories()
    return {"categories": categories}

class CategoryUpdateRequest(BaseModel):
    transaction_date: str
    merchant_name: str
    amount: float
    person: str
    new_category: str

@app.put("/transaction/category")
async def update_category(request: CategoryUpdateRequest):
    """
    Update the category for a specific transaction
    """
    success = await update_transaction_category(
        transaction_date=request.transaction_date,
        merchant_name=request.merchant_name,
        amount=request.amount,
        person=request.person,
        new_category=request.new_category
    )
    
    if success:
        return {"success": True, "message": "Category updated successfully"}
    else:
        raise HTTPException(status_code=404, detail="Transaction not found or update failed")

@app.get("/categories-with-limits")
async def get_categories_with_limits():
    """
    Get all categories with their spending limits
    """
    categories = await get_all_categories_with_limits()
    return {"categories": categories}

class CategoryLimitUpdateRequest(BaseModel):
    category_name: str
    new_limit: float

@app.put("/category/limit")
async def update_limit(request: CategoryLimitUpdateRequest):
    """
    Update the spending limit for a category
    """
    if request.new_limit < 0:
        raise HTTPException(status_code=400, detail="Spending limit cannot be negative")
    
    success = await update_category_limit(
        category_name=request.category_name,
        new_limit=request.new_limit
    )
    
    if success:
        return {"success": True, "message": "Category limit updated successfully"}
    else:
        raise HTTPException(status_code=404, detail="Category not found or update failed")

class NewCategoryRequest(BaseModel):
    category_name: str
    spending_limit: float = 0.0

@app.post("/category")
async def create_category(request: NewCategoryRequest):
    """
    Create a new spending category
    """
    if not request.category_name or not request.category_name.strip():
        raise HTTPException(status_code=400, detail="Category name cannot be empty")
    
    if request.spending_limit < 0:
        raise HTTPException(status_code=400, detail="Spending limit cannot be negative")
    
    success = await add_new_category(
        category_name=request.category_name.strip(),
        spending_limit=request.spending_limit
    )
    
    if success:
        return {"success": True, "message": "Category created successfully"}
    else:
        raise HTTPException(status_code=400, detail="Category already exists or creation failed")


def _raise_on_query_error(result):
    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@app.get("/budget-overview")
async def get_budget_overview(
    period: Optional[str] = "monthly",
    year: Optional[int] = None,
    month: Optional[str] = None,
    user: Optional[str] = None
):
    """
    Budget vs actual per category, plus pacing (projected end-of-period spend)
    and a comparison against the previous period at the same point in time.
    """
    today = date.today()

    if period == "yearly":
        eff_year = int(year) if year else today.year
        days_in_period = 366 if calendar.isleap(eff_year) else 365
        if eff_year < today.year:
            days_elapsed = days_in_period
        elif eff_year > today.year:
            days_elapsed = 0
        else:
            days_elapsed = (today - date(eff_year, 1, 1)).days + 1
        current_args = {"period": "yearly", "year": eff_year, "user": user}
        prev_label = str(eff_year - 1)
        prev_full_args = {"period": "yearly", "year": eff_year - 1, "user": user}
        # Same point last year: Jan 1 through today's month/day (clamped for leap years)
        prev_end_day = min(today.day, calendar.monthrange(eff_year - 1, today.month)[1])
        prev_partial_args = {
            "start_date": f"{eff_year - 1}-01-01",
            "end_date": f"{eff_year - 1}-{today.month:02d}-{prev_end_day:02d}",
            "user": user,
        }
    else:
        eff_month = month if month else today.strftime("%Y-%m")
        y, m = int(eff_month[:4]), int(eff_month[5:7])
        days_in_period = calendar.monthrange(y, m)[1]
        if (y, m) < (today.year, today.month):
            days_elapsed = days_in_period
        elif (y, m) > (today.year, today.month):
            days_elapsed = 0
        else:
            days_elapsed = today.day
        current_args = {"period": "monthly", "month": eff_month, "user": user}
        pm_y, pm_m = (y - 1, 12) if m == 1 else (y, m - 1)
        prev_label = date(pm_y, pm_m, 1).strftime("%B %Y")
        prev_month = f"{pm_y:04d}-{pm_m:02d}"
        prev_full_args = {"period": "monthly", "month": prev_month, "user": user}
        prev_end_day = min(days_elapsed, calendar.monthrange(pm_y, pm_m)[1])
        prev_partial_args = {
            "start_date": f"{prev_month}-01",
            "end_date": f"{prev_month}-{max(prev_end_day, 1):02d}",
            "user": user,
        }

    categories = _raise_on_query_error(handle_get_category_budget_status(current_args))

    fraction = days_elapsed / days_in_period if days_in_period else 0
    is_partial = 0 < fraction < 1

    total_spent = sum(c["spent"] for c in categories)
    total_limit = sum(c["budget_limit"] for c in categories if c["budget_limit"])
    spent_in_limited = sum(c["spent"] for c in categories if c["budget_limit"])

    for c in categories:
        c["projected"] = round(c["spent"] / fraction, 2) if is_partial else (c["spent"] if fraction >= 1 else None)

    # Previous period totals: full period, and through the same day-of-period
    prev_full = _raise_on_query_error(handle_get_spending_by_category(prev_full_args))
    prev_total = round(sum(float(r["total"]) for r in prev_full), 2)
    if is_partial and days_elapsed > 0:
        prev_partial_rows = _raise_on_query_error(handle_get_spending_by_category(prev_partial_args))
        prev_to_same_point = round(sum(float(r["total"]) for r in prev_partial_rows), 2)
    else:
        prev_to_same_point = prev_total if fraction >= 1 else 0.0

    return {
        "categories": categories,
        "totals": {
            "spent": round(total_spent, 2),
            "total_limit": round(total_limit, 2),
            "spent_in_limited": round(spent_in_limited, 2),
            "remaining": round(total_limit - spent_in_limited, 2),
            "projected": round(total_spent / fraction, 2) if is_partial else (round(total_spent, 2) if fraction >= 1 else None),
        },
        "pacing": {
            "days_elapsed": days_elapsed,
            "days_in_period": days_in_period,
            "fraction_elapsed": round(fraction, 4),
            "is_partial": is_partial,
        },
        "previous": {
            "label": prev_label,
            "total": prev_total,
            "to_same_point": prev_to_same_point,
        },
    }


@app.get("/recurring-charges")
async def get_recurring_charges(
    user: Optional[str] = None,
    lookback_months: Optional[int] = 6,
    months_required: Optional[int] = 3
):
    """Likely subscriptions: merchants charging a similar amount in multiple months"""
    rows = _raise_on_query_error(handle_find_recurring_charges({
        "user": user,
        "lookback_months": lookback_months,
        "months_required": months_required,
    }))
    monthly_total = round(sum(float(r["typical_amount"]) for r in rows), 2)
    return {"recurring": rows, "estimated_monthly_total": monthly_total}


@app.get("/category-suggested-limits")
async def get_category_suggested_limits(lookback_months: Optional[int] = 6):
    """Average and max monthly spend per category over recent full months"""
    rows = _raise_on_query_error(get_category_monthly_averages(lookback_months))
    return {"suggestions": rows, "lookback_months": lookback_months}


class ChatRequest(BaseModel):
    message: str
    conversation_history: List[Any] = []
    filters: dict = {}

@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat with the AI budget assistant"""
    from models import configuration_error
    config_error = configuration_error()
    if config_error:
        raise HTTPException(status_code=503, detail=f"Chatbot not configured: {config_error}")

    result = await process_chat_message(
        message=request.message,
        conversation_history=request.conversation_history,
        filters=request.filters
    )
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
