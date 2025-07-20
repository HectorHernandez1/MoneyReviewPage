import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import PeriodSelector from './components/PeriodSelector';
import './App.css';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});

  useEffect(() => {
    fetchData();
  }, [period, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transactionsRes, categoriesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/transactions?period=${period}&year=${year}`),
        axios.get(`${API_BASE_URL}/categories`)
      ]);
      
      setTransactions(transactionsRes.data.data);
      setSummary(transactionsRes.data.summary);
      setCategories(categoriesRes.data.categories);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Budget Dashboard</h1>
        <PeriodSelector 
          period={period}
          year={year}
          onPeriodChange={setPeriod}
          onYearChange={setYear}
        />
      </header>
      
      <main className="App-main">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <Dashboard 
            transactions={transactions}
            categories={categories}
            summary={summary}
            period={period}
          />
        )}
      </main>
    </div>
  );
}

export default App;