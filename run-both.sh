#!/bin/bash

# Start backend in background
echo "Starting backend..."
cd backend
pip install -r requirements.txt
python main.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
cd ../frontend
npm install
npm start &
FRONTEND_PID=$!

# Function to cleanup on exit
cleanup() {
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Trap cleanup on script exit
trap cleanup SIGINT SIGTERM

echo "Both services started. Press Ctrl+C to stop."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"

# Wait for user to stop
wait