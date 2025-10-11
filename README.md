# Yu-Gi-Oh! Marketplace

A full-stack marketplace application for Yu-Gi-Oh! players to buy and sell cards locally.

## 🏗️ Project Structure

```
yugioh-market/
├── client/                 # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── context/       # React context
│   └── dist/              # Built frontend
├── server/                # Node.js backend (Express + Firestore)
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Express middleware
│   ├── routes/           # API routes
│   └── services/         # Business logic
├── terraform/            # Infrastructure as Code (GCP)
└── deployment/           # Deployment configurations
```

## 🚀 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Firebase Auth
- **Backend**: Node.js, Express, Firebase Admin SDK
- **Database**: Google Firestore
- **Infrastructure**: Google Cloud Platform (Cloud Run, Terraform)
- **Deployment**: Docker, Cloud Build

## 🚀 Quick Start

### Local Development

1. **Install dependencies**:
   ```bash
   # Backend
   cd server && npm install
   
   # Frontend  
   cd client && npm install
   ```

2. **Set up Firebase**:
   - Create a Firebase project
   - Enable Firestore and Authentication
   - Add your Firebase config to `client/src/services/firebase.js`

3. **Run locally**:
   ```bash
   # Terminal 1 - Backend
   cd server && npm start
   
   # Terminal 2 - Frontend
   cd client && npm run dev
   ```

### Production Deployment

See [GCP-SETUP.md](./GCP-SETUP.md) for detailed deployment instructions.

## 📁 Key Files

- `client/src/App.jsx` - Main React application
- `server/index.js` - Express server entry point
- `terraform/main.tf` - GCP infrastructure configuration
- `Dockerfile` - Production container configuration
- `firebase.json` - Firebase hosting configuration 
