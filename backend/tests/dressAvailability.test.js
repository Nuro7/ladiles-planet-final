const test = require('node:test');
const assert = require('node:assert/strict');
const { dressAvailability } = require('../utils/dressAvailability');
test('Missing availability defaults to available; explicit false is preserved',()=>{
  assert.equal(dressAvailability(undefined),true);
  for (const value of [true,'true']) assert.equal(dressAvailability(value),true);
  for (const value of [false,'false']) assert.equal(dressAvailability(value),false);
  assert.throws(()=>dressAvailability('anything'),/true or false/);
});
