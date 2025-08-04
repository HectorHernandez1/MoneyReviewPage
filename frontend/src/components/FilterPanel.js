import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const FilterPanel = ({ period, year, user, month, onFiltersChange }) => {
  const [users, setUsers] = useState([]);
  const [periods, setPeriods] = useState({ years: [], months: [] });
  const [loading, setLoading] = useState(true);
  const hasInitialized = useRef(false);
  
  // Local state for pending filter changes
  const [pendingPeriod, setPendingPeriod] = useState(period);
  const [pendingYear, setPendingYear] = useState(year);
  const [pendingUser, setPendingUser] = useState(user);
  const [pendingMonth, setPendingMonth] = useState(month || '');

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchStaticData();
    }
  }, []);

  // Update local state when props change
  useEffect(() => {
    setPendingPeriod(period);
    setPendingYear(year);
    setPendingUser(user);
    setPendingMonth(month || '');
  }, [period, year, user, month]);

  // Auto-select month when switching to monthly period and no month is set
  useEffect(() => {
    if (pendingPeriod === 'monthly' && !pendingMonth && periods.months?.length > 0) {
      setPendingMonth(periods.months[0].value);
    }
  }, [pendingPeriod, pendingMonth, periods.months]);

  const handleApplyFilters = () => {
    // Ensure we have a month selected when period is monthly
    let monthToUse = pendingMonth;
    if (pendingPeriod === 'monthly' && !monthToUse && periods.months?.length > 0) {
      monthToUse = periods.months[0].value;
      setPendingMonth(monthToUse);
    }
    
    const filters = {
      period: pendingPeriod,
      year: pendingYear,
      user: pendingUser,
      month: pendingPeriod === 'monthly' ? monthToUse : ''
    };
    onFiltersChange(filters);
  };

  const hasChanges = pendingPeriod !== period || pendingYear !== year || pendingUser !== user || 
    (pendingPeriod === 'monthly' && pendingMonth !== month);

  const fetchStaticData = async () => {
    try {
      const [usersRes, periodsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/users`),
        axios.get(`${API_BASE_URL}/periods`)
      ]);
      
      setUsers(usersRes.data.users || []);
      setPeriods(periodsRes.data);
      
      if (!pendingMonth && periodsRes.data.months?.length > 0) {
        setPendingMonth(periodsRes.data.months[0].value);
      }
    } catch (error) {
      console.error('Error fetching static data:', error);
      setUsers(['All Users', 'Hector', 'Spouse']);
    }
    setLoading(false);
  };

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
          onChange={(e) => {
            const newPeriod = e.target.value;
            setPendingPeriod(newPeriod);
            
            // Auto-select first month when switching to monthly
            if (newPeriod === 'monthly' && !pendingMonth && periods.months?.length > 0) {
              setPendingMonth(periods.months[0].value);
            }
          }}
        >
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
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


      {/* Only show year selector for Yearly */}
      {pendingPeriod === 'yearly' && (
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