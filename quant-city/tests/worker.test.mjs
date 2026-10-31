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

test('worker permits CORS only for the configured GitHub Pages origin',async()=>{
  const origin='https://angela19990616-alt.github.io',env={PUBLIC_ORIGIN:origin,ASSETS:{fetch:async()=>new Response('asset')}};
  const allowed=await worker.fetch(new Request('https://game.test/api/dialogue',{method:'OPTIONS',headers:{origin}}),env);
  assert.equal(allowed.status,204);assert.equal(allowed.headers.get('access-control-allow-origin'),origin);
  const denied=await worker.fetch(new Request('https://game.test/api/dialogue',{method:'OPTIONS',headers:{origin:'https://evil.example'}}),env);
  assert.equal(denied.status,403);assert.equal(denied.headers.get('access-control-allow-origin'),null);
});
