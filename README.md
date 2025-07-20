# Budget Dashboard

A local web application to visualize and analyze your personal budget data with interactive charts and multiple time period views.

## Quick Start

1. **Set up database connection**: Copy `backend/.env.template` to `backend/.env` and add your PostgreSQL credentials
2. **Start backend**: `cd backend && pip install -r requirements.txt && python main.py`  
3. **Start frontend**: `cd frontend && npm install && npm start`
4. **View dashboard**: Open http://localhost:3000

See `setup.md` for detailed instructions.

## Features
- Monthly, Quarterly, and Year-to-Date views
- Interactive D3.js visualizations  
- Spending category analysis
- Responsive design

## Tech Stack
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: React + D3.js
- **Styling**: CSS Grid + Flexbox
