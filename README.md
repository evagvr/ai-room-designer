# Atelier AI — AI Interior Designer

> An intelligent room design experience powered by two specialised AI agents.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-4-brown)
![Vitest](https://img.shields.io/badge/Vitest-1.3-6E9F18?logo=vitest&logoColor=white)
![Claude API](https://img.shields.io/badge/Claude-Sonnet_4-orange)
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
- [Definition of Done](#definition-of-done)
- [Diagrams](#diagrams)
- [Bug Reports & Pull Requests](#bug-reports--pull-requests)
- [AI Usage in Development](#ai-usage-in-development)
- [Demo](#demo)
- [Team](#team)

---

## Project Overview

**Atelier AI** is a browser-based interior design application that uses two specialised AI agents to help users plan and visualise their living spaces. The user configures room dimensions, selects a design style and colour palette, sets a budget, and the system does the rest — generating personalised furniture suggestions with real Romanian store links, then computing an optimal spatial layout on a 2D interactive canvas.

The system is built around two AI agents: a **Designer Agent** that generates contextually appropriate furniture matched to the user's aesthetic and budget, with purchase links from IKEA, Dedeman, Vivre, and Mobexpert; and a **Spatial Optimizer Agent** that calculates collision-free furniture placement with a minimum 90 cm circulation aisle, returning precise x/y coordinates and rotation values for each piece.

What distinguishes this project from a conventional room planner is the depth of AI integration — every furniture suggestion, every layout computation, and every style comparison passes through a language model. The application adapts to the user's choices in real time, and no two sessions produce the same output.

AI tooling was also used throughout the development process itself — from generating user stories and architecture diagrams to writing test suites and optimising agent prompts. The full account is documented in the [AI Usage in Development](#ai-usage-in-development) section and in [`docs/ai-usage-report.md`](./docs/ai-usage-report.md).

---

## Features

### Room Configuration
- Numeric input fields for length, width, and height in metres
- Real-time visual preview of the room proportions (scaled 2D rectangle)
- Live calculation of floor area (m²) and volume (m³)
- Validation: all fields required; values must be between 1 m and 30 m

### Style & Palette Selection
- Five design styles: Minimalist, Scandinavian, Industrial, Bohemian, Modern
- Four colour palettes: Neutral, Warm, Cool, Colourful — multiple palettes selectable simultaneously
- Selections feed directly into the Designer Agent prompt as hard constraints

### AI-Powered Furniture Suggestions — Agent 1
- Generates 6–8 furniture items tailored to room dimensions, style, palette, and budget
- Each item includes name, exact dimensions, colour, price in RON, and a description
- At least two purchase links per item from Romanian stores: IKEA, Dedeman, Vivre, Mobexpert
- Links open in a new browser tab
- Fallback to a curated local product database if the API is unavailable
- Running total of selected items always visible; over-budget warning shown in real time

### AI-Powered Layout Generation — Agent 2
- Calculates optimal x/y coordinates and rotation (0° or 90°) for each selected piece
- All items guaranteed to remain within the room boundaries
- Targets a minimum 90 cm circulation aisle between items
- At least two meaningfully different layout variants can be generated and switched between

### Interactive 2D Canvas
- Canvas rendered proportionally to real room dimensions with a metric grid
- Each furniture piece displayed as a labelled, colour-coded rectangle
- Full drag-and-drop repositioning via mouse and touch
- Items cannot be dragged outside the room boundaries
- Overlapping items highlighted in red with real-time collision detection

### Budget Filtering
- Optional maximum budget input in RON
- Designer Agent uses the budget as a hard constraint during generation
- Running price total updates on every checkbox toggle
- Visual progress bar and warning when the selection exceeds the budget

### Style Comparison
- Side-by-side view of two user-selected design styles
- Each panel shows independent AI-generated furniture suggestions for that style
- Total estimated cost displayed per panel

### Save & Export
- Authenticated users can save any project configuration to their account
- Saved rooms appear in a personal dashboard and can be renamed or deleted
- Any saved room can be loaded and resumed from the layout step
- Export to a downloadable plan file containing the 2D layout coordinates, full furniture list with prices, and all store links

### Authentication
- Email and password registration (minimum 8-character password, unique email enforced)
- Protected routes redirect unauthenticated users to the login page
- Session persisted across browser refreshes via localStorage

---

## Architecture

### Project Structure

```
ai-interior-designer/
├── src/
│   ├── agents/
│   │   ├── agent1Designer.js       # Agent 1: furniture generation via LLM
│   │   └── agent2Optimizer.js      # Agent 2: spatial layout + collision detection
│   ├── components/
│   │   ├── Canvas/
│   │   │   └── RoomCanvas.jsx      # 2D canvas with drag & drop (US-09, US-10)
│   │   ├── Export/
│   │   │   └── ExportPanel.jsx     # Export + save project (US-13, US-14)
│   │   ├── Furniture/
│   │   │   ├── FurnitureSuggestions.jsx  # Agent 1 UI + selection (US-04–US-06)
│   │   │   └── BudgetFilter.jsx          # Budget input (US-11)
│   │   ├── Room/
│   │   │   ├── RoomConfig.jsx      # Dimensions input (US-01)
│   │   │   ├── StyleSelection.jsx  # Style picker (US-02)
│   │   │   └── PaletteSelection.jsx # Palette picker (US-03)
│   │   └── Layout.jsx              # Navbar and page wrapper
│   ├── data/
│   │   └── productDatabase.js      # Local catalogue: real URLs, prices, styles
│   ├── pages/
│   │   ├── DesignerPage.jsx        # 7-step wizard
│   │   ├── HomePage.jsx
│   │   ├── ComparePage.jsx         # Side-by-side style comparison (US-12)
│   │   ├── DashboardPage.jsx       # Saved rooms (US-13)
│   │   └── AuthPages.jsx           # Login + Register (US-15)
│   ├── store/
│   │   └── useStore.js             # Zustand global state (persisted)
│   ├── styles/globals.css
│   ├── App.jsx
│   └── main.jsx
├── tests/
│   ├── agent1.test.js              # 6 unit tests — Agent 1
│   ├── agent2.test.js              # 9 unit tests — Agent 2 + collision detection
│   ├── store.test.js               # 11 tests — store logic, auth, agent evals
│   └── setup.js

├── .github/workflows/ci.yml
├── index.html
├── vite.config.js
└── package.json


## AI Agents

Both agents are stateless — all context is injected per request — making them independently testable and replaceable. Both implement a validated local fallback if the API is unavailable or returns malformed JSON.

### Agent 1 — Designer Agent (`src/agents/agent1Designer.js`)

Receives the room dimensions, selected design style, colour palettes, and maximum budget. Builds a structured prompt and calls `claude-sonnet-4-20250514`. Returns an array of 6–8 furniture items, each with:

- Name, category, and physical dimensions (width × depth × height in metres)
- Hex colour and colour name matching the selected palette
- Price in RON within the stated budget
- A short description consistent with the chosen style
- Two store links per item from IKEA, Dedeman, Vivre, or Mobexpert with individual prices

**Prompt constraints enforced:**
- No item may exceed 75% of the minimum room dimension
- Colours must belong to the selected palette
- Style must match the selection
- Prices must be realistic for the Romanian market

**Fallback:** if the API call fails or the response cannot be parsed, the agent falls back to `src/data/productDatabase.js` — a curated catalogue of real products with verified URLs and prices — filtered by style, palette, budget, and room dimensions.

### Agent 2 — Spatial Optimizer Agent (`src/agents/agent2Optimizer.js`)

Receives the room dimensions and the user-selected furniture list. Returns x/y coordinates and a rotation value (0° or 90°) for every item:

- All items fully within room boundaries
- No two items overlapping
- Minimum 90 cm circulation aisle between items
- Seating oriented toward a focal point
- Beds placed against a wall

**Variant generation:** a second call with an incremented variant index produces a meaningfully different arrangement. Multiple variants are saved in state and switchable without regeneration.

**Post-processing:** `validateAndFixLayout()` clamps all coordinates to room boundaries regardless of model output. `checkCollisions()` runs client-side after every drag-and-drop operation.

**Fallback:** if the API fails, a randomised placement algorithm runs client-side, sampling positions until overlaps are minimised.

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

No backend server, no database, and no environment variables are required. The application runs entirely in the browser.

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ai-interior-designer.git
cd ai-interior-designer

# Install dependencies
npm install
```

### Running the Application

```bash
# Development server
npm run dev
# → http://localhost:5173

# Production build
npm run build

# Preview production build
npm run preview
```

---

## Testing & Evaluations

The project ships **26 passing tests** across three test files. Testing is split into unit tests for each agent, store logic tests, and AI agent evaluations.

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
| `tests/agent1.test.js` | 6 | API mock, fallback generation, required fields, store links, boundary compliance, budget constraint |
| `tests/agent2.test.js` | 9 | Layout generation, boundary clamping, rotation validation, `checkCollisions()` — 5 cases |
| `tests/store.test.js` | 11 | Room dimension validation, area/volume calculation, furniture toggle, auth validation, 3 agent evals |

### AI Agent Evaluations

Agent behaviour is validated in `tests/store.test.js` against five criteria on every CI run:

| Evaluation | Criterion | How It Is Tested |
|------------|-----------|------------------|
| Prompt completeness | Agent 1 prompt must contain dimensions, style, palette, and budget | String-content assertions on the constructed prompt |
| Dimension compliance | No furniture item may exceed room boundaries | `width < roomLength && depth < roomWidth` checked per item |
| Spatial constraints | Agent 2 prompt must include the 90 cm circulation requirement | String-content assertions on the constructed prompt |
| Boundary safety | All layout coordinates must remain within the room after clamping | Coordinate assertions against known edge-case inputs |
| Fallback field validity | Fallback furniture must pass the same schema checks as API output | Field presence and type checks on every fallback item |

---

## CI/CD Pipeline

Automated via GitHub Actions on every push and pull request to `main`.

```
push / pull request to main
          ↓
Checkout repository
          ↓
Set up Node.js 20
          ↓
Install dependencies  (npm ci)
          ↓
Run Vitest unit + eval tests
          ↓
Generate coverage report
          ↓
Syntax check
          ↓
Build with Vite
          ↓
Upload build artifact
          ↓
Deploy to GitHub Pages  (main branch only)
```

Pipeline configuration: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)

No code reaches `main` without a passing build and all tests green.

---


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



## Diagrams


| Diagram | Description |
|---------|-------------|
| Component Architecture | High-level map of React components, Zustand store, agents, and Anthropic API |
| Agent 1 Workflow | Input → prompt construction → Claude API → JSON parse → fallback |
| Agent 2 Workflow | Input → constraint prompt → Claude API → coordinate clamp → canvas render |
| Sequence Diagram | Full user flow: room config → furniture generation → layout → export |
| State Schema | Complete Zustand store structure with field types and persistence boundaries |

---
## Team

| Student | Responsibilities |
|---------|----------------|
| Student 1 | Agent 1 (`agent1Designer.js`), `FurnitureSuggestions`, `BudgetFilter`, product database |
| Student 2 | Agent 2 (`agent2Optimizer.js`), `RoomCanvas` (canvas, drag & drop, collision detection) |
| Student 3 | `AuthPages`, `DashboardPage`, `ExportPanel`, Zustand store |
| Student 4 | `StyleSelection`, `ComparePage`, CI/CD pipeline, Vitest test suite |
