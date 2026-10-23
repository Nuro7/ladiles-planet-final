// Platform bridge: serves the existing queue without opening the standalone panel.
import { LocalCore } from "./core.js";
import { startServer } from "./server.js";
const role = await startServer(new LocalCore());
if (role === "none") { console.error("Budget worker port is used by another application."); process.exit(1); }
if (role === "client") process.exit(0);
console.log("Platform Budget worker is ready on localhost.");
