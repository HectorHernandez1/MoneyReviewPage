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
- **Category Management**: View, edit, and add spending categories with budget limits
- **AI Budget Chatbot**: Ask natural language questions about your spending using Claude AI
- **Responsive Design**: Works on desktop and mobile

## AI Chatbot Setup

The chatbot requires a Claude API key from Anthropic.

1. Add your API key to `backend/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
2. Install the anthropic package:
   ```bash
   cd backend
   pip install anthropic
   ```
3. Restart the backend. The chat bubble will appear in the bottom-right corner of the dashboard.

The chatbot can answer questions like:
- "What are my top spending categories?"
- "Am I over budget anywhere?"
- "How much did I spend at Costco?"
- "Compare this month to last month"
- "Who spent the most?"

The chatbot is restricted to only answer questions about your spending and budget data — it will not respond to off-topic questions.

## API Endpoints
- `GET /transactions?period=monthly&year=2024` - Get aggregated transaction data
- `GET /categories` - Get category summary statistics
- `GET /raw-transactions` - Get raw transaction data for charts
- `GET /users` - Get list of available users
- `GET /periods` - Get available time periods
- `GET /category-transactions?category=Food` - Get transactions for a specific category
- `GET /categories-list` - Get all category names
- `GET /categories-with-limits` - Get categories with spending limits
- `PUT /transaction/category` - Update a transaction's category
- `PUT /category/limit` - Update a category's spending limit
- `POST /category` - Create a new category
- `POST /chat` - Send a message to the AI budget chatbot

## Database Requirements
Your PostgreSQL database should have the `budget_app.transactions_view` view as defined in your original query.