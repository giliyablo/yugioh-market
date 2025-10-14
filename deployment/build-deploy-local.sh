#!/bin/bash

set -e

# --- Pre-flight checks ---
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install it first."
        exit 1
    fi
}

check_env_file() {
    if [ ! -f .env ]; then
        echo "📝 Creating .env file..."
        cat > .env << EOF
# Firebase Configuration - Add your service account JSON here
FIREBASE_SERVICE_ACCOUNT_JSON=

# API Configuration
VITE_API_URL=http://localhost:5000/api
EOF
        echo "⚠️  Please add your Firebase service account JSON to the .env file and re-run."
        exit 1
    fi
}

# --- Function to start a specific service ---
start_service() {
    local service_name=$1
    echo "--- 🐳 Building and starting LOCAL service: $service_name ---"
    # --build will build the image if it doesn't exist or if the Dockerfile/context has changed
    # -d runs the containers in the background
    docker-compose up --build -d $service_name
}

# --- Usage instructions ---
usage() {
    echo "Usage: $0 [all|server|worker|client|down]"
    echo "  all       (default) Builds and starts the server, worker, and client."
    echo "  server    Builds and starts only the server."
    echo "  worker    Builds and starts only the worker."
    echo "  client    Builds and starts only the client."
    echo "  down      Stops and removes all local containers."
    exit 1
}

# --- Main script execution ---

SERVICE_TO_DEPLOY=${1:-"all"}

echo "🚀 Managing local development environment..."

# Handle the 'down' command separately
if [ "$SERVICE_TO_DEPLOY" = "down" ]; then
    echo "🛑 Stopping and removing local containers..."
    docker-compose down
    echo "✅ Services stopped."
    exit 0
fi

# Run pre-flight checks for all 'up' commands
check_docker
check_env_file

case $SERVICE_TO_DEPLOY in
    "all")
        echo "🐳 Building and starting all services..."
        docker-compose up --build -d
        ;;
    "server"|"worker"|"client")
        start_service $SERVICE_TO_DEPLOY
        ;;
    *)
        echo "❌ Invalid argument: $SERVICE_TO_DEPLOY"
        usage
        ;;
esac

echo "✅ Docker Compose command executed for '$SERVICE_TO_DEPLOY'."
echo ""
echo "📊 View logs: docker-compose logs -f [service_name]"
echo "🛑 Stop all services: ./deployment/build-deploy-local.sh down"
echo ""
echo "--- Service URLs ---"
echo "🌍 Client: http://localhost:3000"
echo "🔗 API Server: http://localhost:5000/api/health"
echo "🔧 Worker: http://localhost:4000/health"
```

I have now updated your local deployment script. Here is how you can use it:

* **Start all services (default):**
    ```bash
    ./deployment/build-deploy-local.sh
    # or
    ./deployment/build-deploy-local.sh all
    ```
* **Start just one service:**
    ```bash
    ./deployment/build-deploy-local.sh server
    ./deployment/build-deploy-local.sh worker
    ./deployment/build-deploy-local.sh client
    ```
* **Stop all running services:**
    ```bash
    ./deployment/build-deploy-local.sh down
    
