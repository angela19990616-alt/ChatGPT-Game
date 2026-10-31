const { JSDOM } = require("jsdom"), fs = require("fs"), assert = require("node:assert/strict"), G = require("../dist/engine.js");
const html = fs.readFileSync(__dirname + "/../dist/index.html", "utf8");
const s = G.fresh("转职玩家", true, "探索基础", 10000, 66);
s.tutorial = "done";
s.view = "board";
s.phase = "summary";
s.round = 9;
s.evidence.push({ id: "ev-1", eventId: "choice-1", family: "测试", dimension: "attribute", value: "trend", source: "observed_action", phase: "during", prompted: false, rule: G.CONFIG.rule });
s.affection.finance = 5;
s.partnerTalks["s1-d1-finance"] = { partner: "finance", day: 1, season: 1, delta: 2 };
s.knowledgeAttempts = [{ id: "cost", correct: true }, { id: "risk", correct: true }];

const dom = new JSDOM(html, { runScripts: "outside-only", url: "https://career.test" }), w = dom.window;
w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
w.HTMLDialogElement.prototype.close = function () { this.open = false; };
w.matchMedia = () => ({ matches: true });
w.fetch = async () => ({ json: async () => ({ mode: "mock" }) });
w.localStorage.setItem("panda-neon-v1", JSON.stringify(s));
for (const file of ["engine.js", "city.js", "analyst.js", "city-art.js", "ai-client.js", "app.js"])
  w.eval(fs.readFileSync(__dirname + "/../dist/" + file, "utf8"));

const text = w.document.body.textContent;
assert.match(text, /最贴近：进阶 · 价值投资员/);
assert.match(text, /先判断东西值不值/);
assert.match(text, /互动好感 \+5/);
assert.match(text, /知识水平：有经验投资者/);
assert.equal(w.document.querySelectorAll("[data-do=careerChoice]").length, 5);
assert.doesNotMatch(text, /赤霄|知夏|凛川|星澜/);
w.document.querySelector('[data-do=careerChoice][data-id="value"]').dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const next = JSON.parse(w.localStorage.getItem("panda-neon-v1"));
assert.equal(next.career, "value");
assert.equal(next.season, 2);
assert.equal(next.phase, "ready");
assert.match(w.document.body.textContent, /第 2 天|第 1\/3 轮/);
w.close();
console.log("PASS: day-four career combines strategy, relationship and knowledge maturity, explains the recommendation, and continues after transfer.");
