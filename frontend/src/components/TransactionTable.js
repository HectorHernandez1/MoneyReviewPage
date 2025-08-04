import React, { useState, useMemo } from 'react';

const TransactionTable = ({ transactions, category, onClose }) => {
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
        aValue = new Date(a.transaction_date);
        bValue = new Date(b.transaction_date);
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

  const getSortIndicator = (field) => {
    if (sortField !== field) return ' ↕️';
    return sortDirection === 'desc' ? ' ↓' : ' ↑';
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="transaction-table-container">
        <div className="transaction-table-header">
          <h3>Transactions for "{category}"</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="no-transactions">
          No transactions found for this category.
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-table-container">
      <div className="transaction-table-header">
        <h3>Transactions for "{category}" ({transactions.length} transactions)</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

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
                <td className="amount">{formatAmount(transaction.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;