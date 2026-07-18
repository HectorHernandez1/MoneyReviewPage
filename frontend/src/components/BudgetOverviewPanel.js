import React, { useState } from 'react';

const formatCurrency = (amount, decimals = 0) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Math.abs(amount) || 0);
};

const COMPACT_ROWS = 5;

const BudgetOverviewPanel = ({ overview, onCategoryClick, onAskAI, compact = false }) => {
  const [expanded, setExpanded] = useState(false);

  if (!overview || !overview.categories) return null;

  const { categories, totals, pacing } = overview;

  const limited = categories
    .filter(c => c.budget_limit)
    .sort((a, b) => (b.percent_used || 0) - (a.percent_used || 0));
  const unlimited = categories
    .filter(c => !c.budget_limit)
    .sort((a, b) => b.spent - a.spent);

  if (limited.length === 0 && unlimited.length === 0) return null;

  // Compact mode (Overview tab): most-at-risk categories first, rest behind a toggle
  const trimmed = compact && !expanded;
  const visibleLimited = trimmed ? limited.slice(0, COMPACT_ROWS) : limited;
  const hiddenCount = limited.length - visibleLimited.length;
  const showUnlimited = !trimmed && unlimited.length > 0;

  const barClass = (pct) => {
    if (pct > 100) return 'over';
    if (pct >= 70) return 'warn';
    return 'good';
  };

  const paceMarkerLeft = pacing.is_partial ? Math.min(pacing.fraction_elapsed * 100, 100) : null;

  return (
    <div className="chart-section budget-overview">
      <div className="budget-overview-header">
        <h2>Budget vs Actual</h2>
        {pacing.is_partial && (
          <span className="budget-overview-subtitle">
            Day {pacing.days_elapsed} of {pacing.days_in_period} — the tick on each bar marks where spending should be today
          </span>
        )}
      </div>

      {visibleLimited.map((c) => {
        const pct = c.percent_used || 0;
        const overBudget = c.status === 'over';
        const projectedOver = pacing.is_partial && c.projected != null && c.budget_limit && c.projected > c.budget_limit && !overBudget;
        return (
          <div
            key={c.category}
            className="budget-row"
            onClick={() => onCategoryClick && onCategoryClick(c.category)}
            title={`View ${c.category} transactions`}
          >
            <div className="budget-row-top">
              <span className="budget-row-name">{c.category}</span>
              <span className="budget-row-amounts">
                {formatCurrency(c.spent)} of {formatCurrency(c.budget_limit)}
              </span>
            </div>
            <div className="budget-bar">
              <div
                className={`budget-bar-fill ${barClass(pct)}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
              {paceMarkerLeft !== null && (
                <div className="budget-bar-pace" style={{ left: `${paceMarkerLeft}%` }} />
              )}
            </div>
            <div className="budget-row-bottom">
              <span className={overBudget ? 'budget-status-over' : 'budget-status-under'}>
                {overBudget
                  ? `${formatCurrency(-c.remaining)} over budget`
                  : `${formatCurrency(c.remaining)} left`}
                {' '}({pct.toFixed(0)}%)
              </span>
              <span className="budget-row-actions">
                {projectedOver && (
                  <span className="budget-status-projected">
                    ⚠ on pace for {formatCurrency(c.projected)}
                  </span>
                )}
                {onAskAI && (overBudget || projectedOver) && (
                  <button
                    className="ask-ai-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAskAI(overBudget
                        ? `Why is ${c.category} over budget this month?`
                        : `${c.category} is on pace to go over budget this month — why?`);
                    }}
                    title="Ask the AI assistant to investigate this category"
                  >
                    ask why →
                  </button>
                )}
              </span>
            </div>
          </div>
        );
      })}

      {trimmed && (hiddenCount > 0 || unlimited.length > 0) && (
        <button className="budget-show-all" onClick={() => setExpanded(true)}>
          {hiddenCount > 0
            ? `Show all ${limited.length} budgeted categories${unlimited.length > 0 ? ` + ${unlimited.length} without limits` : ''} ▾`
            : `Show ${unlimited.length} categor${unlimited.length === 1 ? 'y' : 'ies'} without limits ▾`}
        </button>
      )}
      {compact && expanded && (
        <button className="budget-show-all" onClick={() => setExpanded(false)}>
          Show less ▴
        </button>
      )}

      {limited.length > 0 && (
        <div className="budget-overview-totals">
          <span>
            Budgeted categories: {formatCurrency(totals.spent_in_limited)} of {formatCurrency(totals.total_limit)}
          </span>
          <span className={totals.remaining < 0 ? 'budget-status-over' : 'budget-status-under'}>
            {totals.remaining < 0
              ? `${formatCurrency(-totals.remaining)} over`
              : `${formatCurrency(totals.remaining)} left`}
          </span>
        </div>
      )}

      {showUnlimited && (
        <div className="budget-no-limit-section">
          <h3>No limit set</h3>
          {unlimited.map((c) => (
            <div
              key={c.category}
              className="budget-no-limit-row"
              onClick={() => onCategoryClick && onCategoryClick(c.category)}
            >
              <span>{c.category}</span>
              <span>{formatCurrency(c.spent)}</span>
            </div>
          ))}
          <div className="budget-no-limit-hint">
            Set limits for these in ⚙️ Manage Categories to track them here.
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetOverviewPanel;
