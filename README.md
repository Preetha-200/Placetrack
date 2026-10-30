# PlaceTrack AI — Institutional Placement Management & AI Readiness Platform

PlaceTrack AI is a multi-tier placement preparation and recruitment management platform for higher education institutions. The project is split into an independent **Frontend (SvelteKit)** application and a **Backend (Python FastAPI)** Machine Learning microservice, prepared for independent deployment on **Vercel** and **Render**.

---

## 1. Project Architecture

```
d:\placement tracker\
├── frontend/                     # SvelteKit Full-Stack Application (Deploy to Vercel)
│   ├── src/                      # UI Pages, Svelte Runes Components & 38 Server API Endpoints
│   │   ├── hooks.server.ts       # RBAC & HMAC Session Middleware
│   │   ├── routes/               # Dashboards (/student, /trainer, /coordinator) & /api routes
│   │   └── lib/server/           # Firestore Admin, Postgres, Gemini AI, & Sandboxed Execution
│   ├── static/                   # Static assets & handbooks
│   ├── package.json              # Svelte 5, SvelteKit, dependencies
│   ├── svelte.config.js          # SvelteKit Vercel/Auto-adapter configuration
│   ├── vite.config.ts            # Vite bundler configuration
│   ├── tsconfig.json             # TypeScript compiler settings
│   ├── firebase.json             # Firebase Emulators & Cloud Rules mapping
│   ├── firestore.rules           # Cloud Firestore Security Rules
│   ├── storage.rules             # Firebase Cloud Storage Security Rules
│   └── .env.example              # Environment variables template for Frontend
│
├── backend/                      # Python FastAPI ML Microservice (Deploy to Render)
│   ├── api.py                    # FastAPI Service Entry Point (Port 8000 / $PORT)
│   ├── recommendations.py        # Diagnostic skill gap analysis & recommendation engine
│   ├── train_model.py            # Model training & benchmarking pipeline
│   ├── requirements.txt          # Python dependencies (FastAPI, uvicorn, scikit-learn, etc.)
│   ├── data/                     # Training dataset & synthetic generator
│   ├── models/                   # Serialized Random Forest model & evaluation metrics
│   └── .env.example              # Environment variables template for Backend
│
├── scripts/                      # Database migrations, security audit suite & test utilities
├── .gitignore                    # Global multi-tier gitignore
├── README.md                     # Master project guide & deployment instructions
└── PROJECT_DOCUMENTATION.md      # Full technical specification & security verification report
```

---

## 2. Local Development Setup

### 2.1 Backend (Python FastAPI)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment (recommended):**
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   Create `.env` inside `backend/`:
   ```env
   PORT=8000
   HOST=127.0.0.1
   ML_SERVICE_SECRET=your-internal-service-secret
   FRONTEND_URL=http://localhost:5173
   ```

5. **Start the development server:**
   ```bash
   python -m uvicorn api:app --host 127.0.0.1 --port 8000 --reload
   ```
   The backend API will be available at `http://127.0.0.1:8000`. Test `/health` or `/model-metrics`.

### 2.2 Frontend (SvelteKit)

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   Copy `.env.example` to `.env` inside `frontend/`:
   ```bash
   cp .env.example .env
   ```
   Ensure `FASTAPI_URL=http://127.0.0.1:8000` and `ML_SERVICE_SECRET` matches the backend secret.

4. **Type-check the codebase:**
   ```bash
   npm run check
   ```

5. **Start the SvelteKit development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 3. Deployment Instructions

### 3.1 Deploying Backend to Render

1. **Create a New Web Service** on [Render Dashboard](https://dashboard.render.com).
2. Connect your Git repository.
3. Configure service settings:
   - **Name**: `placetrack-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn api:app --host 0.0.0.0 --port $PORT`
4. **Set Environment Variables in Render**:
   - `ML_SERVICE_SECRET`: Strong secret key (e.g. `placetrack-secret-...`).
   - `FRONTEND_URL`: URL of your deployed Vercel frontend (e.g. `https://placetrack.vercel.app`).
5. Click **Deploy Web Service**.
6. Note down your Render backend URL (e.g. `https://placetrack-backend.onrender.com`). Verify by visiting `https://placetrack-backend.onrender.com/health`.

### 3.2 Deploying Frontend to Vercel

1. **Import Project** on [Vercel Dashboard](https://vercel.com).
2. Connect your Git repository.
3. In project settings, configure:
   - **Framework Preset**: `SvelteKit`
   - **Root Directory**: Set to `frontend` (Click "Edit" and choose `frontend`).
   - **Build Command**: `vite build` (Default)
   - **Output Directory**: `.svelte-kit` (Default)
4. **Set Environment Variables in Vercel**:
   - `FASTAPI_URL`: Your deployed Render backend URL (e.g. `https://placetrack-backend.onrender.com`).
   - `ML_SERVICE_SECRET`: Exact matching key configured in Render.
   - `SESSION_SECRET`: Random 32+ character string for HMAC-SHA256 cookie signing.
   - `FIREBASE_PROJECT_ID`: Your Google Cloud / Firebase project ID.
   - `FIREBASE_CLIENT_EMAIL`: Service account email.
   - `FIREBASE_PRIVATE_KEY`: Service account private key (with literal `\n` or multiline).
   - `PUBLIC_FIREBASE_STORAGE_BUCKET`: `your-project-id.firebasestorage.app`.
   - `GEMINI_API_KEY`: Google Gemini API Key for AI features.
   - `DATABASE_URL`: PostgreSQL connection string (if using PostgreSQL fallback).
5. Click **Deploy**. Vercel will build and deploy the full-stack SvelteKit application.

---

## 4. Frontend–Backend Communication

The SvelteKit application and the Python ML service communicate securely over HTTP:

1. **Internal Key Authentication**:
   All inference requests to `/predict` require the `X-Internal-Service-Key` header matching `ML_SERVICE_SECRET`. Requests without this key are rejected with `401 Unauthorized` / `403 Forbidden`.
2. **Server-Side Proxy**:
   The frontend browser client never calls Render directly. The browser calls SvelteKit's `/api/ai/predict-readiness`, and SvelteKit's server endpoint communicates with Render's `/predict`. This guarantees that internal secrets and model endpoints are never exposed to client browsers.
3. **CORS Hardening**:
   The FastAPI backend uses strict CORS rules allowing only the configured `FRONTEND_URL` and `*.vercel.app` domains, forbidding open wildcard origins with credentials.

---

## 5. Verification Commands

Run these verification commands after setup or updates:

```bash
# 1. Frontend: Check Svelte & TypeScript health (0 errors)
cd frontend
npm run check

# 2. Frontend: Verify production build bundle
npm run build

# 3. Backend: Test FastAPI endpoints with internal key
cd ..
node scripts/test_fastapi.mjs
```
