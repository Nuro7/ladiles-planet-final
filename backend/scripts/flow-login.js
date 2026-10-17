const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.FLOW_MCP_HOME ||= path.join(__dirname, '..', 'data', 'flow-mcp');
process.env.FLOW_MCP_VISIBLE = 'true';
(async () => {
  const { getFlowPage, ensureFlowProject } = await import('../../integrations/flow-mcp/dist/chrome.js');
  const page = await getFlowPage();
  await page.bringToFront();
  console.log('Sign in manually in the dedicated Google Flow browser.');
  try { await ensureFlowProject(); console.log('The saved project is ready.'); }
  catch { console.log('After signing in, the platform will open or restore its project automatically.'); }
})().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
