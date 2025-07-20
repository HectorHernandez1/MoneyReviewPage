#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database import test_connection, get_transactions_data
import asyncio

async def main():
    print("Testing database connection...")
    if test_connection():
        print("✅ Database connection successful")
    else:
        print("❌ Database connection failed")
        return
    
    print("\nFetching transaction data...")
    df = await get_transactions_data()
    
    if df.empty:
        print("❌ No data found in budget_app.transactions_view")
        print("Check if the view exists and contains data:")
        print("  SELECT COUNT(*) FROM budget_app.transactions_view;")
    else:
        print(f"✅ Found {len(df)} transactions")
        print(f"Date range: {df['transaction_date'].min()} to {df['transaction_date'].max()}")
        print(f"Categories: {df['spending_category'].unique()}")
        print(f"Total amount: ${df['amount'].sum():,.2f}")

if __name__ == "__main__":
    asyncio.run(main())