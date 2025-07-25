import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const FilterPanel = ({ period, year, user, summary, onPeriodChange, onYearChange, onUserChange }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Local state for pending filter changes
  const [pendingPeriod, setPendingPeriod] = useState(period);
  const [pendingYear, setPendingYear] = useState(year);
  const [pendingUser, setPendingUser] = useState(user);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Update local state when props change
  useEffect(() => {
    setPendingPeriod(period);
    setPendingYear(year);
    setPendingUser(user);
  }, [period, year, user]);

  const handleApplyFilters = () => {
    onPeriodChange(pendingPeriod);
    onYearChange(pendingYear);
    onUserChange(pendingUser);
  };

  const hasChanges = pendingPeriod !== period || pendingYear !== year || pendingUser !== user;

  const getMonthlyLabel = () => {
    // Show actual months when data is loaded and period is monthly
    if (summary && summary.current_period && summary.current_period.includes('/')) {
      // Format is "2025-06/2025-07" for previous/current month
      const [prevPeriod, currPeriod] = summary.current_period.split('/');
      
      const formatMonth = (period) => {
        const [year, month] = period.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthNames[parseInt(month) - 1];
      };
      
      const prevMonth = formatMonth(prevPeriod);
      const currMonth = formatMonth(currPeriod);
      
      return `Monthly (${prevMonth} & ${currMonth})`;
    }
    return 'Monthly';
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback to some default users if API fails
      setUsers(['All Users', 'Hector', 'Spouse']);
    }
    setLoading(false);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="filter-panel">
      <h3>Filters</h3>
      
      <div className="filter-group">
        <label htmlFor="user-select">User</label>
        <select 
          id="user-select"
          value={pendingUser} 
          onChange={(e) => setPendingUser(e.target.value)}
          disabled={loading}
        >
          <option value="all">All Users</option>
          {users.map(userName => (
            <option key={userName} value={userName}>
              {userName}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="period-select">Time Frame</label>
        <select 
          id="period-select"
          value={pendingPeriod} 
          onChange={(e) => setPendingPeriod(e.target.value)}
        >
          <option value="monthly">{getMonthlyLabel()}</option>
          <option value="quarterly">Quarterly</option>
          <option value="ytd">Year to Date</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="year-select">Year</label>
        <select 
          id="year-select"
          value={pendingYear} 
          onChange={(e) => setPendingYear(parseInt(e.target.value))}
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <button 
          className={`apply-button ${hasChanges ? 'has-changes' : ''}`}
          onClick={handleApplyFilters}
          disabled={!hasChanges}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;