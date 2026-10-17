const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config({quiet:true});
const mcp = require('../services/higgsfieldMCPClient');

test('preset suggestion retry preserves quote-only flag, exact prompt, model and references', async () => {
  const original=mcp._mcpCall, calls=[];
  const params={model:'wan3_0_prime',prompt:'Exact owner prompt',resolution:'720p',get_cost:true,medias:[{role:'video_references',value:'reference-id'}]};
  mcp._mcpCall=async (name,input)=>{
    calls.push({name,input});
    return calls.length===1 ? {notice:{type:'preset_recommendation',data:{retry_literal_with:{declined_preset_id:'preset-id'}}}} : {cost:{credits_exact:12}};
  };
  try {
    assert.equal((await mcp._submitVideoJob(params)).cost.credits_exact,12);
    assert.equal(calls.length,2);
    assert.deepEqual(calls[1].input.params,{...params,declined_preset_id:'preset-id'});
    assert.ok(calls.every(call=>call.input.params.get_cost===true));
  } finally {mcp._mcpCall=original;}
});
