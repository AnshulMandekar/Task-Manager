# TaskFlow — Personal Task Manager

AI-powered personal task manager with MERN stack and Gemini 2.0 Flash for auto-categorization.

## Features

- **Three Core Lists** — College, Job, Study with full CRUD
- **AI Chat Interface** — Type a task or upload an image, Gemini classifies it automatically
- **Due Today Dashboard** — See all tasks due today at a glance
- **Push Notifications** — Reminders for due-soon and overdue tasks
- **Mobile-First PWA** — Installable on phone, works offline for cached pages

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite), Vanilla CSS |
| Backend | Node.js, Express, Mongoose |
| LLM Service | Python, FastAPI, Gemini 2.0 Flash |
| Database | MongoDB Atlas |
| Auth | JWT + bcrypt |

## Project Structure

```
├── client/          # React PWA (Vite)
├── server/          # Express API
├── llm-service/     # Python FastAPI LLM microservice
└── render.yaml      # Render deployment Blueprint
```

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB Atlas cluster (or local MongoDB)

### 1. Install dependencies

```bash
# Root (optional, for concurrently)
npm install

# Server
cd server && npm install

# Client
cd client && npm install

# LLM Service
cd llm-service
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### 2. Configure environment

**server/.env:**
```
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
LLM_SERVICE_URL=http://localhost:8000
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:you@example.com
```

Generate VAPID keys: `cd server && node utils/generateVapidKeys.js`

**llm-service/.env:**
```
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run all services

```bash
# Terminal 1: Server
cd server && npm run dev

# Terminal 2: Client
cd client && npm run dev

# Terminal 3: LLM Service
cd llm-service && uvicorn main:app --reload --port 8000
```

Or use the root command: `npm run dev` (requires concurrently)

App will be available at `http://localhost:3000`

## Deployment (Render)

1. Push to a Git repository
2. Go to Render → New → Blueprint
3. Point to your repo — Render will read `render.yaml`
4. Set environment variables for each service in Render dashboard
5. Deploy!

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/tasks` | List tasks (filter: category, status) |
| GET | `/api/tasks/today` | Tasks due today |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/chat/classify` | Classify text/image via LLM |
| GET | `/api/notifications/vapid-public-key` | Get VAPID public key |
| POST | `/api/notifications/subscribe` | Save push subscription |
