import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const names=['01_ai_assistant.png','02_risk_officer.png','03_trader.png','04_research_mentor.png'];
const assets={};
// A complete delivery must never silently omit required character art.
for(const f of names) assets[f]='data:image/png;base64,'+(await readFile(new URL('dist/assets/'+f,root))).toString('base64');
let html=await readFile(new URL('dist/index.html',root),'utf8');
const css=await readFile(new URL('dist/style.css',root),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+css+'</style>');
const feedbackCss=await readFile(new URL('dist/feedback.css',root),'utf8');
html=html.replace('<link rel="stylesheet" href="feedback.css">',()=>'<style>'+feedbackCss+'</style>');
for(const f of ['engine.js','city.js','providers.js','analyst.js','city-art.js','ai-client.js','app.js']){
 let source=await readFile(new URL('dist/'+f,root),'utf8');
 if(f==='app.js')source=source.replace('src="assets/${p.file}"','src="${window.PANDA_EMBEDDED_ASSETS[p.file]}"');
 const tag='<script src="'+f+'"></script>';
 if(!html.includes(tag))throw Error('Missing script tag: '+f);
 html=html.replace(tag,()=>'<script>'+source.replaceAll('</script','<\\/script')+'</script>');
}
html=html.replace('<script>',()=>'<script>window.PANDA_EMBEDDED_ASSETS='+JSON.stringify(assets)+';</script><script>');
await writeFile(new URL('量化董事会-离线版.html',root),html);
console.log('Standalone HTML generated with four portraits, CSS and seven scripts.');
