const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict'),G=require('../dist/engine.js');
const html=fs.readFileSync(__dirname+'/../dist/index.html','utf8');

(async()=>{
  const state=G.fresh('金额测试',true,'探索基础',10000,91);
  state.tutorial='done';state.view='board';G.draw(state);
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://investment.test'}),w=dom.window;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.HTMLElement.prototype.showPopover=function(){this.dataset.topLayer='true'};
  w.HTMLElement.prototype.hidePopover=function(){delete this.dataset.topLayer};
  w.matchMedia=()=>({matches:true});w.fetch=async()=>({json:async()=>({mode:'mock'})});
  w.localStorage.setItem('panda-neon-v1',JSON.stringify(state));
  for(const f of ['engine.js','city.js','analyst.js','city-art.js','ai-client.js','app.js'])w.eval(fs.readFileSync(__dirname+'/../dist/'+f,'utf8'));
  await new Promise(resolve=>w.setTimeout(resolve,0));

  assert.equal(w.document.querySelectorAll('[data-do=choose]').length,3);
  assert.match(w.document.querySelector('.gamechoices').textContent,/投入 · 金额由你决定/);
  assert.match(w.document.querySelector('.gamechoices').textContent,/不投 · 保留现金/);
  assert.match(w.document.querySelector('.gamechoices').textContent,/先查资料 · 研究/);

  const term=w.document.querySelector('[data-do=termHelp]');
  assert.ok(term,'event concept should be visibly explainable');
  term.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  assert.match(w.document.querySelector('#modal').textContent,/一句话解释/);
  assert.match(w.document.querySelector('#modal a').href,/pandaaiquant\.com\/learninghub\/newcourse/);
  w.document.querySelector('#modal').close();

  w.document.querySelector('[data-do=choose][data-id=custom]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  const amount=w.document.querySelector('#investAmount');amount.value='1200';amount.dispatchEvent(new w.Event('input',{bubbles:true}));
  const current=JSON.parse(w.localStorage.getItem('panda-neon-v1'));
  assert.equal(current.draft.amount,1200);
  assert.match(w.document.querySelector('#investOutcome').textContent,/投入占现有现金 12%/);
  assert.match(w.document.querySelector('#investOutcome').textContent,/如果上涨/);
  assert.match(w.document.querySelector('#investOutcome').textContent,/如果下跌/);
  w.document.querySelector('[data-do=confirm]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  assert.equal(w.document.querySelector('#toast').dataset.topLayer,'true');
  assert.equal(JSON.parse(w.localStorage.getItem('panda-neon-v1')).ledger[0].amount,1200);
  w.close();console.log('PASS: clickable glossary, flexible amount, proportional outcome preview and top-layer feedback.');
})().catch(error=>{console.error(error);process.exit(1)});
