const test=require('node:test');
const assert=require('node:assert/strict');
require('dotenv').config({quiet:true});
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
