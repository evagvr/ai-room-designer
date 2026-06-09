# ⚜️ Atelier AI — AI Interior Designer

> An intelligent, premium room design experience powered by two local collaborative AI agents.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-4-brown)
![Vitest](https://img.shields.io/badge/Vitest-1.3-6E9F18?logo=vitest&logoColor=white)
![Ollama API](https://img.shields.io/badge/Ollama-Mistral-blue)
![Django REST](https://img.shields.io/badge/Django-REST_Framework-092E20?logo=django&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?logo=github-actions&logoColor=white)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [AI Agents](#ai-agents)
- [Getting Started](#getting-started)
- [Testing & Evaluations](#testing--evaluations)
- [CI/CD Pipeline](#cicd-pipeline)
- [Backlog](#backlog)
- [Diagrams](#diagrams)
- [Bug Reports & Pull Requests](#bug-reports--pull-requests)
- [AI Usage in Development](#ai-usage-in-development)
- [Demo](#demo)

---

## Project Overview

**Atelier AI** is a premium, responsive browser-based interior design application that uses two specialized **local AI agents** to help users plan, optimize, and visualize their living spaces. Users configure physical room dimensions, select design styles, specify budgets, and interact in real time with a conversational agent to generate and refine a personalized list of real furniture (sourced with direct Romanian store links). The system then computes an optimal, collision-free spatial layout and renders it on a responsive 2D interactive canvas, complete with premium white-and-gold visual PDF blueprints.

To make the application cost-free, secure, and private, it completely replaces expensive external APIs with **Ollama** (running a local `mistral` model on the user's machine) communicating with a robust **Django REST Framework** backend. 

AI tooling was extensively integrated across the entire software development lifecycle (SDLC) — from requirements elicitation and backlog creation to unit testing, prompt engineering, and visual asset rendering.

---

## Features

### Streamlined 4-Step Designer Wizard
The interface is consolidated into a highly intuitive, step-by-step design pipeline:
1.  **Camera (Dimensions)**: Configures room length, width, and height in meters. Live floor area ($m^2$) and volume ($m^3$) are calculated instantly on the sidebar alongside a proportional wall boundary preview.
2.  **Mobilier (Chat AI)**: A chat interface where users converse with the **Designer Agent** (Agent 1). The agent automatically queries the SQLite database to suggest real-market furniture matching the style and budget, rendering interactive product selection cards.
3.  **Layout (Room Canvas)**: Computes and displays the spatial arrangement of the chosen items. Includes an interactive 2D canvas with full drag-and-drop, collision highlighting, and a premium control dock (`Așezare nouă`).
4.  **Export (PDF & Save)**: Shows a read-only blueprint next to a purchase list and provides an automated PDF report download along with a CRUD project saving dashboard.

### Real-Time Collision-Free Layout Algorithm
- Uses bounding boxes based on the actual physical dimensions of each furniture item.
- Items are bounded completely within the room walls.
- Features **global auto-repositioning** on product additions: large structural items (like beds or sofas) are sorted and placed first to optimize room utilization, followed by smaller items.
- Features real-time visual overlap checks, highlighting colliding items in warning red.

### Premium Control Dock (`Așezare nouă`)
- A glassmorphic design action panel employing semi-transparent gold borders, Bezier morph transitions, and physical lift glow-shadows.
- Allows users to cycle through **8 distinct layout strategies** calculated by the Spatial Optimizer backend (Corner-biased, Wall-bound/Perimeter, Wide-spaced, Cozy center grouping, etc.) to guarantee 100% unique, diverse, and collision-free spatial variations.

### Professional Visual PDF Blueprint
- Generates a premium architectural report (white, charcoal, and warm gold blueprint accents) directly from the browser using `jsPDF`.
- Converts the active HTML5 canvas schiță into a high-fidelity PNG data URI and embeds the image directly into the document.

### Saved Projects CRUD Dashboard
- Authenticated users can save project configurations to their account.
- Saved layouts are listed in a dashboard where they can be loaded, renamed, or deleted.

---

## Architecture

### Project Structure

```
ai-room-designer/
├── .github/                # GitHub workflows (CI/CD pipeline)
│   └── workflows/
│       └── ci.yml          # Runs tests, coverage, lint, build & Pages deploy
├── backend/                # Django REST API Backend
│   ├── agents/             # Agent 1 & Agent 2 Ollama connectors
│   │   ├── agent1_designer.py   # AI Designer + dimension fallback
│   │   ├── agent2_optimizer.py  # Spatial Optimizer + 8 layout strategies
│   │   └── ollama_service.py    # Local Ollama client
│   ├── furniture/          # Furniture DB models, search services & commands
│   │   ├── management/
│   │   │   └── commands/        # Custom load_custom_products commands
│   │   ├── custom_products.json # 80KB furniture catalogue
│   │   └── search_service.py    # Fallback search query analyzer
│   ├── interior_designer/  # Core Django configuration & router
│   ├── rooms/              # CRUD endpoints for saved layouts
│   ├── users/              # Auth REST endpoints
│   ├── manage.py           # Django CLI
│   └── db.sqlite3          # SQLite Database
├── diagrams/               # Architecture and sequence flow assets (PNG)
├── docs/                   # Academic reports
│   └── raport_utilizare_ai.md  # Detailed AI usage report (70% AI / 30% Human)
├── public/                 # Static assets
├── src/                    # Frontend React Application
│   ├── agents/             # API client connectors for Agent 1 and Agent 2
│   ├── components/         # Reusable UI widgets
│   │   ├── Canvas/
│   │   │   └── RoomCanvas.jsx   # 2D Canvas with premium action buttons
│   │   ├── Export/
│   │   │   └── ExportPanel.jsx  # PDF visual exporter + diacritics sanitizer
│   │   └── Layout.jsx
│   ├── pages/              # Wizard page controllers
│   │   ├── DesignerPage.jsx     # Clamped 4-step wizard
│   │   └── AuthPages.jsx
│   ├── store/
│   │   └── useStore.js          # Zustand global state with local persistence
│   └── App.jsx
├── tests/                  # Automated Vitest Suite (Unit + Evals)
│   ├── agent1.test.js      # Validator for Agent 1 constraints
│   ├── agent2.test.js      # Validator for Agent 2 collision rules
│   └── store.test.js       # Store state, area/volume, & 3 Agent evals
├── index.html
├── vite.config.js
└── package.json
```

---

## AI Agents

Both agents are stateless, completely isolated from direct UI components, and communicate via REST APIs, making them fully testable. Both implement robust local fallbacks inside the client if the backend or local Ollama service is offline.

### Agent 1 — AI Designer (`backend/agents/agent1_designer.py`)

The Designer Agent acts as a virtual interior design consultant that interacts with the user in natural language through the chat interface:
- **Semantic Intent Extraction**: Parses the user's chat messages (queries like *"canapea roșie"*, *"măsuță modernă"*) using a semantic analyzer (`intent_extractor.py`) to determine what category of furniture the user is looking for, alongside their aesthetic or style specifications.
- **Controlled Prompt Engineering**: Builds a strict prompt injected with system-level constraints, instructing the local Ollama LLM to formulate valid structured JSON matching our required catalog schema.
- **Intelligent Database Queries**: Dynamically queries our local SQLite database (`FurnitureProduct` model) populated with over 80KB of real furniture catalog data (such as IKEA, Dedeman, Mobexpert, and Vivre). It uses style relevance algorithms (`relevance.py`) to rank items by how well they match the chosen design styles (Minimalist, Modern, Industrial, etc.) and selected color palettes.
- **Budget & Boundary Checks**: Enforces the maximum budget bounds specified by the user, dynamically filtering out items that exceed the financial threshold. It also ensures that no recommended furniture item is physically too large to fit inside the room dimensions (hard-clamped to a maximum of 75% of the shortest room dimension).
- **Purchase and Info Links**: Returns 6-8 high-fidelity recommendations, complete with realistic descriptions, physical dimensions (width, depth, height in meters), hex colors, prices in RON, and direct links to the active products.

### Agent 2 — AI Spatial Optimizer (`backend/agents/agent2_optimizer.py`)
- Receives the room coordinates and the bounding boxes of the selected items.
- Computes layout positioning ($x, y$ coordinates and rotation angles) using **8 distinct spatial strategies** mapped to `variant % 8`:
  - *Variant 0-3*: Cadran Corner Biases (Top-Left, Bottom-Right, Top-Right, Bottom-Left).
  - *Variant 4*: Wide Distribution (Maximizes spacing between items).
  - *Variant 5*: Wall-bound (Aligns beds and cabinets against walls).
  - *Variant 6*: Alternating Corners (Balances visual weight across the room).
  - *Variant 7*: Cozy Centered (Groups seating and social elements around a center focus).

---

## Getting Started

### Prerequisites
- **Node.js 18+** & **npm**
- **Python 3.10+** (with virtualenv)
- **Ollama** installed (Windows application or macOS/Linux curl install)

---

### Step-by-Step Installation

#### 1. Setup Motor AI Local (Ollama)
Download Ollama from [ollama.ai](https://ollama.ai) and run:
```bash
# Pull the lightweight model configured for the agents
ollama pull mistral
```

#### 2. Setup Backend (Django REST API)
Open a terminal inside the `/backend` folder:
```bash
cd backend

# Create and activate Python virtual environment
# On Windows:
python -m venv venv
venv\Scripts\activate
# On macOS/Linux:
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
# On Windows:
copy .env.example .env
# On macOS/Linux:
cp .env.example .env

# Run database migrations
python manage.py migrate

# POPULATE DATABASE (CRITICAL: Loads the 80KB furniture catalogue!)
python manage.py load_custom_products --clear

# Start the Django development server
python manage.py runserver
# → http://localhost:8000
```

#### 3. Setup Frontend (React + Vite)
Open a terminal in the **root** folder:
```bash
# Install Node dependencies
npm install

# Start the React development server
npm run dev
# → http://localhost:5173
```

---

## Testing & Evaluations

The project ships **29 passing tests** across three test files. Testing is split into unit tests for each agent, store logic tests, and AI agent evaluations.

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Coverage

| File | Tests | Coverage Area |
|------|-------|---------------|
| `tests/agent1.test.js` | 7 | Network error fallback, malformed JSON fallback, dimension compliance, required fields validation, store link validation, parsed API data verification, budget constraint enforcement |
| `tests/agent2.test.js` | 11 | Fallback layout generation, coordinate presence validation, boundary clamping checks, API response parsing, rotation value validation, empty state handling, overlap detection (`checkCollisions()`) — 5 test cases |
| `tests/store.test.js` | 11 | Dimension validation boundaries, area calculation, volume calculation, budget summation, over-budget detection, furniture toggling, email regex validation, password length validation, Agent 1 prompt extraction, Agent 2 constraint checking, item dimension compliance |

### AI Agent Evaluations (`tests/store.test.js`)
We use programmatic assertions during CI/CD to validate that the output produced by the AI agents satisfies strict physical rules:

| Evaluation | Objective | Assertion Mechanics |
|------------|-----------|--------------------|
| **Dimension Check** | No furniture item may exceed the room dimensions. | Loops through items and checks `width < roomLength` & `depth < roomWidth`. |
| **Budget Constraint** | Fallback items must respect the max budget constraint. | Verifies that total cost of recommended items does not exceed the alocated limit. |
| **Boundary Safety** | Clamps all positions within walls. | Verifies that the bounding boxes of Agent 2 coordinates do not extend beyond the coordinates of the room walls. |
| **Fallback Scheme Validity** | Verifies database items scheme integrity. | Asserts presence and datatype of `id`, `name`, `storeLinks`, and `price`. |

---

## CI/CD Pipeline

Automated through **GitHub Actions** defined in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

```
push / pull request to main or develop
          │
          ▼
Checkout repository
          │
          ▼
Setup Node.js v20 (with npm cache)
          │
          ▼
Install Node modules  (npm ci)
          │
          ▼
Run Vitest Unit & Agent Eval tests  (npm run test)
          │
          ▼
Generate and upload Coverage Report
          │
          ▼
Syntax & Lint checks
          │
          ▼
Build React bundle  (npm run build)
          │
          ▼
Deploy to GitHub Pages  (push to main only)
```

---

## Backlog

### Epic Overview

| Epic | User Stories | SP | Description |
|------|--------------|----|-------------|
| Room Configuration | US-01 – US-03 | 8 | Dimensions input, style selection, palette selection |
| Agent 1 – Designer | US-04 – US-06 | 13 | AI furniture generation, store links, checkbox selection |
| Agent 2 – Optimizer | US-07 – US-08 | 10 | Automatic layout, variant regeneration |
| Interactive Canvas | US-09 – US-10 | 8 | 2D visualisation, drag & drop with collision detection |
| Budget & Filtering | US-11 | 4 | Budget input, real-time total, over-budget warning |
| Style Comparison | US-12 | 4 | Side-by-side AI style comparison |
| Save & Export | US-13 – US-14 | 8 | Project save/load/rename/delete, plan export |
| Authentication | US-15 | 7 | Registration, login, protected routes |
| **Total** | **15 user stories** | **52** | |

### Selected Acceptance Criteria

**US-04 — AI Furniture Generation**
- Agent returns at least 5 items with name, dimensions, price in RON, and colour
- No item is larger than the room dimensions
- Response within 10 seconds; fallback activates on any error

**US-07 — Automatic Layout Calculation**
- No two furniture items overlap
- Minimum 90 cm circulation aisle between items
- Agent returns x, y coordinates and rotation for each item

**US-10 — Drag & Drop Adjustment**
- All furniture pieces are draggable via mouse and touch
- Items cannot be dragged outside the room boundaries
- Overlapping items are highlighted in red in real time

**US-14 — Plan Export**
- Export includes the full furniture list with prices and store links
- Layout coordinates included per item
- File downloadable directly from the browser

---


## Diagrams


| Diagram | Description |
|---------|-------------|
| Component Architecture | High-level map of React components (DesignerPage, RoomCanvas), Zustand store (localStorage), Django REST Backend, and Ollama health check. |
| Agent 1 Workflow | Input (style, budget) → SQLite query on `FURNITURE_FURNITUREPRODUCT` → heuristic intent extractor → frontend client fallback. |
| Agent 2 Workflow | Input (items, variant 0–7) → geometric layout calculation (`variant % 8`) → `check_collisions()` validation → coordinate update → canvas render. |
| Sequence Diagram | Full user flow: login → furniture search (heuristics) → layout generation (Agent 2) → jsPDF export → Zustand persistence. |
| State Schema | Complete Zustand store structure (`LOCAL_STORAGE_SESSION`) including user, `isAuthenticated`, and `savedRooms` (`LAYOUT_ITEM_STRUCTURE`). |

---

## Bug Reports & Pull Requests

All bugs are tracked as GitHub Issues and resolved via dedicated bug-fix branches and Pull Requests. Each PR references the respective issue it resolves and must successfully pass the entire automated CI pipeline (Vitest unit tests, agent evaluations, and production build checks) before it is allowed to merge.

---

## AI Usage in Development

Development followed a structured division: **70% AI Execution (repetitive boilerplate, styling utilities, CSS, unit test assertions, catalog database structuring) and 30% Human Direction & Architecture (business logic rules, styling themes, spatial layout variant designs, diacritics fallback strategy, and debugging).**

> [!TIP]
> **Complete AI Report**: A comprehensive, detailed report outlining our prompt engineering methodologies, workflow splits, advantages, and lessons learned is available at:  
> 🔗 **[Raport Utilizare Instrumente AI - Atelier AI](./docs/Raport%20Utilizare%20Instrumente%20AI%20-%20Atelier%20AI.pdf)**> 

---

## Demo

- **Live Application**: [https://evagvr.github.io/ai-room-designer/](https://evagvr.github.io/ai-room-designer/)
- **Video Screencast**: [https://youtu.be/l7RsiIhhnlA](https://youtu.be/l7RsiIhhnlA)

---

