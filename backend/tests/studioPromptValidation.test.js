const test=require('node:test'),assert=require('node:assert/strict');
const {validateVideoPrompt}=require('../services/studioPromptValidation');
const {studioErrorMessage}=require('../utils/studioErrorMessage');
test('Wan limit is checked without altering prompts or blocking image-only work',()=>{
  const options={tier:'budget',prompt:'a'.repeat(5001)};
  assert.throws(()=>validateVideoPrompt(options,'both'),{code:'PROMPT_TOO_LONG'});
  assert.equal(options.prompt.length,5001);
  assert.doesNotThrow(()=>validateVideoPrompt(options,'image'));
  assert.doesNotThrow(()=>validateVideoPrompt({...options,prompt:'a'.repeat(5000)}));
  assert.doesNotThrow(()=>validateVideoPrompt({...options,tier:'flagship',model:'hf_mult_motion_control'}));
});
test('provider validation errors never dump the full prompt into the UI',()=>{
  const message=studioErrorMessage('params failed validation [{"type":"string_too_long","loc":["prompt"],"msg":"String should have at most 5000 characters","input":"PRIVATE FULL PROMPT"}]');
  assert.match(message,/5,000/);assert.ok(!message.includes('PRIVATE FULL PROMPT'));
});
