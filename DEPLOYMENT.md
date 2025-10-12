# Deployment Guide

This guide covers all deployment options for the Yu-Gi-Oh! Marketplace application.

## 🏗️ Architecture Overview

The application consists of two main services:
- **Server**: Node.js/Express API with Firestore backend
- **Client**: React frontend with Nginx serving static files

## 🐳 Docker Setup

### Local Development

1. **Start local development environment**:
   ```bash
   ./deployment/deploy-local.sh
   ```

2. **Manual Docker Compose**:
   ```bash
   docker-compose up --build
   ```

3. **Individual services**:
   ```bash
   # Build server
   docker build -f server/Dockerfile -t tcg-server ./server
   
   # Build client
   docker build -f client/Dockerfile -t tcg-client ./client
   ```

### Production Images

The Dockerfiles are optimized for production with:
- Multi-stage builds for smaller images
- Non-root users for security
- Health checks
- Proper signal handling with dumb-init

## 🚀 Deployment Options

### Option 1: Google Cloud Platform (Recommended)

#### Automated Deployment
```bash
# Deploy to GCP
./deployment/deploy-gcp.sh
```

#### Manual Deployment
```bash
# Build and push images
gcloud builds submit --tag gcr.io/fourth-arena-474414-h6/tcg-marketplace-server:latest ./server
gcloud builds submit --tag gcr.io/fourth-arena-474414-h6/tcg-marketplace-client:latest ./client

# Deploy to Cloud Run
gcloud run deploy tcg-marketplace-server --image gcr.io/fourth-arena-474414-h6/tcg-marketplace-server:latest
gcloud run deploy tcg-marketplace-client --image gcr.io/fourth-arena-474414-h6/tcg-marketplace-client:latest
```

### Option 2: Firebase Hosting (Client Only)

```bash
# Build client
cd client && npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

### Option 3: Any Cloud Provider

The Docker images can be deployed to any cloud provider that supports containers:
- AWS ECS/Fargate
- Azure Container Instances
- DigitalOcean App Platform
- Heroku Container Registry

## 🔄 CI/CD Pipeline

### GitHub Actions

The repository includes a comprehensive GitHub Actions workflow (`.github/workflows/deploy.yml`) that:

1. **Tests**: Runs tests for both client and server
2. **Builds**: Creates optimized Docker images
3. **Deploys**: Automatically deploys to GCP on push to main

#### Setup GitHub Actions

1. **Create Service Account**:
   ```bash
   gcloud iam service-accounts create github-actions \
     --display-name="GitHub Actions"
   
   gcloud projects add-iam-policy-binding fourth-arena-474414-h6 \
     --member="serviceAccount:github-actions@fourth-arena-474414-h6.iam.gserviceaccount.com" \
     --role="roles/run.admin"
   
   gcloud iam service-accounts keys create key.json \
     --iam-account=github-actions@fourth-arena-474414-h6.iam.gserviceaccount.com
   ```

2. **Add GitHub Secrets**:
   - `GCP_SA_KEY`: Contents of the service account key file
   - `FIREBASE_SERVICE_ACCOUNT`: Firebase service account (optional)

### Cloud Build

Use the Cloud Build configuration for automated builds:

```bash
# Trigger build
gcloud builds submit --config deployment/cloudbuild.yaml .
```

## 🔧 Environment Configuration

### Required Environment Variables

#### Server
- `NODE_ENV`: production
- `PORT`: 5000
- `FIREBASE_SERVICE_ACCOUNT_JSON`: Firebase service account JSON

#### Client
- `VITE_API_URL`: Backend API URL (automatically set in production)

### Local Development
Create a `.env` file in the root directory:
```bash
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
VITE_API_URL=http://localhost:5000/api
```

## 📊 Monitoring and Health Checks

### Health Check Endpoints
- **Server**: `GET /api/health`
- **Client**: `GET /health`

### Monitoring
- **GCP Console**: Cloud Run metrics and logs
- **Firebase Console**: Firestore usage and performance
- **Application Logs**: Available in Cloud Run logs

## 🔒 Security Considerations

### Docker Security
- Non-root users in containers
- Minimal base images (Alpine Linux)
- Security headers in Nginx configuration
- Proper signal handling

### Network Security
- CORS configuration for API
- Firebase Authentication
- Environment variable protection

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**:
   ```bash
   # Check build logs
   docker build -f server/Dockerfile ./server
   docker build -f client/Dockerfile ./client
   ```

2. **Service Communication**:
   ```bash
   # Test API connectivity
   curl http://localhost:5000/api/health
   curl http://localhost:5000/health
   ```

3. **Firebase Authentication**:
   - Verify service account JSON
   - Check Firebase project configuration
   - Ensure Firestore rules are deployed

### Debug Commands

```bash
# View container logs
docker-compose logs -f server
docker-compose logs -f client

# Check service status
docker-compose ps

# Access container shell
docker-compose exec server sh
docker-compose exec client sh
```

## 📈 Scaling

### Horizontal Scaling
- Cloud Run automatically scales based on traffic
- Configure min/max instances in deployment scripts

### Vertical Scaling
- Adjust memory and CPU in Cloud Run configuration
- Monitor performance and adjust accordingly

## 🔄 Updates and Rollbacks

### Rolling Updates
- Cloud Run supports zero-downtime deployments
- Automatic health checks ensure service stability

### Rollbacks
```bash
# Rollback to previous version
gcloud run services update tcg-marketplace-server \
  --image gcr.io/fourth-arena-474414-h6/tcg-marketplace-server:previous-tag
```

## 📞 Support

For deployment issues:
1. Check the logs in Cloud Run console
2. Verify environment variables
3. Test locally with Docker Compose
4. Review the troubleshooting section above
