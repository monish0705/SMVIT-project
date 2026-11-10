# CivicPulse AI — Infrastructure Failure Intelligence Platform

> **Core Promise:** Turn scattered infrastructure observations into consolidated, evidence-backed incidents that municipal teams can inspect, prioritize, and track through resolution.

CivicPulse AI is an enterprise-grade AI infrastructure operations platform initially configured for road defects (potholes, surface ravelling, and pavement fissures) across **Bengaluru, India**.

It is **NOT** a simple citizen complaint form; it is an intelligent operations layer that correlates duplicate reports, preserves verifiable location provenance through **GeoProof AI**, calculates explainable 5-factor risk priorities, and maintains strict human-in-the-loop authority for field verification and repair sign-off.

---

## 1. System Architecture & Modules

```
CivicPulse-AI/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI REST endpoints (auth, reports, incidents, evidence, copilot, etc.)
│   │   ├── core/            # Config, security (bcrypt/JWT), database session management
│   │   ├── models/          # SQLAlchemy relational models & audit tables
│   │   ├── schemas/         # Pydantic schemas & response validation contracts
│   │   └── services/        # GeoProof AI, EXIF parser, risk calculator, state machine, copilot tools
│   ├── storage/
│   │   ├── originals/       # Immutable raw source photographs (SHA-256 verified)
│   │   ├── annotated/       # GeoProof watermarked visual evidence derivatives
│   │   └── thumbnails/      # Fast UI previews and map icons
│   ├── tests/               # Pytest suite (EXIF, GeoProof, duplicates, risk, state transitions, API)
│   ├── requirements.txt     # Python backend dependencies
│   └── seed_demo.py         # 20 realistic Bengaluru synthetic incident scenarios & demo users
├── frontend/
│   ├── src/
│   │   ├── components/      # Badges, Leaflet map, Evidence Graph viewer, Audit timeline
│   │   ├── context/         # AuthContext & 1-click evaluator role switcher
│   │   ├── pages/           # Dashboard, Map, Queue, Details, Report Intake, Reviews, Work Orders, Copilot, Settings
│   │   ├── services/        # API client & reverse-geocoding adapter
│   │   └── types/           # TypeScript data interfaces
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml       # PostgreSQL with PostGIS container definition
├── .env.example             # Environment configuration template
├── start-dev.ps1            # Unified Windows PowerShell launcher
└── README.md
```

---

## 2. Differentiating Core Capabilities

### A. GeoProof AI (Dual Intake Paths)
- **Path 1: Gallery Upload**: Reads EXIF metadata with Pillow, extracts DMS coordinates, converts to decimal degrees, and records claimed capture timestamps. If EXIF is absent, requests current device location labeled strictly as `uploader_location_at_submission`—**never** claiming it as the photo's historical capture location.
- **Path 2: Camera Capture**: Uses browser Geolocation API with user permission, records horizontal accuracy radius ($\pm X$ metres), and marks provenance as `device_gps_at_capture`.
- **Intake Hashing & Derivatives**: Computes a SHA-256 intake checksum and perceptual dHash for duplicate comparison. Generates a watermarked derivative with GPS coordinates, accuracy circle, address, and verification state. The original image remains unmodified.

### B. Multi-Factor Duplicate Incident Detection
Correlates incoming reports against existing incidents using:
1. Spatial Proximity (Haversine / PostGIS ST_DWithin adjusted for GPS accuracy)
2. Defect Category Match
3. Perceptual Visual Image Similarity (dHash Hamming distance)
4. Exact SHA-256 duplicate detection (repeated upload of identical photo)
5. Description Jaccard text overlap

*Crucial Rule:* Reports are suggested as candidate links for operator review; they are **never** automatically merged as fact or discarded.

### C. Transparent 5-Factor Risk Prioritization Engine
Calculates explainable urgency (0–100) using the project formula:
$$\text{Risk Priority} = 0.35 \times \text{Severity} + 0.25 \times \text{Exposure} + 0.20 \times \text{Criticality} + 0.10 \times \text{Hazard} + 0.10 \times \text{Time Unresolved}$$
- **Emergency Escalation:** Severe defects situated along arterial corridors (Outer Ring Road, Bellary Road) or near hospitals trigger an emergency escalation override.
- **Evidence Confidence:** Calculated independently (Low, Medium, High) and **not** mathematically hidden inside the risk score.

### D. Incident Lifecycle & Human Authority
- Status Transitions: `candidate` $\rightarrow$ `needs_location` $\rightarrow$ `needs_review` $\rightarrow$ `corroborated` $\rightarrow$ `field_verified` $\rightarrow$ `assigned` $\rightarrow$ `in_progress` $\rightarrow$ `repair_claimed` $\rightarrow$ `resolution_pending_review` $\rightarrow$ `resolution_verified` $\rightarrow$ `closed`.
- Enforces role-based permissions and records an append-only audit event for every transition.
- **Repair Claim Rule:** A contractor uploading after-repair evidence triggers `resolution_pending_review`. It **never** auto-closes without authorized human sign-off.

### E. AI Operations Copilot
Controlled tool-calling assistant that queries the live database (listing high-risk incidents, comparing why one incident ranks above another, finding duplicates, and summarizing resolution review queues).

---

## 3. Running Instructions (Windows PowerShell)

### Prerequisites
- Python 3.10+ (Tested on Python 3.11)
- Node.js 18+ (Tested on Node.js v24)
- Git

### Fast Launch (Automated PowerShell Script)
In Windows PowerShell at `d:\MINI-PROJECT`:
```powershell
.\start-dev.ps1
```

### Manual Step-by-Step Launch

#### 1. Backend Setup & Startup
Open a PowerShell terminal in `d:\MINI-PROJECT\backend`:
```powershell
# Create virtual environment (if not already created)
python -m venv venv

# Activate and install dependencies
.\venv\Scripts\pip.exe install -r requirements.txt

# Populate synthetic demo database (20 Bengaluru incidents & demo users)
$env:PYTHONPATH="."
.\venv\Scripts\python.exe seed_demo.py

# Launch FastAPI server with hot-reload
.\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup & Startup
Open a second PowerShell terminal in `d:\MINI-PROJECT\frontend`:
```powershell
npm install
npm run dev
```

The frontend will be available at: **http://localhost:5173**  
The backend Swagger API docs will be at: **http://127.0.0.1:8000/api/docs**

---

## 4. Demo User Credentials & 1-Click Role Switcher

For seamless evaluation, the top navigation bar includes an **Instant Role Switcher** dropdown. You can also sign in manually using:

| Role | Email | Password | Full Name |
| :--- | :--- | :--- | :--- |
| **Operator** | `operator@civicpulse.ai` | `Operator@CivicPulse2026!` | Priya Sharma (Control Room Lead) |
| **Field Inspector** | `inspector.kumar@bbmp.gov.in` | `Inspector@CivicPulse2026!` | Ramesh Babu (Ward Inspector) |
| **Administrator** | `admin@civicpulse.ai` | `Admin@CivicPulse2026!` | Dr. Monish Kumar (Lead Director) |
| **Citizen** | `citizen@gmail.com` | `Citizen@CivicPulse2026!` | Sunita Rao (Citizen Contributor) |

*Note: Synthetic demo data is clearly marked across all screens and does not represent live municipal government records.*

---

## 5. Google Gemini API Configuration (Optional)

CivicPulse AI includes a fully functioning deterministic triage engine for road defects when offline. To enable live multimodal Gemini analysis:

1. Obtain an API key from Google AI Studio.
2. Set the environment variable in your terminal or backend `.env` file:
   ```powershell
   $env:GEMINI_API_KEY="your_actual_gemini_api_key_here"
   ```
3. Restart the backend server. The model will run with runtime `gemini-3.8-flash` via the official `google-genai` SDK.

---

## 6. Verification & Test Results

Run all backend unit and integration tests:
```powershell
cd d:\MINI-PROJECT\backend
$env:PYTHONPATH="."
.\venv\Scripts\pytest.exe -v
```
**Test Results:** 13/13 tests passing:
- `test_health_check` (API operational)
- `test_auth_login` (JWT token & role check)
- `test_list_incidents` (Queue retrieval)
- `test_incident_stats` (Dashboard KPI metrics)
- `test_reverse_geocode_api` (Nominatim & offline GIS fallback)
- `test_copilot_assistant` (Tool-calling synthesis)
- `test_convert_dms_to_dd` (DMS rational coordinate conversion)
- `test_missing_exif` (Safe handling of stripped metadata)
- `test_sha256_computation` (Intake file integrity checksum)
- `test_dhash_and_hamming_distance` (Perceptual near-duplicate image distance)
- `test_watermark_overlay_generation` (Pillow GeoProof visual overlay)
- `test_risk_formula_calculation` (5-factor formula & emergency escalation)
- `test_valid_and_invalid_state_transitions` (State machine role enforcement)

Frontend build check:
```powershell
cd d:\MINI-PROJECT\frontend
npm run build
```
**Build Result:** Built in 2.45s with 0 TypeScript errors.

---

## 7. 5–7 Minute Evaluation Walkthrough

1. **Overview Dashboard (`/`)**:
   - Inspect live KPI cards (Total, Open, Critical, Awaiting Verification, Resolution Review).
   - Review defect categories, risk priority distributions, and 7-day trend bars.
2. **Interactive Map (`/map`)**:
   - Filter by defect category (Potholes, Cracks) or status.
   - Click markers to inspect popup thumbnails and accuracy radius circles across Bengaluru.
3. **Public Reporting Portal & GeoProof (`/report`)**:
   - Select **Upload from Gallery** or **Take a Photo**.
   - Observe automatic EXIF extraction: GPS coordinates, timestamp, and address.
   - If using a photo without GPS, observe the clear prompt requesting device location as *Uploader Location at Submission*, never fabricating historical capture coordinates.
   - Adjust the pin on the interactive map.
   - Submit report and observe the generated watermarked GeoProof derivative and unique incident reference number (`INF-XXXX`).
4. **Duplicate Detection & Correlation**:
   - Open incident `INF-1002` or `INF-1003` to view the duplicate candidate banner linking to `INF-1001` with match score and reasons (spatial proximity and identical image hash).
5. **Incident Details & Evidence Graph (`/incidents/INF-1001`)**:
   - Toggle between original raw image and watermarked derivative.
   - Review 5-factor risk score contribution bars.
   - Switch to the **Relational Evidence Graph** tab to explore connected nodes (Incident $\leftrightarrow$ Observation $\leftrightarrow$ Evidence Asset $\leftrightarrow$ Location $\leftrightarrow$ Assessment $\leftrightarrow$ Work Order).
6. **Resolution Verification Gate**:
   - Open Review Centre (`/reviews`) and switch to the **Resolution Review** tab.
   - Select `INF-1007` (Whitefield Hope Farm Circle) where a contractor uploaded repair proof.
   - As an authorized Operator or Admin, click **Verify & Close Incident** to formally close the case and record the audit entry.
7. **AI Operations Copilot (`/copilot`)**:
   - Click one of the quick prompts (e.g. *"Why is INF-1001 ranked higher than INF-1002?"* or *"Which five incidents need inspection first?"*).
   - View the database tools executed, structured answer, citations, and suggested operational actions.

---

## 8. Known Limitations

- **Public Nominatim Geocoder:** Uses OpenStreetMap Nominatim with rate limiting and local caching. For production citywide scale, a dedicated enterprise geocoder or local tile server is recommended.
- **EXIF Trust Limitation:** EXIF tags can be stripped or manipulated by third-party software. CivicPulse AI preserves provenance and distinguishes capture from upload location, requiring human field inspection for formal verification.
- **Prototype Dataset:** 20 seeded records are synthetic demonstrations around Bengaluru, clearly marked as non-official municipal data.

