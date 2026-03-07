# SkillsMirage 🇮🇳

> **Know your AI displacement risk. Get a personalised reskilling plan.**

SkillsMirage is a full-stack web application built for Indian workers to understand their risk of AI-driven job displacement and receive actionable, week-by-week reskilling paths using free government courses (NPTEL, SWAYAM, PMKVY).

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://hack-mind-project.vercel.app)
[![Backend API](https://img.shields.io/badge/Backend%20API-Render-46E3B7?style=for-the-badge&logo=render)](https://skillsmirage-backend.onrender.com)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb)](https://cloud.mongodb.com)

---

## 📌 Table of Contents

- [Live Deployment](#-live-deployment)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started Locally](#-getting-started-locally)
- [Environment Variables](#-environment-variables)
- [Deployment Guide](#-deployment-guide)
- [API Reference](#-api-reference)
- [How It Works](#-how-it-works)
- [Target Cities & Roles](#-target-cities--roles)
- [Common Issues & Fixes](#-common-issues--fixes)

---

## 🌐 Live Deployment

| Service | Platform | URL |
|---|---|---|
| **Frontend** | Vercel | https://hack-mind-project.vercel.app |
| **Backend API** | Render | https://skillsmirage-backend.onrender.com |
| **Database** | MongoDB Atlas | Cloud-hosted (private) |

> ⚠️ The backend is hosted on Render's **free tier** — the first request after inactivity may take **30–50 seconds** to wake up. Subsequent requests are fast.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔴 **AI Risk Score** | Computes a 0–100 displacement risk score based on live hiring trends, AI tool mentions in job descriptions, and skill gaps |
| 📊 **Live Job Market Data** | Scrapes real job postings via JSearch API (RapidAPI) across 20 Indian cities and 10 roles daily |
| 🗺️ **Reskilling Path Generator** | Week-by-week plan with free NPTEL, SWAYAM & PMKVY courses matched to your skill gaps |
| 🤖 **AI Career Advisor Chatbot** | Bilingual (English & Hindi) chatbot powered by Groq (llama-3.3-70b) with live job market context |
| 📈 **L1 Market Dashboard** | 3-tab analytics dashboard — Hiring Trends, Rising/Declining Skills, AI Vulnerability Index |
| 🔐 **Auth System** | JWT-based register/login with protected routes |
| 🌐 **Bilingual UI** | Full English and Hindi support in chatbot responses |
| 🛡️ **Admin Panel** | Trigger job scraper runs with city/role selection and live activity log |

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** (Python 3.11) — REST API framework
- **Motor** — Async MongoDB driver
- **MongoDB Atlas** — Cloud database
- **Groq API** — LLM provider (llama-3.3-70b-versatile) — free, no card required
- **JSearch API** (RapidAPI) — Real job postings data
- **JWT** — Authentication tokens
- **httpx** — Async HTTP client
- **python-dotenv** — Environment config
- **passlib[bcrypt]** — Password hashing

### Frontend
- **React 18** — UI framework
- **React Router v6** — Client-side routing
- **Axios** — HTTP requests
- **Recharts** — Data visualization
- **Create React App** — Build tooling

### Infrastructure
- **Vercel** — Frontend hosting (CDN, auto-deploy)
- **Render** — Backend hosting (Python 3.11, free tier)
- **MongoDB Atlas** — Cloud database (free tier, M0)

---

## 📁 Project Structure

```
HackMindProject/
├── .python-version              # Pins Python 3.11.9 for Render
├── backend/
│   ├── core/
│   │   ├── database.py          # MongoDB connection (SSL-safe)
│   │   └── security.py          # JWT token creation & verification
│   ├── middleware/
│   │   └── auth.py              # Auth middleware / get_current_user
│   ├── models/
│   │   └── user.py              # User CRUD helpers
│   ├── routers/
│   │   ├── auth.py              # POST /api/auth/register, /login, /me
│   │   ├── users.py             # GET/PUT/DELETE /api/users
│   │   ├── l1.py                # L1 scraper & analytics endpoints
│   │   └── l2.py                # L2 worker intelligence endpoints
│   ├── schemas/
│   │   ├── user.py              # Pydantic request/response models
│   │   └── l2.py                # L2 schema models
│   ├── scraper/
│   │   └── job_scraper.py       # JSearch API scraper + seed data fallback
│   ├── services/
│   │   ├── chat_service.py      # Groq chatbot with L1 RAG context
│   │   ├── nlp_service.py       # Skill extraction from free text
│   │   ├── risk_service.py      # AI displacement risk score computation
│   │   └── reskill_service.py   # Week-by-week reskilling path generator
│   ├── main.py                  # FastAPI app entry point
│   └── requirements.txt
│
└── frontend/
    ├── public/
    ├── vercel.json              # Vercel routing config for React Router
    └── src/
        ├── components/
        │   ├── Navbar.js
        │   ├── l1/
        │   │   ├── AdminPanel.js
        │   │   ├── TrendsTab.js
        │   │   ├── SkillsTab.js
        │   │   └── VulnerabilityTab.js
        │   └── l2/
        │       ├── WorkerPage.js
        │       └── ChatbotModal.js
        ├── context/
        │   └── AuthContext.js
        ├── pages/
        │   ├── Home.js
        │   ├── Login.js
        │   ├── Register.js
        │   └── Dashboard.js
        ├── index.js             # axios baseURL configured here
        └── App.js
```

---

## 🚀 Getting Started Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Groq API key (free at [console.groq.com](https://console.groq.com))
- JSearch API key (free tier at [RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch))

### 1. Clone the Repository

```bash
git clone https://github.com/HetuKariya/HackMindProject.git
cd HackMindProject
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your actual keys

# Start the backend
python -m uvicorn main:app --reload --port 8000
```

You should see:
```
✅ MongoDB Connected successfully!
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 3. Frontend Setup

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start the frontend
npm start
```

The app opens at **http://localhost:3000**

> ⚠️ Both terminals must be running simultaneously.

---

## 🔑 Environment Variables

### Backend — create `backend/.env`

```env
# MongoDB Atlas connection string
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/mernapp?retryWrites=true&w=majority

# JWT secret — generate with: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=your_64_char_random_hex_string

# Environment
ENV=development

# JSearch API (RapidAPI) — free 500 req/month
JSEARCH_API_KEY=your_jsearch_key_here

# Groq API — FREE, 14,400 req/day, no credit card needed
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Gemini API — optional fallback (free tier)
GEMINI_API_KEY=AIzaSy_xxxxxxxxxxxxxxxxxxxx
```

### Frontend — create `frontend/.env` (for local dev only)

```env
REACT_APP_API_URL=http://localhost:8000
```

---

## ☁️ Deployment Guide

### Backend → Render

| Setting | Value |
|---|---|
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

**Environment Variables to add in Render dashboard:**

| Key | Value |
|---|---|
| `PYTHON_VERSION` | `3.11.9` |
| `MONGO_URI` | your Atlas connection string |
| `JWT_SECRET` | your secret key |
| `JSEARCH_API_KEY` | your RapidAPI key |
| `GROQ_API_KEY` | your Groq key |
| `GEMINI_API_KEY` | your Gemini key (optional) |
| `ENV` | `production` |
| `FRONTEND_URL` | your Vercel URL |

### Frontend → Vercel

| Setting | Value |
|---|---|
| **Root Directory** | `frontend` |
| **Framework** | Create React App |
| **Build Command** | `npm run build` |
| **Output Directory** | `build` |

**Environment Variables to add in Vercel dashboard:**

| Key | Value |
|---|---|
| `REACT_APP_API_URL` | `https://skillsmirage-backend.onrender.com` |
| `CI` | `false` |

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT token |
| GET | `/api/auth/me` | Get current user (auth required) |

### L1 — Job Market Intelligence
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/l1/scrape` | Trigger scraper run (background) |
| GET | `/api/l1/status` | Scraper status & last run info |
| GET | `/api/l1/trends` | Hiring trends by city/role over time |
| GET | `/api/l1/skills` | Rising & declining skills |
| GET | `/api/l1/vulnerability` | AI Vulnerability Index by city/role |
| GET | `/api/l1/jobs` | Raw job postings (paginated) |

### L2 — Worker Intelligence
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/l2/profile` | Create worker profile + extract skills |
| GET | `/api/l2/profile/:id` | Get a specific profile |
| GET | `/api/l2/profiles/me` | All profiles for logged-in user |
| POST | `/api/l2/profile/:id/score` | Compute AI displacement risk score |
| POST | `/api/l2/profile/:id/reskill` | Generate week-by-week reskilling path |
| POST | `/api/l2/chat` | Ask the AI career advisor chatbot |
| GET | `/api/l2/samples` | Load preloaded sample worker profiles |

---

## ⚙️ How It Works

### Layer 1 — Job Market Scraper

1. **Scraper** calls JSearch API for each city × role combination (20 cities × 10 roles)
2. Falls back to realistic **seed data** if API quota is exceeded
3. Data stored in MongoDB `job_posts` collection
4. **Aggregator** computes daily summaries per city+role in `aggregates` collection
5. Tracks: `posting_count`, `ai_tool_mention_rate`, `top_skills`, `remote_count`

### Layer 2 — Worker Intelligence

1. Worker submits their **job title, city, years of experience, and a free-text writeup**
2. **NLP service** extracts skills using regex against 40+ skill vocabulary items
3. **Risk service** computes a 0–100 score based on:
   - Hiring decline rate (L1 trend data)
   - AI tool mention rate in job descriptions
   - Skill gap vs. market demand
4. **Reskilling service** generates a week-by-week plan using NPTEL, SWAYAM & PMKVY links
5. **Chatbot** answers questions using live L1 evidence as context (RAG pattern) via Groq LLM

### Chatbot — Supported Question Types

1. "Why is my risk score so high?"
2. "What jobs are safer for someone like me?"
3. "Show me paths I can complete under 3 months"
4. "How many BPO jobs are available in Indore right now?" ← live L1 query
5. Full Hindi support — "मुझे क्या करना चाहिए?"

---

## 🏙️ Target Cities & Roles

**20 Cities:**
Bangalore, Mumbai, Delhi, Hyderabad, Pune, Chennai, Kolkata, Jaipur, Ahmedabad, Noida, Indore, Nagpur, Chandigarh, Bhopal, Lucknow, Kochi, Coimbatore, Surat, Vadodara, Patna

**10 Roles:**
Data Entry, BPO, Data Analyst, Software Engineer, Customer Support, Content Writer, HR Executive, Accountant, Sales Executive, Digital Marketing

---

## 🐛 Common Issues & Fixes

| Error | Fix |
|---|---|
| First request takes 30–50s | Render free tier sleeps after inactivity — wait for it to wake up |
| `CORS error` on frontend | Add `FRONTEND_URL` env var in Render with your exact Vercel URL |
| `Registration failed` | Check browser DevTools → Network tab for the exact error |
| `bad auth: authentication failed` | Wrong username/password in `MONGO_URI` |
| `SSL handshake failed` | Handled in `database.py` via `tlsAllowInvalidCertificates=True` |
| Build fails on Render | Add `PYTHON_VERSION=3.11.9` in Render environment variables |
| React Router 404 on refresh | Ensure `frontend/vercel.json` exists with rewrite rules |
| `⚠️ No AI API key` | Add `GROQ_API_KEY=gsk_...` to Render environment variables |

---

## 📦 Backend Dependencies

```
fastapi==0.115.0
uvicorn[standard]==0.29.0
motor==3.6.0
pymongo==4.9.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.1.3
python-dotenv==1.0.1
pydantic[email]==2.10.6
email-validator==2.1.1
httpx==0.27.0
python-multipart==0.0.9
beautifulsoup4==4.12.3
lxml==5.3.1
```

---

## 👥 Built For

Indian blue-collar and white-collar workers in roles most vulnerable to AI automation — BPO agents, data entry operators, customer support executives, and more — giving them the tools to understand their risk and take action.

---

*Built with ❤️ for HackMind Hackathon 2026*