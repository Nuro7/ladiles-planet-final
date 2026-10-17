const test = require('node:test');
const assert = require('node:assert/strict');
const {itemsFrom,failureFor} = require('../services/higgsfieldJobState');
test('provider rejections stop polling and preserve copyright reasons',()=>{
  for(const status of ['FAILED','rejected','content-policy-violation','NSFW','canceled','moderation_failed']) {
    const error=failureFor({status,error:{message:'Reference rejected for copyright.'}});
    assert.equal(error.code,'PROVIDER_JOB_REJECTED');
    assert.equal(error.message,'Reference rejected for copyright.');
  }
  assert.equal(failureFor({status:'in_progress'}),null);
  assert.equal(failureFor({status:'completed'}),null);
  assert.match(failureFor({status:'ip_detected'}).message,/copyright/);
});
test('history and direct job responses are supported',()=>{
  for(const response of [{items:[{id:'a'}]},{results:[{id:'a'}]},{data:{items:[{id:'a'}]}}]) assert.equal(itemsFrom(response)[0].id,'a');
});
