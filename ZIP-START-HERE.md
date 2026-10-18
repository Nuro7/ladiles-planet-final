# Developer ZIP handover

Extract this entire ZIP into one project folder. It already contains the source and all 1,275 media files from handover/MEDIA-MANIFEST.json in their original relative locations. You do not need a separate media ZIP; references in README.md to the separate media archive apply only to the GitHub handover workflow.

Start with README.md, then handover/DEVELOPER-GUIDE.md and handover/SECURITY-REVIEW.md. Install dependencies with npm ci separately in backend and frontend; node_modules and build outputs are excluded. Fill each .env privately from .env.example. Database credentials and Higgsfield sign-in must be configured separately. No existing OAuth tokens, customer histories or backend/data records are bundled.

The ZIP is a cleaned source export, not a production deployment. Some media can contain identifiable people; share it privately with the authorized developer. GitHub setup is not required to use this ZIP. Do not run paid generation without the owner's approval.
