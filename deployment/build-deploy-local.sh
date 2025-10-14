#!/bin/bash

set -e

echo "🚀 Starting local development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install it first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_JSON=

# API Configuration
VITE_API_URL=http://localhost:5000/api
EOF
    echo "⚠️  Please add your Firebase service account JSON to the .env file"
fi

# Build and start services
echo "🐳 Building and starting services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check if services are running
echo "🔍 Checking service health..."

# Check server health
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Server is healthy"
else
    echo "❌ Server is not responding"
    docker-compose logs server
    exit 1
fi

# Check client health
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Client is healthy"
else
    echo "❌ Client is not responding"
    docker-compose logs client
    exit 1
fi

echo "✅ Local development environment is ready!"
echo "🌍 Client: http://localhost:3000"
echo "🔗 API: http://localhost:5000"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
