#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

MODE="${1:-dev}"

if [ "$MODE" != "dev" ] && [ "$MODE" != "prod" ]; then
  echo "Usage: ./start.sh [dev|prod]"
  echo "  dev   - Start in development mode (default)"
  echo "  prod  - Start in production mode"
  exit 1
fi

echo "🚀 Starting FORGE x402 Agent Network ($MODE mode)..."
echo ""

cleanup() {
  echo ""
  echo "⏹️  Shutting down services..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  wait 2>/dev/null || true
  echo "✅ Services stopped"
  exit 0
}

trap cleanup SIGINT SIGTERM

if [ "$MODE" = "dev" ]; then
  echo "📦 Backend: Installing dependencies..."
  cd "$BACKEND_DIR"
  npm install > /dev/null 2>&1 || true
  
  echo "📦 Frontend: Installing dependencies..."
  cd "$FRONTEND_DIR"
  npm install > /dev/null 2>&1 || true
  
  echo ""
  echo "🔧 Starting backend (development mode)..."
  cd "$BACKEND_DIR"
  npm run dev &
  BACKEND_PID=$!
  
  sleep 2
  
  echo "🎨 Starting frontend (development mode)..."
  cd "$FRONTEND_DIR"
  npm run dev &
  FRONTEND_PID=$!
  
elif [ "$MODE" = "prod" ]; then
  echo "🔨 Building backend..."
  cd "$BACKEND_DIR"
  npm install > /dev/null 2>&1 || true
  npm run build > /dev/null 2>&1
  
  echo "🔨 Building frontend..."
  cd "$FRONTEND_DIR"
  npm install > /dev/null 2>&1 || true
  npm run build > /dev/null 2>&1
  
  echo ""
  echo "🚀 Starting backend (production mode)..."
  cd "$BACKEND_DIR"
  npm run start &
  BACKEND_PID=$!
  
  sleep 2
  
  echo "🚀 Starting frontend (production mode)..."
  cd "$FRONTEND_DIR"
  npm run start &
  FRONTEND_PID=$!
fi

echo ""
echo "✅ Services started!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

wait
