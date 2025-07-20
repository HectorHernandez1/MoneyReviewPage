# Budget Dashboard Setup

## Prerequisites
- Python 3.8+ 
- Node.js 16+
- PostgreSQL database with your budget_app.transactions_view

## Setup Instructions

### 1. Database Configuration
1. Copy the environment template:
   ```bash
   cp backend/.env.template backend/.env
   ```
2. Edit `backend/.env` with your database credentials:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/your_database
   ```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```
The API will run on http://localhost:8000

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```
The React app will run on http://localhost:3000

## Features
- **Monthly View**: See spending aggregated by month and category
- **Quarterly View**: See spending aggregated by quarter and category  
- **Year to Date**: See total spending by category for the current year
- **Interactive Charts**: Bar charts for trends, pie charts for category breakdown
- **Responsive Design**: Works on desktop and mobile

## API Endpoints
- `GET /transactions?period=monthly&year=2024` - Get aggregated transaction data
- `GET /categories` - Get category summary statistics

## Database Requirements
Your PostgreSQL database should have the `budget_app.transactions_view` view as defined in your original query.