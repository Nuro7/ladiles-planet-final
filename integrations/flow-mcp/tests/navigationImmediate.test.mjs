import test from 'node:test';
import assert from 'node:assert/strict';
import {selectAllMedia} from '../dist/flow.js';
test('Missing legacy navigation does not attempt a 30-second click',async()=>{
  const hidden={isVisible:async()=>false,click:async()=>{throw Error('Hidden click must not run');}};
  const page={getByRole:()=>({getByText:()=>hidden}),getByText:()=>({all:async()=>[]})};
  assert.equal(await selectAllMedia(page),false);
});
test('Visible newer sidebar uses a bounded click',async()=>{
  let timeout;
  const page={getByRole:()=>({getByText:()=>({isVisible:async()=>false})}),getByText:()=>({all:async()=>[{isVisible:async()=>true,click:async opts=>{timeout=opts.timeout;}}]})};
  assert.equal(await selectAllMedia(page),true);assert.equal(timeout,1500);
});
test('Offscreen legacy navigation falls back without failing preparation',async()=>{
  let activated=false;
  const item={isVisible:async()=>true,click:async()=>{throw Error('element is outside of the viewport');},evaluate:async callback=>callback({closest:()=>null,getAttribute:()=>null,click:()=>{activated=true;}})};
  const page={getByRole:()=>({getByText:()=>item}),getByText:()=>({all:async()=>[]})};
  assert.equal(await selectAllMedia(page),true);
  assert.equal(activated,true);
});
test('Disappearing navigation does not expose a locator timeout',async()=>{
  const item={isVisible:async()=>true,click:async()=>{throw Error('locator.click timeout');},evaluate:async()=>{throw Error('Detached');}};
  const page={getByRole:()=>({getByText:()=>item}),getByText:()=>({all:async()=>[]})};
  assert.equal(await selectAllMedia(page),false);
});
