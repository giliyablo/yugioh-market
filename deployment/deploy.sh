#!/bin/bash

echo "🚀 Deploying TCG Marketplace to Firebase..."

# Build the client
echo "📦 Building client application..."
cd client
npm run build
cd ..

# Deploy to Firebase
echo "🌐 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
echo "🌍 Your site is live at: https://local-tcg-market-place.web.app"
