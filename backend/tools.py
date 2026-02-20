TOOLS = [
    {
        "name": "get_spending_by_category",
        "description": "Get total spending amounts grouped by category for a given time period. Use this to answer questions like 'what are my top categories?' or 'how much did I spend on groceries?'",
        "input_schema": {
            "type": "object",
            "properties": {
                "month": {
                    "type": "string",
                    "description": "Month in YYYY-MM format (e.g. '2026-02')"
                },
                "year": {
                    "type": "integer",
                    "description": "Year for yearly queries (e.g. 2026)"
                },
                "period": {
                    "type": "string",
                    "enum": ["monthly", "yearly"],
                    "description": "Whether to query a single month or full year"
                },
                "user": {
                    "type": "string",
                    "description": "Filter by person name, or omit for all users"
                }
            },
            "required": ["period"]
        }
    },
    {
        "name": "get_merchant_spending",
        "description": "Get spending grouped by merchant/store name. Can search for a specific merchant. Use this for questions like 'how much did I spend at Costco?' or 'what are my top merchants?'",
        "input_schema": {
            "type": "object",
            "properties": {
                "month": {"type": "string", "description": "Month in YYYY-MM format"},
                "year": {"type": "integer", "description": "Year for yearly queries"},
                "period": {"type": "string", "enum": ["monthly", "yearly"]},
                "user": {"type": "string", "description": "Filter by person name"},
                "merchant_search": {
                    "type": "string",
                    "description": "Search term to filter merchants (case-insensitive partial match)"
                }
            },
            "required": ["period"]
        }
    },
    {
        "name": "get_category_budget_status",
        "description": "Get budget limit vs actual spending for each category. Use this for questions like 'am I over budget?' or 'how much budget do I have left?'",
        "input_schema": {
            "type": "object",
            "properties": {
                "month": {"type": "string", "description": "Month in YYYY-MM format"},
                "year": {"type": "integer", "description": "Year for yearly queries"},
                "period": {"type": "string", "enum": ["monthly", "yearly"]},
                "user": {"type": "string", "description": "Filter by person name"}
            },
            "required": ["period"]
        }
    },
    {
        "name": "get_spending_comparison",
        "description": "Compare spending between two time periods. Use this for questions like 'how does this month compare to last month?' or 'am I spending more than January?'",
        "input_schema": {
            "type": "object",
            "properties": {
                "month_a": {"type": "string", "description": "First month in YYYY-MM format"},
                "month_b": {"type": "string", "description": "Second month in YYYY-MM format"},
                "user": {"type": "string", "description": "Filter by person name"}
            },
            "required": ["month_a", "month_b"]
        }
    },
    {
        "name": "get_spending_by_person",
        "description": "Get spending breakdown by person. Use this for questions like 'who spent the most?' or 'how much did each person spend?'",
        "input_schema": {
            "type": "object",
            "properties": {
                "month": {"type": "string", "description": "Month in YYYY-MM format"},
                "year": {"type": "integer", "description": "Year for yearly queries"},
                "period": {"type": "string", "enum": ["monthly", "yearly"]},
                "category": {"type": "string", "description": "Optional category to filter by"}
            },
            "required": ["period"]
        }
    },
    {
        "name": "get_recent_transactions",
        "description": "Get individual recent transactions with details. Use this for questions like 'show me my last 10 transactions' or 'what did I buy recently?'",
        "input_schema": {
            "type": "object",
            "properties": {
                "month": {"type": "string", "description": "Month in YYYY-MM format"},
                "year": {"type": "integer", "description": "Year for yearly queries"},
                "period": {"type": "string", "enum": ["monthly", "yearly"]},
                "user": {"type": "string", "description": "Filter by person name"},
                "category": {"type": "string", "description": "Filter by spending category"},
                "limit": {
                    "type": "integer",
                    "description": "Number of transactions to return (default 15, max 50)"
                }
            },
            "required": ["period"]
        }
    }
]
