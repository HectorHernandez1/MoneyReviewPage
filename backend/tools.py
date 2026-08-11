# Shared schema fragments for tools that filter by time period and person.
# Tools accept EITHER period (+month/year) OR start_date/end_date for custom ranges.
# When omitted, the backend injects the dashboard's current filters as defaults.
_TIME_PROPS = {
    "period": {
        "type": "string",
        "enum": ["monthly", "yearly"],
        "description": "Query a single month or a full year. Defaults to the dashboard's current view if omitted."
    },
    "month": {
        "type": "string",
        "description": "Month in YYYY-MM format (e.g. '2026-02')"
    },
    "year": {
        "type": "integer",
        "description": "Year for yearly queries (e.g. 2026)"
    },
    "start_date": {
        "type": "string",
        "description": "Start date in YYYY-MM-DD format (inclusive). Use together with end_date for custom ranges like 'last week' or 'since March 10' — overrides period/month/year."
    },
    "end_date": {
        "type": "string",
        "description": "End date in YYYY-MM-DD format (inclusive)."
    }
}

_USER_PROP = {
    "user": {
        "type": "string",
        "description": "Filter by person name, or omit for all users"
    }
}

TOOLS = [
    {
        "name": "get_spending_by_category",
        "description": "Get total spending amounts grouped by category for a given time period. Use this to answer questions like 'what are my top categories?' or 'how much did I spend on groceries?'",
        "input_schema": {
            "type": "object",
            "properties": {**_TIME_PROPS, **_USER_PROP},
            "required": []
        }
    },
    {
        "name": "get_merchant_spending",
        "description": "Get spending grouped by merchant/store name. Can search for a specific merchant. Use this for questions like 'how much did I spend at Costco?' or 'what are my top merchants?'",
        "input_schema": {
            "type": "object",
            "properties": {
                **_TIME_PROPS,
                **_USER_PROP,
                "merchant_search": {
                    "type": "string",
                    "description": "Search term to filter merchants (case-insensitive partial match)"
                },
                "limit": {
                    "type": "integer",
                    "description": "Max merchants to return (default 25, max 100)"
                }
            },
            "required": []
        }
    },
    {
        "name": "get_category_budget_status",
        "description": "Get budget limit vs actual spending for each category. Use this for questions like 'am I over budget?' or 'how much budget do I have left?'",
        "input_schema": {
            "type": "object",
            "properties": {**_TIME_PROPS, **_USER_PROP},
            "required": []
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
                **_USER_PROP
            },
            "required": ["month_a", "month_b"]
        }
    },
    {
        "name": "get_spending_trend",
        "description": "Get month-by-month spending totals over a span of months — overall, or narrowed to one category or merchant. Use this for questions like 'how has my grocery spending trended this year?', 'what's my average monthly spending?', or 'which month did I spend the most?'",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_month": {
                    "type": "string",
                    "description": "First month in YYYY-MM format (defaults to 5 months before end_month)"
                },
                "end_month": {
                    "type": "string",
                    "description": "Last month in YYYY-MM format (defaults to the current month)"
                },
                "category": {
                    "type": "string",
                    "description": "Optional category to narrow the trend to (case-insensitive partial match)"
                },
                "merchant_search": {
                    "type": "string",
                    "description": "Optional merchant search term to narrow the trend to (case-insensitive partial match)"
                },
                **_USER_PROP
            },
            "required": []
        }
    },
    {
        "name": "find_recurring_charges",
        "description": "Find likely subscriptions and recurring charges — merchants billing a similar amount in multiple different months. Use this for questions like 'what subscriptions am I paying for?' or 'what recurring charges do I have?'",
        "input_schema": {
            "type": "object",
            "properties": {
                "lookback_months": {
                    "type": "integer",
                    "description": "How many months of history to scan (default 6, max 24)"
                },
                "months_required": {
                    "type": "integer",
                    "description": "Minimum number of distinct months a similar charge must appear in to count as recurring (default 3)"
                },
                **_USER_PROP
            },
            "required": []
        }
    },
    {
        "name": "get_spending_by_person",
        "description": "Get spending breakdown by person. Use this for questions like 'who spent the most?' or 'how much did each person spend?'",
        "input_schema": {
            "type": "object",
            "properties": {
                **_TIME_PROPS,
                "category": {
                    "type": "string",
                    "description": "Optional category to filter by (case-insensitive partial match)"
                }
            },
            "required": []
        }
    },
    {
        "name": "get_spending_by_account",
        "description": "Get spending grouped by the card/account each transaction was made on. Use this for questions like 'which credit cards did I use in June?', 'how much did I put on each card?', or 'what accounts does Hector's spending come from?'. Returns account names as they appear in transaction data — it cannot see card numbers, balances, or anything beyond the transactions in this dashboard.",
        "input_schema": {
            "type": "object",
            "properties": {
                **_TIME_PROPS,
                **_USER_PROP,
                "category": {
                    "type": "string",
                    "description": "Optional category to filter by (case-insensitive partial match)"
                }
            },
            "required": []
        }
    },
    {
        "name": "lookup_users",
        "description": "Search for users/people in the database by partial name. Use this when the user mentions a name (e.g. 'I'm Hector') to find their exact full name before querying spending data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "search": {
                    "type": "string",
                    "description": "Partial name to search for (e.g. 'hector')"
                }
            },
            "required": ["search"]
        }
    },
    {
        "name": "list_categories",
        "description": "List all spending category names, their budget limits, and transaction counts. Use this to discover the exact category names before filtering by category, or when a category filter returns no results.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_budget_overview",
        "description": "Get the full budget overview the dashboard shows: per-category budget vs actual with projected end-of-period spend, overall totals, pacing (days elapsed, fraction of period), and a comparison against the previous period both in full and through the same point in time. Use this first for questions like 'how am I doing this month?', 'am I on pace?', 'review my month', or any recommendation question.",
        "input_schema": {
            "type": "object",
            "properties": {
                "period": {
                    "type": "string",
                    "enum": ["monthly", "yearly"],
                    "description": "Query a single month or a full year. Defaults to the dashboard's current view if omitted."
                },
                "month": {"type": "string", "description": "Month in YYYY-MM format (e.g. '2026-02')"},
                "year": {"type": "integer", "description": "Year for yearly queries (e.g. 2026)"},
                **_USER_PROP
            },
            "required": []
        }
    },
    {
        "name": "get_suggested_limits",
        "description": "Get suggested monthly budget limits per category, based on average and max monthly spend over recent full months (current partial month excluded). Returns avg_monthly_spend, max_monthly_spend, months_with_spending, and suggested_limit (avg rounded up to the nearest $10). Use this when recommending budget limits or spending cuts.",
        "input_schema": {
            "type": "object",
            "properties": {
                "lookback_months": {
                    "type": "integer",
                    "description": "How many full months of history to average over (default 6, max 24)"
                }
            },
            "required": []
        }
    },
    {
        "name": "set_category_limit",
        "description": "Set the monthly budget limit for a spending category. This CHANGES the budget the whole dashboard uses, so only call it when the user has named the exact category and dollar amount (e.g. 'raise Dining to $450') or has just confirmed your proposed change. Never adjust limits unprompted. Returns the previous and new limit — report both back.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "description": "Exact category name (case-insensitive). If unsure of the name, call list_categories first."
                },
                "new_limit": {
                    "type": "number",
                    "description": "New monthly limit in dollars (0 removes the effective budget)"
                }
            },
            "required": ["category", "new_limit"]
        }
    },
    {
        "name": "remember",
        "description": "Save a durable memory so future conversations can use it. Use kind='fact' for facts about the household ('rent is fixed at $2000'), kind='preference' for how the user wants you to behave ('always exclude rent from cut suggestions'), and kind='insight' for conclusions from analysis you just did ('2026-08: dining overage was driven by 3 large DoorDash orders'). Only save things worth recalling in later conversations — not transient chit-chat.",
        "input_schema": {
            "type": "object",
            "properties": {
                "kind": {
                    "type": "string",
                    "enum": ["fact", "preference", "insight"],
                    "description": "What sort of memory this is"
                },
                "content": {
                    "type": "string",
                    "description": "The memory itself, one or two self-contained sentences"
                },
                "person": {
                    "type": "string",
                    "description": "Person this memory is about, if it is person-specific (omit for household-wide)"
                },
                "period_tag": {
                    "type": "string",
                    "description": "For insights: the period analyzed, YYYY-MM or YYYY (e.g. '2026-08')"
                }
            },
            "required": ["kind", "content"]
        }
    },
    {
        "name": "forget",
        "description": "Delete a saved memory by id (ids are listed in the MEMORY section of your instructions). Use when the user asks you to forget something or when a memory is wrong or outdated.",
        "input_schema": {
            "type": "object",
            "properties": {
                "memory_id": {
                    "type": "integer",
                    "description": "The id of the memory to forget"
                }
            },
            "required": ["memory_id"]
        }
    },
    {
        "name": "get_recent_transactions",
        "description": "Get individual transactions with details (date, merchant, amount, category, person, and the card/account used). Supports sorting by date or amount and filtering by amount range. Use this for questions like 'show me my last 10 transactions', 'what was my biggest purchase this month?', or 'any transactions over $200?'",
        "input_schema": {
            "type": "object",
            "properties": {
                **_TIME_PROPS,
                **_USER_PROP,
                "category": {
                    "type": "string",
                    "description": "Filter by spending category (case-insensitive partial match)"
                },
                "merchant_search": {
                    "type": "string",
                    "description": "Optional search term to filter transactions by merchant name (case-insensitive partial match)"
                },
                "min_amount": {
                    "type": "number",
                    "description": "Only include transactions of at least this amount"
                },
                "max_amount": {
                    "type": "number",
                    "description": "Only include transactions of at most this amount"
                },
                "sort_by": {
                    "type": "string",
                    "enum": ["date", "amount"],
                    "description": "Sort by most recent date (default) or largest amount"
                },
                "limit": {
                    "type": "integer",
                    "description": "Max transactions to return (default 50, max 200)"
                }
            },
            "required": []
        }
    }
]
