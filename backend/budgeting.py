"""
Budget overview computation: budget vs actual per category, pacing
(projected end-of-period spend), and a comparison against the previous
period at the same point in time.

Shared by the /budget-overview endpoint and the chatbot's
get_budget_overview tool so both report identical numbers.
"""

import calendar
from datetime import date

from queries import handle_get_category_budget_status, handle_get_spending_by_category


def _is_error(result):
    return isinstance(result, dict) and "error" in result


def compute_budget_overview(args):
    """Compute the budget overview for {period, year, month, user} args.

    Returns the overview dict, or {"error": str} if a query failed.
    """
    period = args.get("period", "monthly")
    year = args.get("year")
    month = args.get("month")
    user = args.get("user")

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

    categories = handle_get_category_budget_status(current_args)
    if _is_error(categories):
        return categories

    fraction = days_elapsed / days_in_period if days_in_period else 0
    is_partial = 0 < fraction < 1

    total_spent = sum(c["spent"] for c in categories)
    total_limit = sum(c["budget_limit"] for c in categories if c["budget_limit"])
    spent_in_limited = sum(c["spent"] for c in categories if c["budget_limit"])

    for c in categories:
        c["projected"] = round(c["spent"] / fraction, 2) if is_partial else (c["spent"] if fraction >= 1 else None)

    # Previous period totals: full period, and through the same day-of-period
    prev_full = handle_get_spending_by_category(prev_full_args)
    if _is_error(prev_full):
        return prev_full
    prev_total = round(sum(float(r["total"]) for r in prev_full), 2)
    if is_partial and days_elapsed > 0:
        prev_partial_rows = handle_get_spending_by_category(prev_partial_args)
        if _is_error(prev_partial_rows):
            return prev_partial_rows
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
