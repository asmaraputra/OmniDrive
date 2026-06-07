# Omnidrive Automation & Rules Engine Design Spec

## Overview
This feature adds an "IFTTT/Zapier"-like automation engine to Omnidrive, allowing users to define rules that automatically manage their files (e.g., auto-move or auto-copy files based on conditions).

## Architecture & Trigger Types
The engine supports a "Hybrid" execution model running directly on Cloudflare Workers using `ctx.waitUntil()` to avoid blocking user API requests or requiring new infrastructure like Cloudflare Queues.

1. **Event-Based (Real-time)**: Triggers run synchronously immediately after a file is uploaded or modified (e.g. `POST /api/files`). The rule evaluation runs fast, and the execution is offloaded to the background via `ctx.waitUntil()`.
2. **Scheduled (Cron)**: Triggers run on a defined schedule using the worker's existing `scheduled()` event handler. When the cron fires, it finds active cron rules, searches for matching files, and processes them.

### Limitations & Trade-offs
- Since execution runs within `ctx.waitUntil()`, it is subject to Cloudflare Worker execution limits (typically ~30 seconds for subrequests/background tasks). Extremely large file copies might time out, but this is acceptable for the initial scope as it keeps the architecture simple and cost-free.

## Database Schema (D1 SQLite)

Two new tables will be added to the D1 database.

### 1. `automation_rules`
Stores the user-defined rules.
- `id` (TEXT PRIMARY KEY)
- `user_id` (TEXT NOT NULL, references `users(id)`)
- `name` (TEXT NOT NULL)
- `trigger_type` (TEXT NOT NULL) - Evaluates to `'event'` or `'cron'`
- `trigger_config` (TEXT) - JSON object (e.g., `{"event": "file.created"}` or `{"cron": "0 0 * * *"}`)
- `conditions` (TEXT) - JSON array of conditions (e.g., `[{"field": "name", "operator": "endswith", "value": ".pdf"}]`)
- `actions` (TEXT) - JSON array of actions (e.g., `[{"type": "move", "target_folder_id": "folder_123"}]`)
- `is_active` (INTEGER NOT NULL DEFAULT 1) - Boolean toggle
- `created_at` / `updated_at` (TEXT NOT NULL DEFAULT (datetime('now')))

### 2. `automation_logs`
Tracks the history of rule executions.
- `id` (TEXT PRIMARY KEY)
- `rule_id` (TEXT NOT NULL, references `automation_rules(id)`)
- `status` (TEXT NOT NULL) - Evaluates to `'success'` or `'error'`
- `details` (TEXT) - JSON detailing success info or error traces
- `executed_at` (TEXT NOT NULL DEFAULT (datetime('now')))

## API Endpoints (Backend)
New endpoints to manage automation rules (mounted under `/api/automations`):
- `GET /api/automations`: Fetch all rules for the authenticated user.
- `POST /api/automations`: Create a new rule.
- `PUT /api/automations/:id`: Update an existing rule (including toggling `is_active`).
- `DELETE /api/automations/:id`: Delete a rule.
- `GET /api/automations/:id/logs`: Fetch recent execution logs for a specific rule.

## Frontend UI (`packages/web`)
1. **Navigation**: A new "Automations" tab in the main sidebar.
2. **Rule Builder**: A form to create/edit rules, with sections:
   - **Trigger**: Select between "On File Change" (Event) or "Schedule" (Cron).
   - **Conditions**: Add rules checking file attributes (Name, Extension, Source Drive).
   - **Actions**: Select an action (Move, Copy, Delete) and pick the destination folder using a folder picker component.
3. **Management List**: A card-based layout listing all rules, showing their active status (via a toggle switch), and a button to view recent logs.

## Testing Strategy
- **Unit Tests**: Test the engine's condition evaluator logic to ensure it correctly matches file names/extensions against rule conditions.
- **Integration Tests**: Test the API endpoints for CRUD operations on rules.
- **End-to-End**: Test an event-triggered flow by uploading a mock file and asserting it gets moved if a matching rule exists.
