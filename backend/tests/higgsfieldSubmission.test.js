const test=require('node:test');
const assert=require('node:assert/strict');
process.env.NODE_ENV='test';
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_KEY='test-public';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-private';
const {submittedJob}=require('../services/higgsfieldSubmission');
const h=require('../services/studioHiggsfieldService');
const mcp=require('../services/higgsfieldMCPClient');
test('provider rejections retain the actual reason instead of becoming uncertain',()=>{
  for(const response of [{error:{message:'Too many reference images'}},{text:'Reference duration exceeded'},{notice:{message:'Choose billing source'}}]) {
    assert.throws(()=>submittedJob(response),error=>error.code==='PROVIDER_REQUEST_REJECTED' && !/uncertain/.test(error.message));
  }
  assert.throws(()=>submittedJob({}),{code:'SUBMISSION_UNCERTAIN'});
  assert.equal(submittedJob({data:{job:{id:'accepted'}}}).id,'accepted');
  assert.equal(submittedJob({results:[{id:'saved-job',status:'failed'}]}).id,'saved-job');
});
test('rejected paid submission is never automatically resubmitted',async()=>{
  const original=mcp._mcpCall,calls=[],responses=[];
  mcp._mcpCall=async(name,input)=>{
    calls.push({name,input});
    if(input.params.get_cost)return {cost:{credits:12}};
    return {error:{message:'Maximum reference image count exceeded'}};
  };
  try {
    await assert.rejects(h.makeVideo({options:{tier:'custom',model:'wan3_0_prime',generationMode:'speed',prompt:'Exact prompt',duration:10,resolution:'480p',approvedCreditCosts:{video:12}},references:[],sessionId:'test',onResponse:async r=>responses.push(r)}),/Maximum reference image count exceeded/);
    assert.equal(calls.filter(x=>!x.input.params.get_cost).length,1);
    assert.ok(responses[0].error);
  } finally {mcp._mcpCall=original;}
});
test('timeout after paid POST remains uncertain and is never resubmitted',async()=>{
  const original=mcp._mcpCall;let paid=0;
  mcp._mcpCall=async(name,input)=>{if(input.params.get_cost)return {cost:{credits:12}};paid++;throw new Error('timeout');};
  try {
    await assert.rejects(h.makeVideo({options:{tier:'custom',model:'wan3_0_prime',generationMode:'speed',prompt:'Exact prompt',duration:10,resolution:'480p',approvedCreditCosts:{video:12}},references:[],sessionId:'test'}),{code:'SUBMISSION_UNCERTAIN'});
    assert.equal(paid,1);
  } finally {mcp._mcpCall=original;}
});
test('null or negative quotes cannot authorize generation',()=>{
  for(const credits of [null,-1,''])assert.throws(()=>h.quotedCredits({cost:{credits}}));
  assert.equal(h.quotedCredits({cost:{credits:0}}),0);
});

test('production spend switch blocks even a previously approved quote',async()=>{
  const previousEnv=process.env.NODE_ENV, previousSpend=process.env.HIGGSFIELD_SPEND_ENABLED;
  const original=mcp._mcpCall;let paid=0;
  process.env.NODE_ENV='production';process.env.HIGGSFIELD_SPEND_ENABLED='false';
  mcp._mcpCall=async(name,input)=>{if(input.params.get_cost)return {cost:{credits:12}};paid++;throw new Error('Unexpected paid call');};
  try {
    await assert.rejects(h.makeVideo({options:{tier:'custom',model:'wan3_0_prime',generationMode:'speed',prompt:'test',duration:8,resolution:'480p',approvedCreditCosts:{video:12}},references:[],sessionId:'test'}),{code:'OWNER_APPROVAL_REQUIRED'});
    assert.equal(paid,0);
  } finally {
    mcp._mcpCall=original;
    if(previousEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previousEnv;
    if(previousSpend===undefined)delete process.env.HIGGSFIELD_SPEND_ENABLED;else process.env.HIGGSFIELD_SPEND_ENABLED=previousSpend;
  }
});
