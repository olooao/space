# ASRIDE - Autonomous Space Risk & Intelligent Defense Engine

**Real-time satellite collision avoidance, orbital debris tracking, and Kessler syndrome cascade simulation platform.**

ASRIDE is a full-stack orbital defense system that monitors 5,000+ tracked objects in Low Earth Orbit, computes collision probabilities in real-time, generates minimum-fuel evasion maneuvers using Clohessy-Wiltshire orbital mechanics, and simulates catastrophic debris cascades using NASA's Standard Breakup Model (SBAM v4.0).

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Live Demo Pages](#live-demo-pages)
- [Screenshots](#screenshots)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [System Data Flow & Internal Design](#system-data-flow--internal-design)
  - [End-to-End Data Pipeline](#end-to-end-data-pipeline)
  - [Sequence Diagrams](#sequence-diagrams)
  - [State Machines](#state-machines)
  - [Frontend Component Architecture](#frontend-component-architecture)
  - [Backend Class Diagram](#backend-class-diagram)
  - [Data Models & Schemas](#data-models--schemas)
  - [WebSocket Message Protocol](#websocket-message-protocol)
  - [Zustand Store Architecture](#zustand-store-architecture)
  - [Rendering Pipeline](#rendering-pipeline)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. Running the Project](#4-running-the-project)
  - [5. Docker Deployment (Microservices)](#5-docker-deployment-microservices)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [TLE Service](#tle-service-endpoints)
  - [Orbital Service](#orbital-service-endpoints)
  - [Collision Service](#collision-service-endpoints)
  - [Kessler Service](#kessler-service-endpoints)
  - [WebSocket Streams](#websocket-streams)
- [Frontend Pages & Features](#frontend-pages--features)
- [Scientific Models & Algorithms](#scientific-models--algorithms)
  - [SGP4/SDP4 Propagation](#1-sgp4sdp4-orbital-propagation)
  - [Conjunction Probability](#2-conjunction-probability-foster-baker-model)
  - [CW Evasion Optimization](#3-clohessy-wiltshire-evasion-optimization)
  - [NASA SBAM Breakup Model](#4-nasa-standard-breakup-model-sbam-v40)
  - [J2 Perturbation & Drag](#5-j2-perturbation--atmospheric-drag-model)
- [3D Globe Visualization](#3d-globe-visualization)
- [Performance Optimizations](#performance-optimizations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [References & Citations](#references--citations)
- [License](#license)

---

## The Problem

Low Earth Orbit is becoming dangerously crowded. There are over **36,500 tracked objects** larger than 10 cm orbiting Earth, traveling at speeds up to **28,000 km/h**. A collision between just two of these objects can generate thousands of debris fragments, each capable of destroying another satellite - triggering an exponential chain reaction known as **Kessler Syndrome**.

Key statistics (ESA Space Debris Office, 2024):
- **36,500+** tracked objects (> 10 cm)
- **1,000,000+** estimated objects between 1-10 cm
- **130,000,000+** particles smaller than 1 cm
- **Average collision speed:** 10 km/s (36,000 km/h)
- **ISS performs ~3 collision avoidance maneuvers per year**
- **2024 conjunction warnings exceeded 2,500/week** across all operators

If left unchecked, cascading collisions could render critical orbital altitudes (400-1000 km) unusable for generations.

## The Solution

ASRIDE provides three layers of orbital defense:

1. **Detect** - Real-time conjunction screening across 5,000+ objects using SGP4-propagated trajectories and the Foster-Baker collision probability model. Identifies close approaches within configurable thresholds and ranks them by risk.

2. **Evade** - When a high-risk conjunction is detected, ASRIDE computes optimal evasion maneuvers using the Clohessy-Wiltshire (CW) linearized relative motion model. The optimizer finds the minimum delta-V burn that achieves a safe miss distance, minimizing fuel expenditure while ensuring collision avoidance.

3. **Simulate** - ASRIDE includes a full Kessler cascade simulator powered by NASA's Standard Breakup Model (SBAM v4.0, Johnson 2001). It models fragment generation, propagation with J2 perturbations and atmospheric drag, secondary collision detection, and computes Hohmann deorbit solutions to clear the most contaminated orbital zones.

---

## Live Demo Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with project overview |
| `/dashboard` | Main operational view - full-screen globe with floating stats, alerts, and telemetry |
| `/live` | Real-time satellite position streaming via WebSocket |
| `/analyze` | Interactive conjunction analysis - select two satellites, compute collision risk and evasion |
| `/demo` | **Cinematic guided demonstration** - 8-chapter walkthrough of the Kessler problem and ASRIDE's solution |
| `/kessler` | **Kessler Cascade Simulator** - full-screen immersive cascade simulation with live debris visualization |
| `/settings` | Application configuration (rotation, performance, thresholds) |

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.12+ | Runtime |
| **FastAPI** | 0.100+ | REST API framework with async support |
| **Uvicorn** | 0.20+ | ASGI server |
| **Skyfield** | 1.45+ | High-precision astronomical computations |
| **SGP4** | 2.13+ | Satellite orbit propagation from TLE data |
| **NumPy** | 1.24+ | Numerical computing for orbital mechanics |
| **SciPy** | 1.11+ | L-BFGS-B optimization for evasion maneuvers |
| **Pydantic** | 2.0+ | Data validation and serialization |
| **SQLAlchemy** | 2.0+ | ORM for risk audit logging |
| **SQLite** | (built-in) | Embedded database for audit trail |
| **Redis** | 7 (Alpine) | TLE caching (Docker microservices mode) |
| **Nginx** | Latest | API gateway and WebSocket reverse proxy |
| **Docker** | Latest | Containerized microservice deployment |

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **Three.js** | 0.169.0 | WebGL 3D rendering engine |
| **React Three Fiber** | 8.17.0 | Declarative Three.js for React |
| **@react-three/drei** | 9.113.0 | Pre-built 3D helpers (Stars, Lines, Html overlays) |
| **Tailwind CSS** | 4.1.18 | Utility-first CSS framework |
| **Framer Motion** | 12.34.5 | Physics-based animations |
| **Zustand** | 5.0.0 | Lightweight state management |
| **React Router DOM** | 7.13.0 | Client-side routing |
| **Axios** | 1.7.0 | HTTP client for API calls |
| **D3.js** | 7.9.0 | Data-driven visualizations |
| **Recharts** | 2.13.0 | Chart components |
| **Lucide React** | 0.563.0 | Icon library |
| **Vite** | 5.4.10 | Build tool with HMR |

---

## Architecture Overview

ASRIDE can run in two modes:

### Development Mode (Monolith)

A single FastAPI process (`backend/main.py`) serves all API routes on port 8000. This is the simplest way to run the project locally. It loads TLE data directly from local `.txt` files at startup and handles all endpoints (TLE, orbital, collision, kessler) in a single process.

```
                    +-------------------+
                    |   Frontend (Vite) |
                    |   localhost:5173   |
                    +--------+----------+
                             |
                    REST + WebSocket
                             |
                    +--------v----------+
                    | Monolith (FastAPI) |
                    |   localhost:8000   |
                    |                   |
                    |  /api/tle/*       |
                    |  /api/orbital/*   |
                    |  /api/collision/* |
                    |  /api/kessler/*   |
                    |  /ws/*            |
                    +---------+---------+
                              |
                    +---------v---------+
                    |   SQLite + TLE    |
                    |   Local Files     |
                    +-------------------+
```

### Production Mode (Docker Microservices)

Six independent services behind an Nginx reverse proxy, with Redis for distributed caching:

```
                    +-------------------+
                    |   Frontend (CDN)  |
                    +--------+----------+
                             |
                    +--------v----------+
                    |   Nginx Gateway   |
                    |     Port 8000     |
                    +---+-----+----+---+
                        |     |    |
          +-------------+  +--+--+  +-------------+
          |                |     |                 |
+---------v---+  +---------v-+  +v---------+  +---v---------+
| TLE Service |  | Orbital   |  | Collision|  | Kessler     |
| Port 8001   |  | Service   |  | Service  |  | Service     |
|             |  | Port 8002 |  | Port 8003|  | Port 8004   |
+------+------+  +-----------+  +----------+  +------+------+
       |                                              |
       +-------------------+   +-----------------------+
                           |   |
                    +------v---v------+    +-------------+
                    |     Redis       |    | Events Svc  |
                    |   Port 6379     |    | Port 8005   |
                    +-----------------+    | (WebSocket) |
                                           +-------------+
```

---

## Project Structure

```
space-risk-mvp/
|
+-- backend/
|   +-- main.py                          # Monolithic FastAPI server (dev mode)
|   +-- requirements.txt                 # Python dependencies
|   +-- space_risk.db                    # SQLite audit database
|   +-- science.txt                      # TLE data: 145+ scientific satellites
|   +-- stations.txt                     # TLE data: 100+ space stations & crewed vehicles
|   +-- weather.txt                      # TLE data: 70+ weather satellites
|   |
|   +-- services/
|   |   +-- tle_service/                 # Microservice: TLE fetching & Redis caching
|   |   |   +-- main.py
|   |   |   +-- app/
|   |   |       +-- tle_fetcher.py       # Async CelesTrak TLE download
|   |   |       +-- scheduler.py         # Periodic refresh (4-hour cycle)
|   |   |       +-- router.py            # API routes
|   |   |
|   |   +-- orbital_service/             # Microservice: SGP4 propagation
|   |   |   +-- main.py
|   |   |   +-- app/
|   |   |       +-- propagator.py        # Skyfield-based position/velocity
|   |   |       +-- router.py
|   |   |
|   |   +-- collision_service/           # Microservice: Conjunction analysis & evasion
|   |   |   +-- main.py
|   |   |   +-- app/
|   |   |       +-- conjunction.py       # TCA (Time of Closest Approach) computation
|   |   |       +-- probability.py       # Foster-Baker collision probability
|   |   |       +-- evasion_optimizer.py  # CW relative motion + L-BFGS-B optimization
|   |   |       +-- router.py
|   |   |
|   |   +-- kessler_service/             # Microservice: Cascade simulation engine
|   |   |   +-- main.py
|   |   |   +-- app/
|   |   |       +-- cascade_engine.py    # J2+drag propagation, conjunction screening
|   |   |       +-- breakup_model.py     # NASA SBAM v4.0 fragment generation
|   |   |       +-- router.py
|   |   |
|   |   +-- events_service/              # Microservice: WebSocket streaming hub
|   |       +-- main.py
|   |       +-- app/
|   |           +-- ws_manager.py        # Connection lifecycle management
|   |           +-- router.py            # WS endpoints (positions, kessler, alerts)
|   |
|   +-- shared/
|       +-- models.py                    # Shared Pydantic models
|       +-- redis_client.py              # Redis connection helper
|
+-- frontend/
|   +-- package.json                     # Node.js dependencies
|   +-- vite.config.js                   # Vite build configuration with code splitting
|   +-- postcss.config.js
|   +-- tailwind.config.js
|   +-- vercel.json                      # Vercel deployment config
|   |
|   +-- src/
|       +-- main.jsx                     # React entry point (StrictMode)
|       +-- App.jsx                      # HashRouter with all routes
|       +-- index.css                    # Tailwind + custom design system (glass, animations)
|       |
|       +-- components/
|       |   +-- AppLayout.jsx            # Page layout wrapper
|       |   +-- LeftNav.jsx              # Side navigation with route links
|       |   +-- Navbar.jsx               # Floating nav with constellation selector
|       |   +-- TopStatusBar.jsx         # Real-time telemetry readout
|       |   +-- BottomTelemetryBar.jsx   # Additional metrics bar
|       |   +-- RightControlPanel.jsx    # Visualization layer toggles
|       |   +-- HeroReveal.jsx           # Landing page animation
|       |   |
|       |   +-- Globe3D/                 # Three.js 3D Earth visualization
|       |       +-- index.jsx            # Canvas, error boundary, context loss handling
|       |       +-- Earth.jsx            # Custom GLSL shader (day/night + city lights)
|       |       +-- Atmosphere.jsx       # Fresnel edge glow
|       |       +-- GlobeGrid.jsx        # Lat/lon coordinate lines + radar sweep
|       |       +-- Satellites.jsx       # InstancedMesh (500+ objects, type-colored)
|       |       +-- OrbitalPaths.jsx     # Animated dashed trajectories
|       |       +-- GroundTracks.jsx     # Surface-projected orbit lines
|       |       +-- CollisionArcs.jsx    # Conjunction warning arcs (pulsing red)
|       |       +-- EvasionArcs.jsx      # Maneuver arcs (red doom + green evasion)
|       |       +-- SelectedMarker.jsx   # Billboard highlight rings
|       |       +-- DebrisField.jsx      # GPU Points particle cloud (generation-colored)
|       |       +-- ExplosionEffect.jsx  # Collision explosion particles
|       |       +-- utils.js             # lat/lon/alt to Vector3 conversion
|       |
|       +-- pages/
|       |   +-- Landing.jsx             # / - Hero reveal + project overview
|       |   +-- Dashboard.jsx           # /dashboard - Main operational globe
|       |   +-- LiveMonitor.jsx         # /live - Real-time satellite streaming
|       |   +-- MissionControl.jsx      # /analyze - Conjunction analysis tool
|       |   +-- MissionDemo.jsx         # /demo - 8-chapter cinematic walkthrough
|       |   +-- KesslerSimulator.jsx    # /kessler - Full-screen cascade simulator
|       |   +-- Settings.jsx            # /settings - App configuration
|       |
|       +-- hooks/
|       |   +-- useKessler.js           # WebSocket + REST for cascade simulation
|       |   +-- useSatellites.js        # Live satellite position streaming
|       |   +-- useWebSocket.js         # Generic reconnecting WebSocket
|       |
|       +-- store/
|       |   +-- appStore.js             # Zustand global state (satellites, fragments, alerts, settings)
|       |
|       +-- config/
|       |   +-- api.js                  # API endpoint URL mappings
|       |
|       +-- services/
|       |   +-- apiClient.js            # Axios HTTP client wrapper
|       |   +-- supabase.js             # Supabase client (optional)
|       |
|       +-- data/
|           +-- satellites.js           # Mock satellite database (30+ objects)
|           +-- world-110m.json         # TopoJSON world map geometry
|
+-- nginx/
|   +-- nginx.conf                      # Reverse proxy routing + rate limiting
|   +-- Dockerfile
|
+-- docker-compose.yml                  # 7 containers (Redis + 5 services + Nginx)
+-- .env.example                        # Environment variable template
+-- .gitignore
```

---

## Prerequisites

Before setting up ASRIDE, ensure you have the following installed:

| Requirement | Minimum Version | Check Command |
|-------------|-----------------|---------------|
| **Python** | 3.10+ | `python3 --version` |
| **Node.js** | 18.0+ | `node -v` |
| **npm** | 9.0+ | `npm -v` |
| **Git** | 2.0+ | `git --version` |
| **Docker** (optional) | 20.0+ | `docker --version` |
| **Docker Compose** (optional) | 2.0+ | `docker compose version` |

**Hardware requirements:**
- Any GPU with WebGL 1.0+ support (integrated GPUs like Intel HD 530 work fine)
- 4GB RAM minimum (8GB recommended for running backend + frontend simultaneously)
- Internet connection required at startup (the backend fetches live TLE data from CelesTrak)

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/olooao/space-risk-mvp.git
cd space-risk-mvp
```

### 2. Backend Setup

Create and activate a Python virtual environment, then install dependencies:

```bash
# Navigate to backend
cd backend

# Create virtual environment
python3 -m venv .venv

# Activate it
# Linux / macOS:
source .venv/bin/activate
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (CMD):
.venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt

# Also install scipy (required for evasion optimizer)
pip install scipy
```

**Verify installation:**

```bash
python -c "import fastapi, skyfield, sgp4, numpy, scipy; print('All dependencies OK')"
```

### 3. Frontend Setup

```bash
# Navigate to frontend (from project root)
cd frontend

# Install Node.js dependencies
npm install
```

**Verify installation:**

```bash
npx vite --version
```

### 4. Running the Project

You need **two terminal windows** - one for the backend, one for the frontend.

**Terminal 1 - Backend:**

```bash
cd space-risk-mvp/backend

# Activate virtual environment
source .venv/bin/activate        # Linux/macOS
# .venv\Scripts\activate.bat     # Windows

# Start the backend server
python main.py
```

The backend will:
1. Fetch live TLE data from CelesTrak (~5,000 satellites)
2. Start the FastAPI server on `http://localhost:8000`
3. Initialize the Kessler cascade engine
4. Open WebSocket endpoints for real-time streaming

You should see output like:

```
INFO:     Loaded 5,247 satellites from CelesTrak
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Terminal 2 - Frontend:**

```bash
cd space-risk-mvp/frontend

# Start the Vite development server
npm run dev
```

The frontend will start on `http://localhost:5173/space/`.

**Open your browser and navigate to:**

```
http://localhost:5173/space/
```

### 5. Docker Deployment (Microservices)

For production or full microservice architecture:

```bash
# From project root
cd space-risk-mvp

# Create .env file from template
cp .env.example .env
# Edit .env with your Supabase credentials (optional) and secrets

# Build and start all services
docker compose up --build
```

This starts 7 containers:
- **Redis** (port 6379) - TLE data cache
- **TLE Service** (port 8001) - CelesTrak TLE fetching with 4-hour auto-refresh
- **Orbital Service** (port 8002) - SGP4 propagation, trajectory generation
- **Collision Service** (port 8003) - Conjunction analysis, evasion maneuvers
- **Kessler Service** (port 8004) - Cascade simulation engine
- **Events Service** (port 8005) - WebSocket streaming hub
- **Nginx Gateway** (port 8000) - Reverse proxy routing all `/api/*` and `/ws/*`

After all services are healthy, the API is accessible at `http://localhost:8000`.

**Stop all services:**

```bash
docker compose down
```

**Remove all data (including Redis cache):**

```bash
docker compose down -v
```

---

## Environment Variables

Create a `.env` file in the project root (or copy from `.env.example`):

```env
# Supabase (optional - for persistent conjunction alert storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Redis (Docker mode only)
REDIS_URL=redis://redis:6379

# Security
SECRET_KEY=change-me-in-production

# TLE refresh interval in hours (Docker mode only)
TLE_REFRESH_HOURS=4
```

**Frontend environment variables** (optional, create `frontend/.env`):

```env
# Override API base URL (defaults to http://localhost:8000/api)
VITE_API_BASE_URL=http://localhost:8000/api

# Override WebSocket base URL (defaults to ws://localhost:8000)
VITE_WS_BASE_URL=ws://localhost:8000
```

---

## API Reference

All endpoints are prefixed with `/api/` and accessible on port 8000.

### TLE Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tle/health` | Health check |
| `GET` | `/api/tle/satellites` | List all tracked satellites with count |

### Orbital Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/orbital/health` | Health check |
| `GET` | `/api/orbital/satellites` | List all satellites |
| `GET` | `/api/orbital/satellite/{name}/position` | Current position (ECI + geodetic). Add `?trajectory=true` for 90-min propagated path |
| `GET` | `/api/orbital/constellation/{name}` | All satellites matching name (e.g., `STARLINK`). Optional `?limit=500` |

**Position Response Example:**

```json
{
  "name": "ISS (ZARYA)",
  "lat": 51.64,
  "lon": -120.53,
  "alt_km": 408.2,
  "x_km": 3456.7,
  "y_km": -2345.1,
  "z_km": 5234.8,
  "vx_km_s": -1.23,
  "vy_km_s": 7.45,
  "vz_km_s": 0.89,
  "speed_km_s": 7.66,
  "timestamp": "2026-03-04T15:30:00Z",
  "path": [[-120.5, 51.6, 408.2], ...]
}
```

### Collision Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/collision/health` | Health check |
| `GET` | `/api/collision/feed` | Simulated conjunction alert feed (5 events) |
| `GET` | `/api/collision/evade?sat1=ISS&sat2=NOAA+19` | Compute evasion maneuver for a conjunction pair |
| `POST` | `/api/collision/analyze` | Full conjunction analysis between two objects |

**POST /api/collision/analyze Request:**

```json
{
  "obj1_name": "ISS (ZARYA)",
  "obj2_name": "STARLINK-1007"
}
```

**Conjunction Analysis Response:**

```json
{
  "obj1": { "name": "ISS (ZARYA)", "lat": 51.6, "lon": -120.5, "alt_km": 408, "path": [...] },
  "obj2": { "name": "STARLINK-1007", "lat": 45.2, "lon": 80.3, "alt_km": 550, "path": [...] },
  "miss_distance_km": 12.345,
  "relative_velocity_kms": 10.2,
  "Pc": 0.001234,
  "Pc_percent": 0.1234,
  "risk_color": "YELLOW",
  "risk_label": "MODERATE RISK",
  "tca_timestamp": "2026-03-05T14:32:10Z"
}
```

**Evasion Maneuver Response:**

```json
{
  "delta_v_m_s": 0.45,
  "fuel_cost_kg": 0.12,
  "burn_duration_s": 15.3,
  "burn_point": { "lat": 45.2, "lon": 80.3, "alt_km": 408 },
  "original_trajectory": [{ "lat": ..., "lon": ..., "alt_km": ... }, ...],
  "evasion_trajectory": [{ "lat": ..., "lon": ..., "alt_km": ... }, ...],
  "magnitude_m_s": 0.45
}
```

### Kessler Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/kessler/health` | Health check |
| `POST` | `/api/kessler/trigger` | Start cascade simulation |
| `POST` | `/api/kessler/stop` | Stop running simulation |
| `POST` | `/api/kessler/reset` | Reset all state |
| `GET` | `/api/kessler/status` | Current cascade statistics |
| `GET` | `/api/kessler/fragments?limit=2000` | Active debris positions for 3D rendering |
| `GET` | `/api/kessler/events?limit=50` | Recent cascade collision events |
| `GET` | `/api/kessler/solutions` | Hohmann deorbit countermeasures |

**POST /api/kessler/trigger Request:**

```json
{
  "target": "ISS (ZARYA)",
  "projectile_mass_kg": 950,
  "relative_velocity_km_s": 10.5
}
```

**Cascade Status Response:**

```json
{
  "simulation_id": "a1b2c3d4",
  "is_running": true,
  "total_fragments": 1205,
  "active_fragments": 1180,
  "decayed_fragments": 25,
  "total_cascade_events": 8,
  "max_generation": 3,
  "elapsed_steps": 120,
  "zone_density": {
    "200-300km": 45,
    "300-400km": 380,
    "400-500km": 520,
    "500-600km": 180,
    "600-700km": 80
  }
}
```

**Deorbit Solution Response:**

```json
[
  {
    "zone": "400-500km",
    "priority": "CRITICAL",
    "fragment_count": 520,
    "delta_v_m_s": 85.3,
    "target_altitude_km": 200,
    "estimated_clearance_years": 2.5
  }
]
```

### WebSocket Streams

| Endpoint | Update Rate | Description |
|----------|-------------|-------------|
| `ws://localhost:8000/ws/positions` | 2 seconds | Live satellite positions (ISS focus) |
| `ws://localhost:8000/ws/kessler` | 1 second | Cascade stats + fragment positions |
| `ws://localhost:8000/ws/alerts` | 5 seconds | Conjunction alert feed |

**Kessler WebSocket Message Format:**

```json
{
  "type": "kessler_update",
  "stats": {
    "total_fragments": 45000,
    "active_fragments": 34000,
    "total_cascade_events": 150,
    "max_generation": 5,
    "zone_density": { ... },
    "elapsed_steps": 720
  },
  "fragment_positions": [
    { "id": "frag-123", "lat": 45.2, "lon": 120.1, "alt_km": 350, "generation": 2 }
  ]
}
```

---

## Frontend Pages & Features

### Dashboard (`/dashboard`)
The main operational view. A full-viewport 3D globe with:
- Floating stat cards (satellite count, active alerts, cascade status)
- Conjunction alert feed with risk-colored cards
- Constellation selector (Starlink, GPS, Galileo, OneWeb, etc.)
- Bottom telemetry bar with real-time position data
- Toggle controls for orbital paths, grid, ground tracks, atmosphere

### Demo (`/demo`)
An 8-chapter cinematic walkthrough that tells the story of the Kessler problem and ASRIDE's solution:

1. **INTRO** - Title card with animated gradient text
2. **THE PROBLEM** - Animated statistics counting up (36,500 objects, 1M+ fragments, etc.)
3. **CONJUNCTION DETECTED** - A TCA countdown timer running in real-time, risk gauge filling
4. **CATASTROPHIC IMPACT** - Screen shake, impact flash, debris counter exploding upward
5. **REWIND** - Scan-line glitch effect, "But what if..." reset
6. **AUTONOMOUS DETECTION** - ASRIDE detects the same conjunction before impact
7. **PRECISION EVASION** - CW evasion maneuver computed, collision avoided
8. **THE ANSWER** - Three pillars (Detect, Evade, Simulate) with CTA

Features: typewriter narration, keyboard shortcuts (Space/Arrows/R), auto-play with manual override, color vignettes per chapter.

### Kessler Simulator (`/kessler`)
A full-screen immersive cascade simulation experience:

- **Full-viewport globe** with debris particle cloud
- **Floating glass config panel** (bottom-left) with target selector, mass/velocity sliders, impact energy calculator
- **Dramatic arming sequence** - 3-second countdown with rotating target reticle and scan lines
- **Impact flash** - orange radial gradient burst on collision
- **Dynamic red vignette** - intensity scales with fragment count
- **Live stats panel** (top-right) - big fragment counter, cascade metrics, altitude density bars
- **Live event feed** (bottom-right) - scrolling collision events with generation tracking
- **Solutions overlay** - full-screen modal with Hohmann deorbit solution cards
- **Keyboard shortcuts** - R (reset), S (solutions), ESC (cancel)

### Analyze (`/analyze`)
Interactive conjunction analysis tool:
- Search any satellite pair from 5,000+ objects
- Compute miss distance, relative velocity, collision probability
- Generate evasion maneuvers with delta-V and fuel cost
- Visualize original vs. evasion trajectory arcs on the globe

---

## Scientific Models & Algorithms

### 1. SGP4/SDP4 Orbital Propagation

**Library:** Skyfield + SGP4
**Input:** Two-Line Element sets (TLE) from CelesTrak
**Output:** Position and velocity vectors in ECI (Earth-Centered Inertial) frame

The SGP4 (Simplified General Perturbations 4) model propagates satellite positions forward in time from published TLE data. It accounts for:
- Earth's oblateness (J2, J3, J4 zonal harmonics)
- Atmospheric drag (simplified density model)
- Solar and lunar gravitational perturbations (SDP4 for deep-space objects)

**Accuracy:** ~1 km position error for LEO objects over 24 hours.

### 2. Conjunction Probability (Foster-Baker Model)

**Reference:** Foster & Estes, "A Parametric Analysis of Orbital Debris Collision Probability and Maneuver Rate for Space Vehicles," NASA/JSC-25898

Collision probability is computed from the miss distance between two objects:

```
Pc = f(miss_distance, combined_radius, relative_velocity, position_covariance)
```

**Risk Classification:**
| Pc Threshold | Category | Color | Action |
|-------------|----------|-------|--------|
| > 1e-4 | CRITICAL | RED | Immediate evasion required |
| 1e-5 to 1e-4 | MODERATE | YELLOW | Monitor closely, prepare maneuver |
| < 1e-5 | LOW | GREEN | Normal operations |

### 3. Clohessy-Wiltshire Evasion Optimization

**Reference:** Clohessy & Wiltshire, "Terminal Guidance System for Satellite Rendezvous," Journal of the Aerospace Sciences, 1960

The CW equations describe linearized relative motion between two objects in nearby circular orbits. ASRIDE uses this framework to compute minimum-fuel evasion maneuvers:

**State Transition Matrix (6x6):**

The relative position and velocity evolve as:

```
[r(t)]     [Phi_rr  Phi_rv] [r(0)]
[v(t)]  =  [Phi_vr  Phi_vv] [v(0)]
```

Where the Phi matrices encode the CW dynamics:
- `Phi_rr(3x3)` maps initial position to final position
- `Phi_rv(3x3)` maps initial velocity (delta-V) to final position

**Minimum-Norm Solution:**

```
delta_V = Phi_rv^T * (Phi_rv * Phi_rv^T)^(-1) * target_offset
```

This yields the smallest possible delta-V vector that achieves the desired miss distance increase.

**Refinement:** The analytical solution is refined using SciPy's L-BFGS-B optimizer to account for non-linearities and constraints.

**Reference Frame:** RIC (Radial / In-track / Cross-track) aligned with the chaser satellite's orbital frame.

### 4. NASA Standard Breakup Model (SBAM v4.0)

**Reference:** Johnson, N.L., et al., "NASA's New Breakup Model of EVOLVE 4.0," Advances in Space Research, 2001

The SBAM models how a collision generates debris fragments:

**Fragment Count:**

```
N(Lc) = 0.1 * M_total^0.75 * Lc^(-1.71)
```

Where:
- `N(Lc)` = number of fragments larger than characteristic length `Lc`
- `M_total` = total mass involved in collision (kg)
- `Lc` = characteristic length (meters), minimum 0.1m (trackable)

**Fragment Properties:**
- **Characteristic Length:** Power-law cumulative distribution
- **Area-to-Mass Ratio:** Log-normal distribution (affects drag)
- **Delta-V Distribution:** Hansen 2006 log-normal model relative to collision center-of-mass
- **Mass:** Derived from Lc and A/m ratio

**Example:** A 950 kg projectile hitting the ISS at 10 km/s generates approximately **1,200 trackable fragments** (> 10 cm).

### 5. J2 Perturbation & Atmospheric Drag Model

Each debris fragment is propagated with:

**J2 Nodal Regression:**

```
dRAAN/dt = -1.5 * n * J2 * (R_earth / a)^2 * cos(i)
```

Where `J2 = 1.08263e-3`, `n` is mean motion, `a` is semi-major axis, `i` is inclination.

**Exponential Atmospheric Drag:**

```
rho(h) = rho_0 * exp(-(h - h_0) / H)
```

Where `H` is the scale height varying with altitude (MSIS-90 simplified model).

**Semi-major axis decay:**

```
da/dt = -rho * (A/m) * v * a
```

Fragments with perigee below 180 km are considered decayed and removed from the simulation.

---

## 3D Globe Visualization

The Globe3D component renders an interactive 3D Earth with multiple visualization layers:

**Scene Hierarchy (inner to outer):**

| Layer | Component | Description |
|-------|-----------|-------------|
| 1 | `Earth.jsx` | Custom GLSL shader - day/night terminator, city light texture, ocean specular highlights |
| 2 | `Atmosphere.jsx` | Single-layer Fresnel edge glow (blue atmosphere rim) |
| 3 | `GlobeGrid.jsx` | Latitude/longitude coordinate lines with animated radar sweep effect |
| 4 | `Satellites.jsx` | InstancedMesh rendering for 500+ simultaneous markers (color-coded by orbit type) |
| 5 | `OrbitalPaths.jsx` | Animated dashed trajectories with traveling dots (top 10 satellites) |
| 6 | `GroundTracks.jsx` | Surface-projected orbit lines (top 8 satellites) |
| 7 | `CollisionArcs.jsx` | Pulsing red bezier arcs between conjuncting satellite pairs |
| 8 | `EvasionArcs.jsx` | Red (doomed) + green (evasion) trajectory arcs with burn point marker |
| 9 | `SelectedMarker.jsx` | Billboard highlight rings that always face the camera |
| 10 | `DebrisField.jsx` | GPU Points particle cloud, generation-based coloring (white -> yellow -> orange -> red) |
| 11 | `Stars` | Background starfield (800-1200 stars) |

**Rendering Pipeline:**
- `THREE.NoToneMapping` for consistent colors
- Adaptive DPR (1x for integrated GPUs, up to 2x for discrete)
- No antialiasing (performance optimization)
- OrbitControls with damped rotation, auto-rotate at 0.12 deg/frame

---

## Performance Optimizations

The application is optimized for integrated GPUs (Intel HD 530, UHD 620, etc.):

**GPU Detection:**
- Reads `WEBGL_debug_renderer_info` to identify GPU
- Automatically enables low-power mode for Intel/Mesa/LLVMpipe/SwiftShader

**3D Rendering:**
- Device pixel ratio capped at 1x on integrated GPUs
- Antialiasing disabled
- No stencil or alpha channel
- Star count reduced (800 vs 1200)
- Fragment limit capped at 2,000 visible particles (from up to 50,000 simulated)

**WebGL Resilience:**
- Automatic context loss detection and recovery
- 3 retry attempts with 2-second delay
- Graceful fallback UI when WebGL is unavailable
- Error boundary wrapping the Canvas component

**React:**
- StrictMode-safe (all Three.js components use drei `<Line>` and `<Html>`)
- Zustand for zero-re-render state management
- Vite code splitting: `three`, `r3f`, `vendor`, `viz` chunks

---

## Troubleshooting

### Backend won't start

**"Module not found: scipy"**
```bash
pip install scipy
```

**"Cannot fetch TLE data"**
The backend requires an internet connection at startup to fetch satellite data from CelesTrak. Check your network connection and try again.

**Port 8000 already in use**
```bash
# Find the process
lsof -i :8000
# Kill it
kill -9 <PID>
```

### Frontend won't start

**"Module not found"**
```bash
cd frontend
rm -rf node_modules
npm install
```

**Blank white page**
Check the browser console (F12) for errors. Common causes:
- Backend not running (API calls fail)
- WebGL not available (try enabling hardware acceleration in browser settings)

### Globe shows white sphere

This is typically caused by a texture loading race condition. Solutions:
- Hard refresh the page (Ctrl+Shift+R)
- The app handles this automatically with retry logic

### 3D performance is poor

- The app auto-detects integrated GPUs and applies optimizations
- Try `/settings` and enable "High Performance Mode: Off" (reduces quality for better FPS)
- Close other GPU-intensive applications
- Use Chrome or Edge (better WebGL performance than Firefox on some systems)

### WebSocket connection fails

- Ensure the backend is running on port 8000
- Check browser console for WebSocket errors
- The frontend auto-reconnects with exponential backoff (up to 8 retries)

### Docker services won't start

```bash
# Check service logs
docker compose logs tle_service
docker compose logs kessler_service

# Restart a specific service
docker compose restart orbital_service

# Rebuild from scratch
docker compose down -v
docker compose up --build
```

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run the frontend build to check for errors:
   ```bash
   cd frontend && npx vite build
   ```
5. Commit your changes: `git commit -m "feat: add my feature"`
6. Push to the branch: `git push origin feature/my-feature`
7. Open a Pull Request

### Code Style

- **Frontend:** React functional components with hooks, Tailwind CSS utility classes
- **Backend:** FastAPI with Pydantic models, async handlers where possible
- **Naming:** camelCase (JS), snake_case (Python)
- **Commit messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/)

---

## References & Citations

### Orbital Mechanics

1. **Clohessy, W.H. & Wiltshire, R.S.** (1960). "Terminal Guidance System for Satellite Rendezvous." *Journal of the Aerospace Sciences*, 27(9), 653-658.

2. **Vallado, D.A.** (2013). *Fundamentals of Astrodynamics and Applications*, 4th Edition. Microcosm Press.

### Debris Modeling

3. **Johnson, N.L., Krisko, P.H., Liou, J.-C., & Anz-Meador, P.D.** (2001). "NASA's New Breakup Model of EVOLVE 4.0." *Advances in Space Research*, 28(9), 1377-1384.

4. **Hansen, B.W.** (2006). "Breakup Fragment Velocity Distributions." *4th European Conference on Space Debris*, ESA SP-587.

### Collision Probability

5. **Foster, J.L. & Estes, H.S.** (1992). "A Parametric Analysis of Orbital Debris Collision Probability and Maneuver Rate for Space Vehicles." NASA/JSC-25898.

### TLE Data Source

6. **CelesTrak** - [https://celestrak.org](https://celestrak.org) - NORAD Two-Line Element sets maintained by Dr. T.S. Kelso.

### Space Debris Statistics

7. **ESA Space Debris Office** (2024). "ESA's Annual Space Environment Report." European Space Agency, ESOC, Darmstadt, Germany.

---

## License

This project is developed for educational and research purposes.

---

**Built with orbital mechanics, physics engines, and a mission to keep space safe.**
