# Scenario Reference Images

This folder holds the **hidden style-anchor images** that the backend
automatically attaches to specific scenarios when generating videos.

The client UI never sees these — they're injected by the backend.

---

## Current scenario: `outdoor_romantic` 🌿

Save your 4 outdoor pre-wedding reference images here with these exact names:

| Filename | What it should show |
|---|---|
| `outdoor-1.jpg` | Closeup of bride & groom hugging (with mehndi hands) |
| `outdoor-2.jpg` | Wide shot in lush green garden with flowing lehenga |
| `outdoor-3.jpg` | Groom adjusting bride's maang tikka — emotional closeup |
| `outdoor-4.jpg` | Bride and groom walking together holding hands |

**File format:** JPG, PNG, or WebP. JPG recommended (smaller).
**Resolution:** 1024x1280 minimum. Higher = better.

---

## How to upload to Supabase

```bash
cd backend
node scripts/upload-scenario-refs.js
```

The script reads every image in this folder and uploads it to:
```
{SUPABASE_URL}/storage/v1/object/public/ladies-planet/scenario-refs/<filename>
```

Re-run anytime to overwrite (uses `upsert`).

---

## Adding more scenarios

To add anchor images for other scenarios (e.g. `mandap_moment`):
1. Save images here with prefix `mandap-1.jpg`, `mandap-2.jpg`, etc.
2. Run the upload script — it uploads ALL files in this folder
3. Add the URLs to `services/bridalScenarioPrompts.js` → scenario's `referenceImages` array
