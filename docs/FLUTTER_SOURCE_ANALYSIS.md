# Supplied Flutter Project Analysis and Flask Mapping

## 1. Supplied source inventory

The supplied archive contains 12 Dart source files plus localization folders/directories. The functional Dart files are:

- `lib/main.dart`
- `lib/models/agriculture_data.dart`
- `lib/screens/home_screen.dart`
- `lib/screens/add_data_screen.dart`
- `lib/screens/sync_status_screen.dart`
- `lib/services/database_helper.dart`
- `lib/services/frappe_service.dart`
- `lib/services/sync_service.dart`
- `lib/services/ultra_msg_service.dart`
- `lib/l10n/app_localizations.dart`
- `lib/l10n/app_en.dart`
- `lib/l10n/app_ta.dart`

Uploaded image assets:

- `images.png`
- `logo.png`
- `round.png`
- `whatsapp.png`
- `wttlogo.png`

`pubspec.yaml` declares Flutter localization plus `http`, `shared_preferences`, `sqflite`, `path`, `connectivity_plus`, and `flutter_spinkit`.

## 2. Application startup (`main.dart`)

Flutter behavior:

- checks connectivity at startup;
- initializes SQLite;
- reads the saved language (`en` or `ta`) from SharedPreferences;
- attempts pending sync when online;
- starts a 30-second periodic sync timer;
- launches `HomeScreen` with a green Material 3 theme.

Flask/web mapping:

- Flask initializes the server SQLite database at process startup;
- browser language is retained in `localStorage`;
- `navigator.onLine` maps browser connectivity state;
- JavaScript retries browser queued data every 30 seconds;
- the Sync Status page triggers server pending sync;
- a service worker caches the three main pages and static assets.

## 3. Data model (`agriculture_data.dart`)

Original fields:

- id
- name
- mobile number
- address
- water requirement
- water source
- crops
- acres of land
- soil type
- optional other soil type
- water parameters
- advance received
- optional advance amount
- Google synced flag
- ERP synced flag
- created timestamp
- synced timestamp

The Flask `AgricultureData` dataclass preserves these fields. A `client_submission_id` was added solely to safely deduplicate browser retries.

Google Sheets mapping is preserved, including the original display column names. If soil type is Others, Google receives the free-text other soil description.

Frappe mapping is preserved:

- `customer_name`
- `mobile_number`
- `address`
- `water_requirement`
- `source_of_water`
- `crops`
- `acres_of_land`
- `soil_type`
- `water_parameters`
- `advance_received`
- `advance_amount`

## 4. Home screen (`home_screen.dart`)

Original UI:

- green app bar;
- 30x30 logo in title;
- English/Tamil toggle;
- sync icon in app bar;
- pale green-to-white background gradient;
- 140x140 circular logo with green shadow;
- subtitle and description;
- green "Add New Entry" button;
- green outlined "View Sync Status" button.

The Flask `home.html` and CSS reproduce this layout in responsive web form.

## 5. Add Data screen (`add_data_screen.dart`)

Original fields and rules:

1. Name - required.
2. Mobile Number - required; original checks minimum string length 10.
3. Address / District - required.
4. Water Requirement per day - required numeric value.
5. Source of Water - required.
6. Crops - required.
7. Acres of Land - required numeric value.
8. Type of Soil - dropdown.
9. Specify Soil Type - shown only for Others and required in that state.
10. Water Parameters - required, multiline.
11. Advance Received - checkbox.
12. Advance Amount - shown only when advance is checked; required numeric value.

The web form preserves all fields and conditional behavior. Mobile and numeric validation is performed in JavaScript and repeated on the Flask server.

### Original submit flow

When online:

1. call `SyncService.sendSingleData`;
2. Google Sheets is attempted first;
3. ERP is attempted only if Google succeeded;
4. if both succeed, no local row is kept;
5. if partial/failed, local SQLite is used for retry;
6. WhatsApp English and Tamil confirmations are attempted.

When offline:

1. record is inserted locally;
2. UI reports it will sync later;
3. form is cleared.

Web adaptation:

- If Flask cannot be reached, the browser stores the form in its offline queue.
- If Flask is reachable but an upstream target fails, Flask stores the row in server SQLite.
- Both states appear on the Sync Status page.

## 6. SQLite helper (`database_helper.dart`)

Original table fields and separate sync flags are preserved.

Important source issue: `_initDatabase()` unconditionally calls `deleteDatabase(fullPath)` before opening the database. This means the Flutter application's pending offline records are erased on each fresh initialization. The Flask version intentionally does not reproduce this destructive behavior.

The Flask SQLite layer uses WAL mode and keeps pending data until both sync flags are complete.

## 7. Google/ERP synchronization (`sync_service.dart` and `frappe_service.dart`)

### Google Sheets

Flutter posts:

```json
{
  "action": "append",
  "data": [ ... ]
}
```

to the supplied Google Apps Script deployment. The mobile code uses a fixed Google IP and a `Host: script.google.com` header, with certificate checking disabled, apparently to bypass DNS problems.

The Flask service retains this IP + Host method when configured and also has a standard hostname fallback.

### Frappe

Flutter posts JSON to the supplied WTT ERP method and considers the request successful when HTTP 200 returns JSON where `message.status == "success"`.

The Flask implementation keeps the same success rule.

### Retry behavior

The Flutter retry path independently retries whichever Google/ERP flag is false. Once both are true, the local record is deleted. The Flask server queue uses the same separate-flag retry model.

## 8. Sync Status screen (`sync_status_screen.dart`)

Original behavior:

- shows online/offline connection state;
- shows pending count or all-synced state;
- automatically invokes sync when pending data exists and connectivity is available;
- lists pending records with name, mobile, crops and created time;
- has refresh and manual sync controls.

The Flask page adds one useful distinction required by web architecture:

- browser offline queue;
- server retry queue.

Server items also display Google and ERP flag status.

## 9. WhatsApp (`ultra_msg_service.dart`)

The Flutter source uses UltraMsg and:

- strips non-digits from the phone number;
- adds India country code `91` when absent;
- sends one English confirmation;
- sends one Tamil confirmation;
- first tries the UltraMsg domain;
- then falls back to a fixed IP with Host/SNI logic.

The Flask service preserves both messages and the domain/IP fallback pattern. Credentials are moved to `.env` instead of being hardcoded in application source.

## 10. Localization (`app_en.dart`, `app_ta.dart`)

The English and Tamil application strings from the Flutter files are reproduced in browser JavaScript and also retained in `translations.py`. The language choice is persisted in `localStorage`, equivalent to the Flutter SharedPreferences setting.

## 11. Source defects corrected during conversion

### A. Database deleted at startup

Flutter deletes its SQLite file during initialization. Fixed in Flask so pending records survive restarts.

### B. Possible duplicate insert after failed online sync

`SyncService.sendSingleData()` already inserts a partial/failed submission into SQLite, but `AddDataScreen._submitForm()` inserts the same data again when that method returns `false`. Flask uses a unique client submission ID to prevent duplicate queue rows.

### C. Browser retry duplicate safety

A browser may submit successfully to Flask but lose the HTTP response. Retrying the same client ID will not create another pending row.

## 12. Flutter-to-web technology mapping

| Flutter | Flask web replacement |
|---|---|
| `MaterialApp` / `Scaffold` | Jinja templates + responsive CSS |
| `Navigator.push` | Flask routes/links |
| `SharedPreferences` | Browser `localStorage` |
| `sqflite` | Flask/server SQLite + browser offline queue |
| `ConnectivityPlus` | `navigator.onLine` + fetch success/failure |
| `Timer.periodic(30s)` | JavaScript `setInterval(..., 30000)` |
| `http` / `IOClient` | Python `requests` |
| app localization delegate | JavaScript i18n map |
| Android/iOS app icon assets | favicon/PWA manifest icon |

## 13. Final converted route mapping

| Flutter screen/action | Flask route/API |
|---|---|
| HomeScreen | `GET /` |
| AddDataScreen | `GET /add` |
| SyncStatusScreen | `GET /sync-status` |
| `sendSingleData` | `POST /api/submit` |
| `getUnsyncedData` | `GET /api/pending` |
| `syncPendingData` | `POST /api/sync` |
