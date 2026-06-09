# Factory Reset Command Design Specification

## Overview
A secure, automated command to perform a "factory reset" on the OmniDrive data stores (D1 Database and KV Namespace). This command wipes all existing data and re-applies the base schema, allowing developers to start fresh with the onboarding process.

## Architecture & Integration
- **File**: `packages/worker/scripts/reset.mjs` (Node.js ECMAScript Module).
- **Package Scripts** (`packages/worker/package.json`):
  - `"db:reset:local": "node scripts/reset.mjs --local"`
  - `"db:reset:remote": "node scripts/reset.mjs --remote"`
- **Makefile Targets** (Root directory):
  - `make reset-local` (Delegates to worker's `db:reset:local`)
  - `make reset-remote` (Delegates to worker's `db:reset:remote`)

## Security & Safeguards
- **Remote Protection**: When running with the `--remote` flag, the script uses the Node.js `readline` module to block execution and prompt the user.
- **Prompt Message**: `PERINGATAN: Anda akan menghapus SELURUH data di PRODUCTION. Ketik 'YES' untuk melanjutkan: `
- **Validation**: Execution only proceeds if the exact string `"YES"` is entered. Any other input safely aborts the script.
- **Local Exemption**: When running with the `--local` flag, the prompt is completely bypassed to maintain a fast developer experience.

## Reset Process

### 1. D1 Database Reset
The script avoids hardcoded table names by performing a comprehensive schema wipe, then rebuilding it:
1. **Wipe Command**: 
   Executes `wrangler d1 execute omnidrive [--local/--remote] --command="PRAGMA writable_schema = 1; delete from sqlite_master where type in ('table', 'index', 'trigger'); PRAGMA writable_schema = 0; VACUUM;"`
2. **Rebuild Command**: 
   Executes `wrangler d1 execute omnidrive [--local/--remote] --file=src/db/schema.sql` to re-apply the base database schema.

### 2. KV Namespace Reset
Since Cloudflare KV lacks a native "Wipe All" command, the script handles the cleanup systematically:
1. **Fetch Keys**: Executes `wrangler kv:key list --binding=KV [--local/--remote]` to retrieve all existing keys.
2. **Parse & Format**: Parses the JSON output to extract the keys.
3. **Bulk Delete**: Generates a temporary JSON file containing the keys in the required format and executes `wrangler kv:bulk delete --binding=KV [--local/--remote] temporary_keys.json` to perform a mass deletion. The temporary file is cleaned up after execution.
*(Note: For the `--local` flag, if wrangler bulk delete behaves inconsistently, the script may alternatively clear the local `.wrangler/state/v3/kv` directory directly as an optimization).*
