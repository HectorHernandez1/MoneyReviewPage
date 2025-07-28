import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const FilterPanel = ({ period, year, user, onPeriodChange, onYearChange, onMonthChange, onQuarterChange, onUserChange }) => {
  const [users, setUsers] = useState([]);
  const [periods, setPeriods] = useState({ years: [], months: [], quarters: [] });
  const [loading, setLoading] = useState(true);
  
  // Local state for pending filter changes
  const [pendingPeriod, setPendingPeriod] = useState(period);
  const [pendingYear, setPendingYear] = useState(year);
  const [pendingUser, setPendingUser] = useState(user);
  const [pendingMonth, setPendingMonth] = useState('');
  const [pendingQuarter, setPendingQuarter] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchPeriods();
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
    // Pass selected month/quarter for API calls
    if (pendingPeriod === 'monthly' && pendingMonth) {
      onMonthChange?.(pendingMonth);
    } else if (pendingPeriod === 'quarterly' && pendingQuarter) {
      onQuarterChange?.(pendingQuarter);
    }
  };

  const hasChanges = pendingPeriod !== period || pendingYear !== year || pendingUser !== user || 
    (pendingPeriod === 'monthly' && pendingMonth) || 
    (pendingPeriod === 'quarterly' && pendingQuarter);


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

  const fetchPeriods = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/periods`);
      setPeriods(response.data);
      // Set default month/quarter to the first available
      if (response.data.months?.length > 0) {
        setPendingMonth(response.data.months[0].value);
      }
      if (response.data.quarters?.length > 0) {
        setPendingQuarter(response.data.quarters[0].value);
      }
    } catch (error) {
      console.error('Error fetching periods:', error);
    }
  };

  // Use years from database, fallback to current approach
  const currentYear = new Date().getFullYear();
  const years = periods.years.length > 0 ? periods.years : Array.from({ length: 5 }, (_, i) => currentYear - i);

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
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="ytd">Year to Date</option>
        </select>
      </div>

      {/* Show month selector when Monthly is selected */}
      {pendingPeriod === 'monthly' && (
        <div className="filter-group">
          <label htmlFor="month-select">Month</label>
          <select 
            id="month-select"
            value={pendingMonth} 
            onChange={(e) => setPendingMonth(e.target.value)}
          >
            {periods.months.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Show quarter selector when Quarterly is selected */}
      {pendingPeriod === 'quarterly' && (
        <div className="filter-group">
          <label htmlFor="quarter-select">Quarter</label>
          <select 
            id="quarter-select"
            value={pendingQuarter} 
            onChange={(e) => setPendingQuarter(e.target.value)}
          >
            {periods.quarters.map(quarter => (
              <option key={quarter.value} value={quarter.value}>
                {quarter.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Only show year selector for Year to Date */}
      {pendingPeriod === 'ytd' && (
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
      )}

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