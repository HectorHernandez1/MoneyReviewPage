import React from 'react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(Math.abs(amount) || 0);
};

const SummaryCards = ({ summary, overview }) => {
  const getPeriodLabel = (period) => {
    switch (period) {
      case 'monthly': return 'This Month';
      case 'yearly': return 'This Year';
      default: return period;
    }
  };

  const totals = overview?.totals;
  const pacing = overview?.pacing;
  const previous = overview?.previous;

  const daysLeft = pacing && pacing.is_partial
    ? pacing.days_in_period - pacing.days_elapsed
    : null;

  // Compare to the previous period at the same point in time when the
  // current period is still in progress, otherwise to its full total.
  const prevReference = previous
    ? (pacing && pacing.is_partial ? previous.to_same_point : previous.total)
    : null;
  const spentNow = summary.total_amount || 0;
  const prevDiffPct = prevReference
    ? ((Math.abs(spentNow) - prevReference) / prevReference) * 100
    : null;

  const projectedOver = totals && pacing && pacing.is_partial &&
    totals.projected != null && totals.total_limit > 0 && totals.projected > totals.total_limit;

  return (
    <div className="summary-cards">
      <div className="summary-card">
        <h3>Total Spent - {getPeriodLabel(summary.period)}</h3>
        <div className="amount">{formatCurrency(spentNow)}</div>
        <div className="summary-sub">{summary.transaction_count || 0} transactions</div>
      </div>

      {totals && totals.total_limit > 0 && (
        <div className={`summary-card ${totals.remaining < 0 ? 'summary-card-bad' : 'summary-card-good'}`}>
          <h3>Budget Remaining</h3>
          <div className="amount">
            {totals.remaining < 0
              ? `-${formatCurrency(totals.remaining)}`
              : formatCurrency(totals.remaining)}
          </div>
          <div className="summary-sub">
            of {formatCurrency(totals.total_limit)} budgeted
            {daysLeft !== null ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ''}
          </div>
        </div>
      )}

      {pacing && pacing.is_partial && totals && totals.projected != null && (
        <div className={`summary-card ${projectedOver ? 'summary-card-bad' : ''}`}>
          <h3>Projected Total</h3>
          <div className="amount">{formatCurrency(totals.projected)}</div>
          <div className="summary-sub">
            {totals.total_limit > 0
              ? (projectedOver
                ? `⚠ over the ${formatCurrency(totals.total_limit)} budget at this pace`
                : `on pace to stay under ${formatCurrency(totals.total_limit)}`)
              : 'at the current daily pace'}
          </div>
        </div>
      )}

      {previous && prevReference !== null && prevReference > 0 && (
        <div className={`summary-card ${prevDiffPct > 0 ? 'summary-card-bad' : 'summary-card-good'}`}>
          <h3>vs {previous.label}</h3>
          <div className="amount">
            {prevDiffPct > 0 ? '▲' : '▼'} {Math.abs(prevDiffPct).toFixed(0)}%
          </div>
          <div className="summary-sub">
            {formatCurrency(prevReference)}
            {pacing && pacing.is_partial ? ' at this point' : ' total'} in {previous.label}
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryCards;
