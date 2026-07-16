import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "dbname": os.environ.get("DB_NAME"),
    "user": os.environ.get("DB_USER"),
    "password": os.environ.get("DB_PASSWORD"),
    "host": os.environ.get("DB_HOST"),
    "port": os.environ.get("DB_PORT"),
    "options": "-c search_path=budget_app"
}

EXCLUDED_CATEGORIES = "('Installment','Payments','Refunds & Returns')"


def _clamp_limit(value, default, maximum):
    """Coerce a limit argument to an int within [1, maximum], falling back to default."""
    try:
        limit = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(limit, maximum))


def _build_period_filter(params, period, month=None, year=None, user=None, start_date=None, end_date=None):
    """Build SQL WHERE conditions for time period and user filtering.

    An explicit start_date/end_date range takes precedence over period/month/year.
    """
    conditions = [f"spending_category NOT IN {EXCLUDED_CATEGORIES}"]

    if start_date or end_date:
        if start_date:
            conditions.append("transaction_date >= %s::date")
            params.append(start_date)
        if end_date:
            conditions.append("transaction_date <= %s::date")
            params.append(end_date)
    elif period == "monthly" and month:
        conditions.append("transaction_date >= %s::date AND transaction_date < (%s::date + INTERVAL '1 month')")
        params.extend([f"{month}-01", f"{month}-01"])
    elif period == "yearly" and year:
        conditions.append("EXTRACT(YEAR FROM transaction_date) = %s")
        params.append(year)
    else:
        from datetime import datetime
        now = datetime.now()
        conditions.append("EXTRACT(YEAR FROM transaction_date) = %s AND EXTRACT(MONTH FROM transaction_date) = %s")
        params.extend([now.year, now.month])

    if user and user.lower() != "all":
        conditions.append("LOWER(person) LIKE %s")
        params.append(f"%{user.lower()}%")

    return " AND ".join(conditions)


def _run_query(query, params):
    """Execute a SQL query and return results as list of dicts."""
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
        return [dict(row) for row in rows]
    except Exception as e:
        return {"error": str(e)}
    finally:
        if conn:
            conn.close()


def handle_get_spending_by_category(args):
    params = []
    where = _build_period_filter(params, args.get("period", "monthly"), args.get("month"), args.get("year"), args.get("user"),
                                 args.get("start_date"), args.get("end_date"))
    query = f"""
        SELECT spending_category AS category,
               ROUND(SUM(amount)::numeric, 2) AS total,
               COUNT(*) AS transaction_count
        FROM budget_app.transactions_view
        WHERE {where}
        GROUP BY spending_category
        ORDER BY total DESC
    """
    return _run_query(query, params)


def handle_get_merchant_spending(args):
    params = []
    where = _build_period_filter(params, args.get("period", "monthly"), args.get("month"), args.get("year"), args.get("user"),
                                 args.get("start_date"), args.get("end_date"))

    search = args.get("merchant_search")
    if search:
        where += " AND LOWER(merchant_name) LIKE %s"
        params.append(f"%{search.lower()}%")

    query = f"""
        SELECT merchant_name AS merchant,
               ROUND(SUM(amount)::numeric, 2) AS total,
               COUNT(*) AS transaction_count
        FROM budget_app.transactions_view
        WHERE {where}
        GROUP BY merchant_name
        ORDER BY total DESC
        LIMIT %s
    """
    params.append(_clamp_limit(args.get("limit"), 25, 100))
    return _run_query(query, params)


def handle_get_category_budget_status(args):
    params = []
    where = _build_period_filter(params, args.get("period", "monthly"), args.get("month"), args.get("year"), args.get("user"),
                                 args.get("start_date"), args.get("end_date"))
    query = f"""
        SELECT t.spending_category AS category,
               ROUND(SUM(t.amount)::numeric, 2) AS spent,
               sc.spending_limit AS budget_limit
        FROM budget_app.transactions_view t
        LEFT JOIN budget_app.spending_categories sc
            ON LOWER(sc.category_name) = LOWER(t.spending_category)
        WHERE {where}
        GROUP BY t.spending_category, sc.spending_limit
        ORDER BY spent DESC
    """
    results = _run_query(query, params)
    if isinstance(results, dict) and "error" in results:
        return results

    for row in results:
        limit = row.get("budget_limit")
        spent = row.get("spent", 0)
        if limit and float(limit) > 0:
            row["remaining"] = round(float(limit) - float(spent), 2)
            row["percent_used"] = round(float(spent) / float(limit) * 100, 1)
            row["status"] = "over" if float(spent) > float(limit) else "under"
        else:
            row["remaining"] = None
            row["percent_used"] = None
            row["status"] = "no_limit"
        # Convert Decimal to float for JSON serialization
        row["budget_limit"] = float(limit) if limit else None
        row["spent"] = float(spent)

    return results


def handle_get_spending_comparison(args):
    def _get_month_totals(month, user=None):
        params = []
        where = _build_period_filter(params, "monthly", month=month, user=user)
        query = f"""
            SELECT spending_category AS category,
                   ROUND(SUM(amount)::numeric, 2) AS total
            FROM budget_app.transactions_view
            WHERE {where}
            GROUP BY spending_category
            ORDER BY total DESC
        """
        return _run_query(query, params)

    month_a = args["month_a"]
    month_b = args["month_b"]
    user = args.get("user")

    data_a = _get_month_totals(month_a, user)
    data_b = _get_month_totals(month_b, user)

    if isinstance(data_a, dict) and "error" in data_a:
        return data_a
    if isinstance(data_b, dict) and "error" in data_b:
        return data_b

    total_a = sum(float(r["total"]) for r in data_a)
    total_b = sum(float(r["total"]) for r in data_b)

    return {
        "month_a": {"month": month_a, "total": round(total_a, 2), "categories": data_a},
        "month_b": {"month": month_b, "total": round(total_b, 2), "categories": data_b},
        "difference": round(total_a - total_b, 2),
        "percent_change": round((total_a - total_b) / total_b * 100, 1) if total_b else None
    }


def handle_get_spending_by_person(args):
    params = []
    where = _build_period_filter(params, args.get("period", "monthly"), args.get("month"), args.get("year"),
                                 start_date=args.get("start_date"), end_date=args.get("end_date"))

    category = args.get("category")
    if category:
        where += " AND LOWER(spending_category) LIKE %s"
        params.append(f"%{category.lower()}%")

    query = f"""
        SELECT person,
               ROUND(SUM(amount)::numeric, 2) AS total,
               COUNT(*) AS transaction_count
        FROM budget_app.transactions_view
        WHERE {where}
        GROUP BY person
        ORDER BY total DESC
    """
    return _run_query(query, params)


def handle_get_recent_transactions(args):
    params = []
    where = _build_period_filter(params, args.get("period", "monthly"), args.get("month"), args.get("year"), args.get("user"),
                                 args.get("start_date"), args.get("end_date"))

    category = args.get("category")
    if category:
        where += " AND LOWER(spending_category) LIKE %s"
        params.append(f"%{category.lower()}%")

    search = args.get("merchant_search")
    if search:
        where += " AND LOWER(merchant_name) LIKE %s"
        params.append(f"%{search.lower()}%")

    if args.get("min_amount") is not None:
        where += " AND amount >= %s"
        params.append(args["min_amount"])

    if args.get("max_amount") is not None:
        where += " AND amount <= %s"
        params.append(args["max_amount"])

    order_by = "amount DESC" if args.get("sort_by") == "amount" else "transaction_date DESC"

    query = f"""
        SELECT transaction_date, merchant_name, amount, spending_category, person, account_type
        FROM budget_app.transactions_view
        WHERE {where}
        ORDER BY {order_by}
        LIMIT %s
    """
    params.append(_clamp_limit(args.get("limit"), 50, 200))
    results = _run_query(query, params)
    if isinstance(results, dict) and "error" in results:
        return results

    for row in results:
        if row.get("transaction_date"):
            row["transaction_date"] = str(row["transaction_date"])
        row["amount"] = float(row["amount"])

    return results


def handle_lookup_users(args):
    search = args.get("search", "")
    params = [f"%{search.lower()}%"]
    query = """
        SELECT DISTINCT person
        FROM budget_app.transactions_view
        WHERE LOWER(person) LIKE %s
        ORDER BY person
    """
    return _run_query(query, params)


def handle_get_spending_trend(args):
    from datetime import date

    end_month = args.get("end_month") or date.today().strftime("%Y-%m")
    start_month = args.get("start_month")
    if not start_month:
        # Default to a 6-month window ending at end_month
        y, m = int(end_month[:4]), int(end_month[5:7])
        m -= 5
        if m <= 0:
            m += 12
            y -= 1
        start_month = f"{y:04d}-{m:02d}"

    params = [f"{start_month}-01", f"{end_month}-01"]
    conditions = [
        f"spending_category NOT IN {EXCLUDED_CATEGORIES}",
        "transaction_date >= %s::date",
        "transaction_date < (%s::date + INTERVAL '1 month')",
    ]

    user = args.get("user")
    if user and user.lower() != "all":
        conditions.append("LOWER(person) LIKE %s")
        params.append(f"%{user.lower()}%")

    category = args.get("category")
    if category:
        conditions.append("LOWER(spending_category) LIKE %s")
        params.append(f"%{category.lower()}%")

    search = args.get("merchant_search")
    if search:
        conditions.append("LOWER(merchant_name) LIKE %s")
        params.append(f"%{search.lower()}%")

    query = f"""
        SELECT to_char(date_trunc('month', transaction_date), 'YYYY-MM') AS month,
               ROUND(SUM(amount)::numeric, 2) AS total,
               COUNT(*) AS transaction_count
        FROM budget_app.transactions_view
        WHERE {" AND ".join(conditions)}
        GROUP BY 1
        ORDER BY 1
    """
    return _run_query(query, params)


def handle_find_recurring_charges(args):
    lookback = _clamp_limit(args.get("lookback_months"), 6, 24)
    months_required = _clamp_limit(args.get("months_required"), 3, 12)

    params = [lookback]
    conditions = [
        f"spending_category NOT IN {EXCLUDED_CATEGORIES}",
        "transaction_date >= (CURRENT_DATE - INTERVAL '1 month' * %s)",
    ]

    user = args.get("user")
    if user and user.lower() != "all":
        conditions.append("LOWER(person) LIKE %s")
        params.append(f"%{user.lower()}%")

    # Group by merchant + dollar-rounded amount: a merchant charging a similar
    # amount in several distinct months looks like a subscription, while
    # variable-amount merchants (e.g. groceries) fall out of the grouping.
    query = f"""
        SELECT merchant_name AS merchant,
               ROUND(AVG(amount)::numeric, 2) AS typical_amount,
               COUNT(*) AS times_charged,
               COUNT(DISTINCT date_trunc('month', transaction_date)) AS distinct_months,
               MAX(transaction_date) AS last_charged,
               MODE() WITHIN GROUP (ORDER BY spending_category) AS category
        FROM budget_app.transactions_view
        WHERE {" AND ".join(conditions)}
        GROUP BY merchant_name, ROUND(amount::numeric, 0)
        HAVING COUNT(DISTINCT date_trunc('month', transaction_date)) >= %s
        ORDER BY typical_amount DESC
    """
    params.append(months_required)
    return _run_query(query, params)


def handle_list_categories(args):
    query = f"""
        SELECT t.spending_category AS category,
               sc.spending_limit,
               COUNT(*) AS transaction_count
        FROM budget_app.transactions_view t
        LEFT JOIN budget_app.spending_categories sc
            ON LOWER(sc.category_name) = LOWER(t.spending_category)
        WHERE t.spending_category NOT IN {EXCLUDED_CATEGORIES}
        GROUP BY t.spending_category, sc.spending_limit
        ORDER BY t.spending_category
    """
    return _run_query(query, [])


TOOL_HANDLERS = {
    "get_spending_by_category": handle_get_spending_by_category,
    "get_merchant_spending": handle_get_merchant_spending,
    "get_category_budget_status": handle_get_category_budget_status,
    "get_spending_comparison": handle_get_spending_comparison,
    "get_spending_trend": handle_get_spending_trend,
    "find_recurring_charges": handle_find_recurring_charges,
    "get_spending_by_person": handle_get_spending_by_person,
    "get_recent_transactions": handle_get_recent_transactions,
    "lookup_users": handle_lookup_users,
    "list_categories": handle_list_categories,
}
