# Google Cloud Platform Setup Guide

This guide will help you deploy your TCG Marketplace to Google Cloud Platform for a dynamic, scalable hosting solution.

## 🚀 Quick Start

### Prerequisites

1. **Install Google Cloud CLI**
   ```bash
   # Windows (using Chocolatey)
   choco install gcloudsdk
   
   # macOS (using Homebrew)
   brew install google-cloud-sdk
   
   # Linux
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   ```

2. **Authenticate with Google Cloud**
   ```bash
   gcloud auth login
   gcloud config set project fourth-arena-474414-h6
   ```

### Option 1: Quick Deploy (Recommended)

```bash
# Run the deployment script
./deploy-gcp.sh
```

### Option 2: Manual Deployment

1. **Enable APIs**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

2. **Build and Deploy**
   ```bash
   # Build Docker image
   gcloud builds submit --tag gcr.io/fourth-arena-474414-h6/tcg-marketplace:latest .
   
   # Deploy to Cloud Run
   gcloud run deploy tcg-marketplace \
     --image gcr.io/fourth-arena-474414-h6/tcg-marketplace:latest \
     --platform managed \
     --region me-west1 \
     --allow-unauthenticated \
     --port 5000 \
     --memory 2Gi \
     --cpu 2
   ```

## 🏗️ Infrastructure as Code (Terraform)

For production deployments with load balancers and advanced configuration:

1. **Install Terraform**
   ```bash
   # Windows (using Chocolatey)
   choco install terraform
   
   # macOS (using Homebrew)
   brew install terraform
   ```

2. **Deploy Infrastructure**
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

## 🔄 CI/CD with GitHub Actions

1. **Create Service Account**
   ```bash
   gcloud iam service-accounts create github-actions \
     --display-name="GitHub Actions"
   
   gcloud projects add-iam-policy-binding fourth-arena-474414-h6 \
     --member="serviceAccount:github-actions@fourth-arena-474414-h6.iam.gserviceaccount.com" \
     --role="roles/run.admin"
   
   gcloud iam service-accounts keys create key.json \
     --iam-account=github-actions@fourth-arena-474414-h6.iam.gserviceaccount.com
   ```

2. **Add GitHub Secrets**
   - Go to your GitHub repository settings
   - Add secret: `GCP_SA_KEY` with the contents of `key.json`

3. **Push to main branch** - automatic deployment will trigger

## 📊 Monitoring and Management

### Cloud Console URLs

- **Cloud Run**: https://console.cloud.google.com/run
- **Cloud Build**: https://console.cloud.google.com/cloud-build
- **Firestore**: https://console.cloud.google.com/firestore
- **Storage**: https://console.cloud.google.com/storage

### Useful Commands

```bash
# View logs
gcloud run services logs read tcg-marketplace --region me-west1

# Update service
gcloud run services update tcg-marketplace --region me-west1

# Scale service
gcloud run services update tcg-marketplace \
  --min-instances 2 \
  --max-instances 20 \
  --region me-west1
```

## 🔧 Configuration

### Environment Variables

Set these in Cloud Run or via Terraform:

- `NODE_ENV=production`
- `PORT=5000`
- `FIREBASE_SERVICE_ACCOUNT_JSON` (for server-side Firestore access)

### Custom Domain (Optional)

1. **Reserve static IP**
   ```bash
   gcloud compute addresses create tcg-marketplace-ip --global
   ```

2. **Configure DNS**
   - Point your domain to the reserved IP
   - Add SSL certificate in Cloud Console

## 💰 Cost Optimization

### Free Tier Limits
- Cloud Run: 2 million requests/month
- Firestore: 1GB storage, 50K reads/day
- Cloud Build: 120 build-minutes/day

### Production Recommendations
- Use Cloud CDN for static assets
- Implement caching strategies
- Monitor usage with Cloud Monitoring
- Set up billing alerts

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   gcloud builds log --stream
   ```

2. **Service Won't Start**
   ```bash
   # Check service logs
   gcloud run services logs read tcg-marketplace --region me-west1
   ```

3. **Permission Errors**
   ```bash
   # Verify service account permissions
   gcloud projects get-iam-policy fourth-arena-474414-h6
   ```

### Health Checks

- **API Health**: `https://your-service-url/api/health`
- **Firestore Test**: `https://your-service-url/test-firestore`

## 📈 Scaling

### Automatic Scaling
- Cloud Run automatically scales based on traffic
- Configure min/max instances based on your needs

### Manual Scaling
```bash
gcloud run services update tcg-marketplace \
  --min-instances 5 \
  --max-instances 100 \
  --concurrency 1000 \
  --region me-west1
```

## 🔒 Security

### Best Practices
- Use IAM roles with least privilege
- Enable Cloud Security Command Center
- Regular security updates
- Monitor access logs

### Firestore Security
- Rules are already deployed via Firebase
- Review and update as needed
- Test rules in Firebase Console

## 📞 Support

- **Google Cloud Support**: https://cloud.google.com/support
- **Documentation**: https://cloud.google.com/docs
- **Community**: https://cloud.google.com/community
