Yu-Gi-Oh! Marketplace
A full-stack marketplace application for Yu-Gi-Oh! players to buy and sell cards locally. The application features a React frontend, a Node.js backend, and a separate worker service for background tasks like web scraping.

🏗️ Project Structure
The project is organized into a monorepo with three main services:

yugioh-market/
├── client/         # React frontend (Vite)
├── server/         # Node.js backend API (Express)
├── worker/         # Node.js background job processor (Puppeteer)
├── deployment/     # Deployment scripts (Docker, k8s, GCP)
└── terraform/      # Infrastructure as Code (GCP)

🚀 Tech Stack
Frontend: React, Vite, Axios, Firebase SDK

Backend: Node.js, Express.js

Worker: Node.js, Puppeteer for scraping

Database: Google Firestore

Deployment: Docker, Google Cloud Run, Kubernetes (optional)

CI/CD: GitHub Actions

🏁 Getting Started
Prerequisites
Node.js (v20 or later)

Docker & Docker Compose

Google Cloud SDK (for GCP deployment)

Terraform (for IaC deployment)

Local Development
Set up Environment:
Create a .env file in the root directory by copying the example.

cp .env.example .env

Add your Firebase service account JSON to the .env file.

Run with Docker Compose:
The easiest way to get all services running locally is with the flexible deployment script.

# Start all services (server, worker, client)
./deployment/build-deploy-local.sh all

You can also run individual services:

./deployment/build-deploy-local.sh server

Access Services:

Client (Frontend): http://localhost:3000

Server (API): http://localhost:5000

Worker: http://localhost:4000 (for health checks)

☁️ Deployment
The application is designed for easy deployment to Google Cloud Run.

Automated Deployment: The repository includes a GitHub Actions workflow that automatically tests, builds, and deploys all services on a push to the main or develop branch.

Manual Deployment: Flexible shell scripts are provided in the /deployment folder for manual deployments to GCP or a local Kubernetes cluster.

For detailed instructions, see DEPLOYMENT.md and GCP-SETUP.md.

📁 Key Files
docker-compose.yml: Defines the local development environment.

.github/workflows/deploy.yml: The CI/CD pipeline for GitHub Actions.

deployment/: Contains all deployment scripts (build-deploy-gcp.sh, deploy-k8s.sh, etc.).

terraform/: Contains the infrastructure-as-code configuration for GCP resources.

client/, server/, worker/: Each contains a Dockerfile for building its production container image.
