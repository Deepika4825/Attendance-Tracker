# Smart Student Attendance Tracker

A full MERN stack attendance management system with QR-based attendance, class management, and activity tracking.

## Project Structure

```
QRTracker/
├── backend/          # Node.js + Express + MongoDB API
└── attendance-tracker/  # React + Vite frontend
```

## Features

- JWT Authentication (Student / Teacher roles)
- QR Code attendance (auto-refreshes every 45s)
- Class management (Class Teacher / Subject Teacher)
- CSV student upload
- Activity submission with proof file
- Activity evaluation by class teacher only
- Forgot password via roll number verification

## Setup

### Backend
```bash
cd backend
npm install
# Create .env with:
# PORT=5000
# MONGO_URI=your_mongodb_uri
# JWT_SECRET=your_secret
# JWT_EXPIRES_IN=7d
# QR_EXPIRY_SECONDS=45
npm run dev
```

### Frontend
```bash
cd attendance-tracker
npm install
# Create .env with:
# VITE_PUBLIC_URL=https://your-ngrok-or-domain.com
npm run dev
```

## Deployment

- Backend: Render / Railway
- Frontend: Vercel / Netlify
- Database: MongoDB Atlas
