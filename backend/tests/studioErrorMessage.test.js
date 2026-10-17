const test=require('node:test');
const assert=require('node:assert/strict');
const {studioErrorMessage}=require('../utils/studioErrorMessage');
test('Browser locator logs are not exposed to clients',()=>{
  const message=studioErrorMessage(new Error("locator.click: Timeout 1500ms exceeded. Call log: \u001b[2m getByRole('navigation') outside of the viewport"));
  assert.ok(message.includes('uploads are saved'));
  assert.doesNotMatch(message,/locator|1500ms|\u001b|viewport/);
});
test('Actionable consent and login instructions remain visible',()=>{
  assert.equal(studioErrorMessage(new Error('Please review the video rights confirmation.')),'Please review the video rights confirmation.');
});
test('Result-download failures do not expose the saved prompt or filenames', () => {
  const result = studioErrorMessage('The finished tile is no longer in the grid ("PRIVATE PROMPT fm-bride.jpg"). The media is still in Flow: flow_download fetches it.');
  assert.match(result, /Recover this saved request/);
  assert.doesNotMatch(result, /PRIVATE|fm-bride|flow_download/);
});
