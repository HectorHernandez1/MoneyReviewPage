import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const FilterPanel = ({ period, year, user, onPeriodChange, onYearChange, onUserChange }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

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
          value={user} 
          onChange={(e) => onUserChange(e.target.value)}
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
          value={period} 
          onChange={(e) => onPeriodChange(e.target.value)}
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="ytd">Year to Date</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="year-select">Year</label>
        <select 
          id="year-select"
          value={year} 
          onChange={(e) => onYearChange(parseInt(e.target.value))}
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default FilterPanel;