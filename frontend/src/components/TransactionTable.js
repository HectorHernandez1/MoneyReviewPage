import React, { useState, useMemo } from 'react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const formatCurrency = (amount = 0) => currencyFormatter.format(Math.abs(amount));

const TransactionTable = ({ transactions, category, onClose, limitInfo }) => {
  const [sortField, setSortField] = useState('amount');
  const [sortDirection, setSortDirection] = useState('desc');

  const sortedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    const sorted = [...transactions].sort((a, b) => {
      let aValue, bValue;

      if (sortField === 'amount') {
        aValue = Math.abs(a.amount);
        bValue = Math.abs(b.amount);
      } else if (sortField === 'date') {
        // Parse as local dates to match formatDate behavior
        const [aYear, aMonth, aDay] = a.transaction_date.split('-').map(Number);
        const [bYear, bMonth, bDay] = b.transaction_date.split('-').map(Number);
        aValue = new Date(aYear, aMonth - 1, aDay);
        bValue = new Date(bYear, bMonth - 1, bDay);
      } else {
        return 0;
      }

      if (sortDirection === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    return sorted;
  }, [transactions, sortField, sortDirection]);

  const totalAmount = useMemo(() => {
    if (!transactions || transactions.length === 0) return 0;
    return transactions.reduce((sum, transaction) => {
      const amount = typeof transaction.amount === 'number' ? transaction.amount : 0;
      return sum + Math.abs(amount);
    }, 0);
  }, [transactions]);

  const summaryText = transactions && transactions.length > 0
    ? ` (${transactions.length} transactions, ${formatCurrency(totalAmount)} total)`
    : '';

  const limitDetails = useMemo(() => {
    if (!limitInfo) return null;

    const monthsMultiplier = Math.max(1, limitInfo.months_multiplier || 1);
    const monthLabel = monthsMultiplier === 1 ? 'month' : 'months';
    const baseLimit = typeof limitInfo.base_limit === 'number' ? limitInfo.base_limit : null;
    const totalSpent = typeof limitInfo.total_spent === 'number' ? limitInfo.total_spent : totalAmount;
    const effectiveLimit = typeof limitInfo.effective_limit === 'number'
      ? limitInfo.effective_limit
      : baseLimit !== null
        ? baseLimit * monthsMultiplier
        : null;

    let difference = typeof limitInfo.difference === 'number' ? limitInfo.difference : null;
    if (difference === null && effectiveLimit !== null) {
      difference = effectiveLimit - totalSpent;
    }

    if (baseLimit === null || effectiveLimit === null || difference === null) {
      return {
        status: 'no-limit',
        delta: 'No limit set',
        meta: null
      };
    }

    const nearLimit = Math.abs(difference) < 0.01;
    let status = 'at-limit';
    let deltaText = 'At limit';

    if (!nearLimit) {
      if (difference > 0) {
        status = 'under';
        deltaText = `Under limit by ${formatCurrency(difference)}`;
      } else {
        status = 'over';
        deltaText = `Over limit by ${formatCurrency(Math.abs(difference))}`;
      }
    }

    const metaText = `Limit ${formatCurrency(baseLimit)} × ${monthsMultiplier} ${monthLabel} = ${formatCurrency(effectiveLimit)}`;

    return {
      status,
      delta: deltaText,
      meta: metaText
    };
  }, [limitInfo, totalAmount]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (dateString) => {
    // Parse as local date to avoid timezone conversion issues
    // Backend sends dates as 'YYYY-MM-DD' which new Date() interprets as UTC
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSortIndicator = (field) => {
    if (sortField !== field) return ' ↕️';
    return sortDirection === 'desc' ? ' ↓' : ' ↑';
  };

  const renderHeader = () => (
    <div className="transaction-table-header">
      <div className="transaction-table-title">
        <div className="transaction-table-title-row">
          <h3>Transactions for "{category}"{summaryText}</h3>
          {limitDetails && limitDetails.delta && (
            <span className={`transaction-limit-delta ${limitDetails.status}`}>
              {limitDetails.delta}
            </span>
          )}
        </div>
        {limitDetails && limitDetails.meta && (
          <div className={`transaction-limit-meta ${limitDetails.status}`}>
            {limitDetails.meta}
          </div>
        )}
      </div>
      <button className="close-button" onClick={onClose}>×</button>
    </div>
  );

  if (!transactions || transactions.length === 0) {
    return (
      <div className="transaction-table-container">
        {renderHeader()}
        <div className="no-transactions">
          No transactions found for this category.
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-table-container">
      {renderHeader()}

      <div className="transaction-table-wrapper">
        <table className="transaction-table">
          <thead>
            <tr>
              <th
                className="sortable"
                onClick={() => handleSort('date')}
                title="Click to sort by date"
              >
                Date{getSortIndicator('date')}
              </th>
              <th>Merchant</th>
              <th>Category</th>
              <th>Person</th>
              <th>Account</th>
              <th
                className="sortable"
                onClick={() => handleSort('amount')}
                title="Click to sort by amount"
              >
                Amount{getSortIndicator('amount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((transaction, index) => (
              <tr key={index}>
                <td>{formatDate(transaction.transaction_date)}</td>
                <td className="merchant">{transaction.merchant_name || 'Unknown'}</td>
                <td className="category">{transaction.spending_category}</td>
                <td className="person">{transaction.person || 'Unknown'}</td>
                <td className="account">{transaction.account_type || 'Unknown'}</td>
                <td className="amount">{formatCurrency(transaction.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
