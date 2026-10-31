import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/worker.mjs';

test('worker rate limits paid API routes before provider execution',async()=>{
  const env={AI_RATE_LIMITER:{limit:async()=>({success:false})},ASSETS:{fetch:async()=>new Response('asset')}};
  const response=await worker.fetch(new Request('https://game.test/api/dialogue',{method:'POST',headers:{'cf-connecting-ip':'192.0.2.1'}}),env);
  assert.equal(response.status,429);
  assert.deepEqual(await response.json(),{error:'rate_limited'});
});

test('worker serves static assets without invoking the API limiter',async()=>{
  let calls=0;
  const env={AI_RATE_LIMITER:{limit:async()=>{calls++;return {success:true}}},ASSETS:{fetch:async()=>new Response('asset')}};
  const response=await worker.fetch(new Request('https://game.test/style.css'),env);
  assert.equal(await response.text(),'asset');
  assert.equal(calls,0);
});
