# WTT Agri Intex - Flask Web Application

This project is a Flask/PWA conversion of the supplied Flutter `WTT Agri Intex` application. It keeps the same three user flows and the same backend integrations while adapting mobile-only storage/connectivity behavior to a browser + Flask architecture.

## Included functionality

- Home screen with original WTT logo, green Material-style UI and navigation.
- English / Tamil language toggle, persisted in browser local storage.
- Agricultural data form with the same fields and validation rules.
- Soil dropdown: Clay, Sandy, Silt, Loam, Peaty, Chalky, Others.
- Conditional "Specify Soil Type" field for Others.
- Conditional Advance Amount field when Advance Received is checked.
- Google Sheets submission through the same Apps Script deployment configuration.
- Frappe/ERP submission to the same `submit_agriculture_data` endpoint.
- UltraMsg WhatsApp confirmation in English and Tamil.
- SQLite server retry queue with separate `google_synced` and `erp_synced` flags.
- Browser offline queue using local storage.
- Sync Status page showing browser-offline and server-pending records.
- Automatic browser retry every 30 seconds plus manual Sync button.
- PWA service worker so the main screens/assets can reopen offline after the first successful load.
- Original uploaded image assets included under `static/images/`.

## Important conversion fixes

The supplied Flutter source deletes `wtt_agri_intex.db` every time the application initializes. That makes true offline persistence impossible across restarts. The Flask conversion does **not** delete its SQLite database at startup.

The Flutter online-failure path can also insert the same failed record twice: once inside `SyncService.sendSingleData()` and once again in `AddDataScreen._submitForm()`. The Flask version uses a `client_submission_id` and a unique SQLite key to prevent duplicate queue rows.

## Project structure

```text
wtt_agri_intex_flask/
|-- app.py                  Flask routes and JSON APIs
|-- config.py               Environment configuration
|-- database.py             SQLite pending queue and receipts
|-- models.py               AgricultureData model and mappings
|-- services.py             Google Sheets, Frappe and UltraMsg clients
|-- sync_manager.py         Initial sync and retry logic
|-- translations.py         Server copy of English/Tamil strings
|-- templates/              Flask/Jinja pages
|-- static/
|   |-- css/app.css
|   |-- js/                 Localization, form, offline queue, sync page
|   |-- images/             Original Flutter assets
|   |-- manifest.webmanifest
|   `-- service-worker.js
|-- instance/               Runtime SQLite database location
|-- tests/test_core.py
|-- .env                    Migrated runtime values from supplied Flutter source
`-- .env.example            Safe configuration template
```

## Run on Windows

1. Install Python 3.10 or newer.
2. Open Command Prompt in this project folder.
3. Run:

```bat
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python app.py
```

4. Open `http://127.0.0.1:5000`.

For a production-style Windows server:

```bat
.venv\Scripts\activate
python run_waitress.py
```

## Run on Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

## Configuration

Runtime integration values are read from `.env`. The supplied Flutter values were migrated into the included `.env` so the conversion retains the same integration targets. **Do not commit or publicly share `.env` because it contains service credentials.** Use `.env.example` when creating a public repository, and rotate credentials if this archive is shared outside the authorized team.

Key variables:

- `FRAPPE_BASE_URL`
- `FRAPPE_ENDPOINT`
- `GOOGLE_SCRIPT_ID`
- `GOOGLE_SCRIPT_IP`
- `ULTRAMSG_TOKEN`
- `ULTRAMSG_INSTANCE_ID`
- `DATABASE_PATH`
- `REQUEST_TIMEOUT`

## Offline behavior

The Flutter app used device SQLite. A web browser cannot directly use that mobile database, so the conversion uses two layers:

1. **Browser offline queue**: if the browser cannot reach Flask, form data is retained in browser local storage.
2. **Server retry queue**: if Flask receives the form but Google Sheets and/or ERP fails, the record is retained in server SQLite with independent sync flags.

The browser retries its offline queue every 30 seconds when online. The Sync Status page then invokes the server retry operation for pending upstream integrations.

For PWA/service-worker offline page caching, browsers require `https://` in production (localhost is the main exception). If you deploy on a LAN IP, put Flask/Waitress behind an HTTPS reverse proxy for full offline-PWA behavior.

## API routes

- `GET /` - Home
- `GET /add` - Add Agricultural Data
- `GET /sync-status` - Sync Status
- `POST /api/submit` - Submit one record
- `GET /api/pending` - Server pending queue
- `POST /api/sync` - Retry server pending queue
- `GET /api/health` - Flask health check

## Verification already included

`tests/test_core.py` verifies:

- duplicate client submissions do not create duplicate queue rows;
- Google-success / ERP-failure records preserve separate sync flags;
- retry removes a record after both systems sync;
- English and Tamil translation maps have matching keys;
- "Others" soil mapping sends the specified soil description to Google Sheets.

Run:

```bash
python -m unittest discover -s tests -v
```

See `docs/FLUTTER_SOURCE_ANALYSIS.md` for the complete source-to-Flask mapping.

## Visiting-card AI scanner

The **Add Agricultural Data** page includes a **Scan Visiting Card** control above the Name field. On a phone, the browser can open the rear camera; on desktop it opens an image picker. After capture/upload, the image is sent to the Flask server, which calls the OpenAI Responses API with image input and structured JSON output. The server then returns only the extracted values to the browser and auto-fills:

- Name
- Mobile Number
- Address / District (district/location preferred; printed address is the fallback)

Configure the API in `.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_VISION_MODEL=gpt-5.6-luna
OPENAI_REQUEST_TIMEOUT=45
OPENAI_MAX_IMAGE_MB=10
```

The OpenAI key is read only by Flask and is **never sent to browser JavaScript**. The default `gpt-5.6-luna` model supports image input and structured outputs and is selected for lower per-scan cost. You can change `OPENAI_VISION_MODEL` without changing application code. JPG, PNG, and WEBP card images are accepted.

