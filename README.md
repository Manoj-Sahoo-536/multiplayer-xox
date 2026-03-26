# Multiplayer Tic-Tac-Toe

A real-time multiplayer Tic-Tac-Toe game built with React, Socket.IO, and Express.

## Features

- Real-time multiplayer gameplay
- Room-based matchmaking with 6-digit codes
- Manual symbol selection (X or O)
- Score tracking across multiple games
- Responsive modern UI with animations

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## How to Play

1. **Create a room** and choose your symbol (X or O)
2. **Share the 6-digit code** with your friend
3. Your friend **joins using the code**
4. **Play the game** - X always goes first
5. **Track your scores** across multiple rounds
6. **Play again** with new symbol selection

## Deployment

### Deploy to Render

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml` and deploy

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Vercel will automatically detect `vercel.json` and deploy

### Deploy to Railway

1. Push your code to GitHub
2. Go to [Railway Dashboard](https://railway.app/dashboard)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will automatically build and deploy

### Environment Variables

No environment variables required! The app works out of the box.

## Tech Stack

- **Frontend:** React, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express, Socket.IO
- **Build Tool:** Vite
