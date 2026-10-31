const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/..',html=fs.readFileSync(root+'/量化董事会-离线版.html','utf8');
assert.ok(!/<script[^>]+src=|<link[^>]+href=/.test(html));
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);assert.equal(scripts.length,8);
const context={window:{}};vm.runInNewContext(scripts[0],context);
const assets=context.window.PANDA_EMBEDDED_ASSETS;assert.equal(Object.keys(assets).length,4);
for(const [name,data] of Object.entries(assets))assert.deepEqual(Buffer.from(data.split(',')[1],'base64'),fs.readFileSync(root+'/dist/assets/'+name));
for(const s of scripts)new vm.Script(s);
for(const [i,name] of ['engine.js','city.js','providers.js','analyst.js','city-art.js','ai-client.js','app.js'].entries()){
 let s=fs.readFileSync(root+'/dist/'+name,'utf8');if(name==='app.js')s=s.replace('src="assets/${p.file}"','src="${window.PANDA_EMBEDDED_ASSETS[p.file]}"');assert.equal(scripts[i+1],s.replaceAll('</script','<\\/script'));
}
for(const name of ['.env.example','CODEX_HANDOFF.md','server/api.mjs','server/server.mjs','server/worker.mjs'])assert.ok(fs.existsSync(root+'/'+name));
assert.match(html,/量化董事会/);
assert.ok(!/量化之城|总裁|霓虹|NEON/.test(html));
console.log('PASS: complete offline asset bytes, seven current scripts, required handoff/server files, no old display name.');
