const { JSDOM } = require("jsdom"),
  fs = require("fs"),
  assert = require("node:assert/strict"),
  G = require("../dist/engine.js");
const html = fs.readFileSync(__dirname + "/../dist/index.html", "utf8");
function boot(storage) {
  const dom = new JSDOM(html, {
      runScripts: "outside-only",
      url: "https://game.test",
    }),
    w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.matchMedia = () => ({ matches: true });
  w.fetch = async () => ({ json: async () => ({ mode: "mock" }) });
  if (storage) w.localStorage.setItem("panda-neon-v1", storage);
  for (const f of ["engine.js", "city.js", "analyst.js", "city-art.js", "ai-client.js", "app.js"]) w.eval(fs.readFileSync(__dirname + "/../dist/" + f, "utf8"));
  return w;
}
let w = boot();
const q = (s) => w.document.querySelector(s),
  click = (s) => {
    assert.ok(q(s), "missing " + s);
    q(s).dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  },
  input = (s, v) => {
    q(s).value = v;
  },
  submit = (s) => q(s).dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })),
  state = () => JSON.parse(w.localStorage.getItem("panda-neon-v1")),
  reload = () => {
    const stored = w.localStorage.getItem("panda-neon-v1");
    w.close();
    w = boot(stored);
  };
(async () => {
  assert.ok(q("[data-do=askName]"));
  assert.ok(q(".opening .vn-character"), "opening story should be integrated with the character portrait");
  assert.doesNotMatch(q(".opening .vn-dialogue").textContent, /每天处理 3 份|第 4 天|已经懂投资/);
  assert.match(q(".opening .vn-dialogue").textContent, /董事会只给你三天/);
  assert.equal(q(".game-dock"), null);
  click("[data-do=askName]");
  submit("#start");
  assert.ok(q("#start"));
  input("#nickname", "<img>总");
  submit("#start");
  assert.equal(state().tutorial, "briefing");
  assert.match(q(".vn-dialogue").textContent, /每天处理 3 份市场来信/);
  assert.ok(q("[data-do=skipTutorial]"), "tutorial should always offer a visible skip action");
  assert.ok(!q(".vn-dialogue").textContent.includes("<img>总"));
  assert.equal(q(".vn-dialogue img"), null);
  click("[data-do=startTutorial]");
  assert.ok(q(".vn-dialogue").textContent.includes("第一封市场来信"));
  assert.equal(state().tutorial, "draw");
  reload();
  assert.ok(q("[data-do=draw]"));
  const old = q("[data-do=draw]");
  old.click();
  old.click();
  assert.equal(state().phase, "drawing");
  const seed = state().event.seed;
  click("[data-do=cancelDraw]");
  click("[data-do=draw]");
  assert.equal(state().event.seed, seed);
  click("[data-do=reveal]");
  assert.equal(state().tutorial, "decision");
  assert.equal(state().npc, 3);
  assert.ok(q(".eventcard").textContent.includes("价值低吸"));
  assert.equal(q(".pro-strip").children.length, 4);
  assert.ok(q(".eventcard").textContent.includes("配置资金"));
  assert.ok(q(".eventcard").textContent.includes("补充研究"));
  assert.ok(q(".eventcard").textContent.includes("保持现金"));
  reload();
  assert.ok(q("[data-do=choose]"));
  click("[data-do=choose][data-id=small]");
  q("#modal").dispatchEvent(new w.Event("cancel"));
  q("#modal").close();
  assert.equal(state().draft, null);
  click("[data-do=choose][data-id=skip]");
  assert.ok(q("#modal").textContent.includes("不投入 +1"));
  input("#reason", "先观察，再保留预算建设城市");
  const confirm = q("[data-do=confirm]");
  confirm.click();
  confirm.click();
  assert.equal(state().ledger.length, 1);
  assert.equal(state().tutorial, "reward");
  reload();
  const reward = q("[data-do=tutorialReward]");
  reward.click();
  reward.click();
  assert.equal(state().city.materials.momentum, 3);
  assert.equal(state().tutorial, "build");
  reload();
  click("[data-do=district][data-id=defense]");
  q("input[name=factor][value=lowvol]").checked = true;
  click("[data-do=buildCity]");
  assert.equal(state().tutorial, "finish");
  assert.ok(q(".vn-dialogue").textContent.includes("花费 1000"));
  assert.ok(q(".building-defense"), "constructed districts should render their distinct building silhouette");
  assert.ok(q(".tower-sign"), "constructed buildings should include facade signage");
  reload();
  click("[data-do=finishTutorial]");
  assert.ok(q(".game-dock"));
  assert.equal(state().round, 1);
  assert.equal(state().tutorial, "done");
  click("[data-do=warehouse]");
  assert.equal(w.document.querySelectorAll(".strategy-family").length, 4);
  assert.match(q("#modal").textContent, /趋势决策/);
  assert.match(q("#modal").textContent, /价值决策/);
  assert.match(q("#modal").textContent, /防守决策/);
  assert.match(q("#modal").textContent, /研究决策/);
  assert.ok([...w.document.querySelectorAll(".panda-actions a")].some((a) => /docs\/strategy/.test(a.href)));
  assert.ok([...w.document.querySelectorAll(".panda-actions a")].some((a) => /quantfactor-center/.test(a.href)));
  assert.ok([...w.document.querySelectorAll(".panda-actions a")].some((a) => /docs\/qube/.test(a.href)));
  click("[data-do=close]");
  click("[data-do=cycle]");
  q("#modal").dispatchEvent(new w.Event("cancel"));
  q("#modal").close();
  click("[data-do=cycle]");
  click("[data-do=confirmCycle]");
  assert.equal(state().city.cycle, 1);
  assert.equal(state().round, 1);
  assert.equal(q(".city-day-status"), null);
  assert.ok(q("[data-do=cycle]").textContent.includes("今日已结算"));
  assert.ok(q("[data-do=cycle]").disabled);
  click("[data-do=cycle]");
  assert.equal(q("#modal").open, false);
  click("[data-do=cardHall]");
  click("[data-do=drawPool][data-id=strategy]");
  const blueprints = state().city.blueprints.length;
  click("[data-do=poolReveal]");
  click("[data-do=close]");
  assert.equal(state().city.blueprints.length, blueprints);
  click("[data-do=cardHall]");
  click("[data-do=drawPool][data-id=factor]");
  click("[data-do=close]");
  await new Promise((r) => setTimeout(r, 70));
  assert.equal(q("#modal").open, false);
  for (let i = 1; i < 9; i++) {
    click("[data-do=board]");
    click("[data-do=draw]");
    click("[data-do=reveal]");
    if (i === 1) {
      input("#message", "投入-500");
      submit("#chat");
      assert.equal(q("#modal").open, false);
      input("#message", "投入1.5");
      submit("#chat");
      assert.equal(q("#modal").open, false);
      input("#message", "回撤风险");
      submit("#chat");
      click("[data-do=lesson]");
      click('[data-do=quiz][data-id="1"]');
      click("[data-do=close]");
    }
    input("#message", "投入500");
    submit("#chat");
    input("#reason", "保留备用预算，小额验证");
    click("[data-do=confirm]");
    if (i < 8) {
      click("[data-do=next]");
      {
        if (state().phase === "daybreak") click("[data-do=startDay]");
        else click("[data-do=city]");
      }
    }
  }
  assert.equal(state().phase, "finalReport");
  assert.ok(q("body").textContent.includes("三日经营财报"));
  click("[data-do=finalProfile]");
  assert.ok(q(".summary"));
  assert.equal(w.document.querySelectorAll(".strategy-explain").length, 4);
  assert.ok(q(".humor-profile").textContent.length > 10);
  assert.equal(w.document.querySelectorAll(".strategy-explain a[href*=pandaaiquant]").length, 4);
  assert.equal(q(".strategy-grid").children.length, 4);
  assert.equal(
    [...w.document.querySelectorAll(".strategy-grid b")].reduce((n, e) => n + Number(e.textContent.replace("%", "")), 0),
    100,
  );
  assert.ok(q(".result-portrait"));
  assert.ok(q(".summary").textContent.includes("你的主角色"));
  click("[data-do=bonds]");
  assert.equal(w.document.querySelectorAll(".partner-card").length, 4);
  assert.ok(w.document.querySelectorAll(".partner-card.rarity-ssr").length >= 1);
  assert.ok(q(".partner-card-art"));
  click("[data-do=partnerDetail][data-id=0]");
  assert.ok(q(".partner-profile-art"));
  click("[data-do=bonds]");
  click("[data-do=close]");
  click("[data-do=correct][data-id=risk][data-value=rejected]");
  assert.equal(state().analystCorrections.risk.status, "rejected");
  click("[data-do=close]");
  reload();
  assert.ok(q("body").textContent.includes("已拒绝"));
  click("[data-do=ledger]");
  assert.equal(w.document.querySelectorAll(".ledgeritem").length, 9);
  click("[data-do=replay]");
  assert.ok(q("#toast").textContent.includes("核验一致"));
  click("[data-do=close]");
  const st = state();
  assert.equal(st.balance, st.initial + st.ledger.reduce((a, b) => a + b.delta, 0) + st.city.ledger.reduce((a, b) => a + b.delta, 0) - st.city.districts.reduce((a, b) => a + b.budget, 0));
  click("[data-do=settings]");
  click("[data-do=restart]");
  click("[data-do=new]");
  assert.ok(q("[data-do=askName]"));
  assert.equal(w.localStorage.getItem("panda-neon-v1"), null);
  w.close();
  const legacy = G.fresh("老玩家", true);
  legacy.view = "city";
  w = boot(JSON.stringify(legacy));
  assert.ok(q(".game-dock"));
  assert.equal(state().tutorial, "done");
  w.close();
  console.log("PASS: mobile-game tutorial all steps/resume, old save migration, single draw seed, animations skip/cancel, duplicate clicks, city cycle, negative/decimal rejection, three-day nine-event loop, profile sync, replay, restart.");
})().catch((e) => {
  console.error(e);
  w.close();
  process.exit(1);
});
