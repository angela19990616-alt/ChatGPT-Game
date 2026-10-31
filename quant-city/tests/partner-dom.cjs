const { JSDOM } = require("jsdom"),
  fs = require("fs"),
  assert = require("node:assert/strict"),
  G = require("../dist/engine.js");

const html = fs.readFileSync(__dirname + "/../dist/index.html", "utf8");
function boot(state) {
  const dom = new JSDOM(html, { runScripts: "outside-only", url: "https://partner.test" }), w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  w.matchMedia = () => ({ matches: true });
  w.fetch = async () => ({ json: async () => ({ mode: "mock" }) });
  w.localStorage.setItem("panda-neon-v1", JSON.stringify(state));
  for (const file of ["engine.js", "city.js", "analyst.js", "city-art.js", "ai-client.js", "app.js"])
    w.eval(fs.readFileSync(__dirname + "/../dist/" + file, "utf8"));
  return w;
}

const initial = G.fresh("互动玩家", true, "验证交易想法", 10000, 82);
initial.tutorial = "done";
initial.view = "city";
initial.phase = "ready";
let w = boot(initial);
const click = (selector) => {
  const node = w.document.querySelector(selector);
  assert.ok(node, "missing " + selector);
  node.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
};
const state = () => JSON.parse(w.localStorage.getItem("panda-neon-v1"));

click("[data-do=bonds]");
assert.equal(w.document.querySelectorAll(".partner-card").length, 4);
click('[data-do=partnerDetail][data-id="0"]');
assert.equal(w.document.querySelectorAll("[data-do=partnerAnswer]").length, 3);
click('[data-do=partnerAnswer][data-id="0"][data-value="0"]');
assert.equal(state().affection.ai, 2);
assert.equal(Object.keys(state().partnerTalks).length, 1);
assert.ok(state().evidence.some((e) => e.dimension === "bond" && e.value === "ai:2"));
assert.match(w.document.querySelector("#modal").textContent, /今天已经互动过/);
assert.equal(w.document.querySelectorAll("[data-do=partnerAnswer]").length, 0);

click("[data-do=bonds]");
click('[data-do=partnerDetail][data-id="1"]');
assert.equal(w.document.querySelectorAll("[data-do=partnerAnswer]").length, 3, "each partner gets one separate daily interaction");
click('[data-do=partnerAnswer][data-id="1"][data-value="2"]');
assert.equal(state().affection.risk, -1);

const day2 = state();
day2.round = 3;
w.close();
w = boot(day2);
click("[data-do=bonds]");
click('[data-do=partnerDetail][data-id="0"]');
assert.equal(w.document.querySelectorAll("[data-do=partnerAnswer]").length, 3, "same partner becomes available on the next day");
w.close();
console.log("PASS: four differentiated partner cards, one interaction per partner per day, affection changes, evidence recording and next-day reset.");
