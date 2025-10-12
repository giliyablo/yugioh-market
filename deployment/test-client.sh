#!/bin/bash

echo "🧪 Testing client container locally..."

# Build the client image
echo "🐳 Building client image..."
docker build -t test-client ./client

# Test with default port
echo "🔍 Testing with default port (5000)..."
docker run --rm -d --name test-client-5000 -p 5000:5000 test-client
sleep 5
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Client works on port 5000"
else
    echo "❌ Client failed on port 5000"
fi
docker stop test-client-5000

# Test with custom port
echo "🔍 Testing with custom port (3000)..."
docker run --rm -d --name test-client-3000 -p 3000:3000 -e PORT=3000 test-client
sleep 5
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Client works on port 3000"
else
    echo "❌ Client failed on port 3000"
fi
docker stop test-client-3000

echo "🧪 Local testing complete!"
