const test = require("node:test"),
  assert = require("node:assert/strict"),
  G = require("../dist/engine.js");
test("complete three days and nine events with day breaks", () => {
  const s = G.fresh("<img>总", false, "探索基础", 10000, 192);
  for (let i = 0; i < 9; i++) {
    G.draw(s);
    G.observe(s, "risk", "", false);
    const strategy = s.event.strategy;
    G.settle(s, G.proposal(s, "custom", 500, "先核对最大损失"));
    assert.equal(s.ledger.at(-1).attribute, strategy);
    G.next(s);
    if (i === 2 || i === 5) {
      assert.equal(s.phase, "daybreak");
      G.startDay(s);
    }
  }
  assert.equal(s.phase, "finalReport");
  s.phase = "summary";
  assert.equal(s.ledger.length, 9);
  assert.equal(s.balance, 10000 + s.ledger.reduce((a, b) => a + b.delta, 0));
  assert.equal(s.evidence.filter((e) => e.dimension === "risk").length, 9);
  assert.equal(s.evidence.filter((e) => e.dimension === "attribute").length, 9);
  assert.equal(s.xp, 270);
  assert.ok(s.balance >= 0);
});
test("idempotent settlement and stale action", () => {
  const s = G.fresh("A");
  G.draw(s);
  const a = G.proposal(s, "small");
  G.settle(s, a);
  const snapshot = JSON.stringify(s);
  G.settle(s, a);
  assert.equal(JSON.stringify(s), snapshot);
  G.next(s);
  G.draw(s);
  assert.throws(() => G.settle(s, { ...a, key: "new-key" }));
});
test("cancel proposal never mutates balance, replay deterministic", () => {
  const s = G.fresh("A");
  G.draw(s);
  const a = G.proposal(s, "full");
  assert.equal(s.balance, 10000);
  assert.equal(s.ledger.length, 0);
  assert.deepEqual(G.replay(s.event, a), G.replay(s.event, a));
  assert.equal(JSON.parse(JSON.stringify(s)).event.seed, s.event.seed);
});
test("malformed amounts and spending beyond available cash are rejected", () => {
  const s = G.fresh("A", false, "探索基础", 30);
  G.draw(s);
  assert.throws(() => G.proposal(s, "report"), /现金不足/);
  assert.throws(() => G.validate({ ...s.event, p: 101 }));
  assert.throws(() => G.proposal(s, "custom", -100));
  assert.throws(() => G.proposal(s, "custom", Infinity));
  assert.throws(() => G.proposal(s, "custom", 1.5));
});
test("overspending lock only affects the current day and clears after next-day return", () => {
  const s = G.fresh("A", false, "探索基础", 10000, 3);
  G.draw(s);
  Object.assign(s.event, { amount: 8000, fee: 80 });
  G.settle(s, G.proposal(s, "full"));
  assert.equal(s.spendingLockDay, 1);
  const points = s.evidence.filter((e) => e.dimension === "attribute").length;
  G.next(s);
  G.draw(s);
  assert.throws(() => G.proposal(s, "small"), /资金纪律限制/);
  assert.equal(s.evidence.filter((e) => e.dimension === "attribute").length, points);
  s.round = 3;
  s.phase = "daybreak";
  G.startDay(s);
  assert.equal(G.gameDay(s), 2);
  assert.equal(G.spendingLocked(s), false);
  G.draw(s);
  assert.doesNotThrow(() => G.proposal(s, "small"));
});
test("investment is frozen today and returned on the next day", () => {
  const s = G.fresh("A", false, "探索基础", 10000, 1);
  G.draw(s);
  const entry = G.settle(s, G.proposal(s, "small"));
  assert.equal(entry.status, "pending");
  assert.equal(s.balance, 10000 - entry.debit);
  s.round = 3;
  const resolved = G.resolveDue(s, 2);
  assert.equal(resolved.length, 1);
  assert.equal(entry.status, "settled");
  assert.equal(s.balance, 10000 + entry.delta);
});
test("observations are evidence based; rejection persists; explicit allocation separate", () => {
  const s = G.fresh("A");
  G.draw(s);
  G.observe(s, "tech", "", true);
  G.observe(s, "tech", "", true);
  assert.equal(s.evidence.filter((e) => e.dimension === "tech").length, 1);
  G.correct(s, "tech", "rejected");
  G.settle(s, G.proposal(s, "full"));
  assert.equal(s.evidence.filter((e) => e.dimension === "finance").length, 0);
  assert.ok(s.evidence.some((e) => e.dimension === "allocation"));
  G.next(s);
  G.draw(s);
  G.observe(s, "tech", "", false);
  assert.equal(G.claims(s).find((c) => c.id === "tech").status, "rejected");
  assert.equal(s.evidence.filter((e) => e.dimension === "tech").length, 2);
});
test("free input ambiguity, unsupported and exact amount", () => {
  const s = G.fresh("A");
  assert.ok(G.parse(s, "少量试试").message);
  assert.deepEqual(G.parse(s, "投入500"), { action: "custom", amount: 500 });
  assert.ok(G.parse(s, "全仓").message);
  assert.equal(G.parse(s, "费用多少").kind, "finance");
});
test("fixed three-entry reference ledger gives 9860", () => {
  let balance = 10000;
  const base = {
    p: 40,
    amount: 1000,
    fee: 10,
    up: 120,
    down: 90,
    seed: 1,
    strategy: "value",
    strategyName: "价值低吸",
    lead: "finance",
  };
  balance -= 50;
  const low = { ...base, seed: 123456 };
  while (G.rand(low.seed) < 0.4) low.seed++;
  balance += G.replay(low, { amount: 1000, fee: 10, report: 0 }).delta;
  const high = { ...base, p: 60, up: 105, down: 96, seed: 1 };
  balance += G.replay(high, { amount: 500, fee: 5, report: 0 }).delta;
  assert.equal(balance, 9860);
});
test("1000 generated events have valid strategy and corresponding lead role", () => {
  for (let n = 1; n <= 1000; n++) {
    const s = G.fresh("A", false, "探索基础", 10000, n);
    s.round = n % 10;
    const e = G.eventFor(s);
    assert.equal(G.validate(e), true);
    assert.ok(G.people.some((p) => p.id === e.lead));
  }
});
global.Game = G;
const C = require("../dist/city.js");
test("city build spends cash and each strategy card adds one floor", () => {
  const s = G.fresh("城市", false, "探索基础", 10000, 42);
  C.init(s);
  G.evidence(s, "attribute", "trend");
  C.build(s, "trend", ["momentum"], 1000);
  assert.equal(s.balance, 9000);
  assert.equal(s.city.districts[0].floors, 1);
  assert.equal(s.city.feedback.kind, "build");
  assert.match(s.city.feedback.text, /花费 1000/);
  assert.ok(s.evidence.some((e) => e.dimension === "construction"));
  assert.ok(s.evidence.some((e) => e.dimension === "attribute" && e.value === "trend"));
  const snapshot = JSON.parse(JSON.stringify(s)),
    a = C.draft(s),
    result = C.settle(s, a);
  assert.equal(s.city.cycle, 1);
  assert.equal(C.settle(s, a), result);
  assert.equal(C.settle(snapshot, a).delta, result.delta);
  assert.equal(s.balance, 9000 + result.delta);
  s.city.materials.breakout = 1;
  C.refit(s, "trend", ["momentum", "breakout"], 500);
  assert.equal(s.city.feedback.kind, "refit");
  assert.equal(s.city.districts[0].floors, 2);
  assert.equal(s.balance, 8500 + result.delta);
  assert.throws(() => C.build(s, "trend", ["value"], 1000));
});
test("city draws once per cycle, invalid factors, growth and maximum fees bounded", () => {
  const s = G.fresh("城市", false, "探索基础", 10000, 91);
  C.draw(s, "strategy");
  assert.throws(() => C.draw(s, "strategy"));
  G.evidence(s, "attribute", "trend");
  assert.throws(() => C.build(s, "trend", [], 1000));
  assert.throws(() => C.build(s, "trend", ["fake"], 1000));
  C.build(s, "trend", ["momentum"], 500);
  for (let i = 0; i < 3; i++) {
    s.round = i * 3;
    const a = C.draft(s);
    C.settle(s, a);
    assert.ok(s.city.districts[0].development >= 0 && s.city.districts[0].development <= 100);
    assert.ok(s.city.districts[0].stability >= 0 && s.city.districts[0].stability <= 100);
  }
  assert.equal(s.balance, 9500 + s.city.ledger.reduce((n, l) => n + l.delta, 0));
});
test("one blueprint and one factor card are allowed per game day", () => {
  const s = G.fresh("城市", false, "探索基础", 10000, 9);
  C.init(s);
  C.draw(s, "strategy");
  C.draw(s, "factor");
  assert.throws(() => C.draw(s, "strategy"), /今天已经抽过这类卡/);
  assert.throws(() => C.draw(s, "factor"), /今天已经抽过这类卡/);
  s.round = 3;
  assert.equal(C.gameDay(s), 2);
  assert.doesNotThrow(() => C.draw(s, "factor"));
  assert.doesNotThrow(() => C.draw(s, "strategy"));
});
test("daily construction revenue is claimed once per game day and never changes the day", () => {
  const s = G.fresh("城市", false, "探索基础", 10000, 19);
  C.init(s);
  G.evidence(s, "attribute", "trend");
  C.build(s, "trend", ["momentum"], 500);
  const day = C.gameDay(s),
    round = s.round;
  C.settle(s, C.draft(s));
  assert.equal(C.gameDay(s), day);
  assert.equal(s.round, round);
  assert.equal(C.cycledToday(s), true);
  assert.throws(() => C.draft(s), /今天已经领取过建设收益/);
  s.round = 3;
  assert.equal(C.gameDay(s), 2);
  assert.equal(C.cycledToday(s), false);
});
const Analyst = require("../dist/analyst.js");
test("analyst totals four explicit types from choices and construction", () => {
  const s = G.fresh("A");
  G.draw(s);
  G.settle(s, G.proposal(s, "report"));
  C.init(s);
  G.evidence(s, "attribute", "trend");
  C.build(s, "trend", ["momentum"], 1000);
  const a = Analyst.analyze(s);
  assert.equal(a.mode, "mock");
  assert.ok(a.labels.some((l) => l.id === "type_research" && l.evidence_ids.length === 1));
  assert.ok(a.labels.some((l) => l.id === "type_trend" && l.evidence_ids.length === 2));
  assert.throws(() => Analyst.validate({ ...a, labels: [{ ...a.labels[0], evidence_ids: ["fake"] }] }, s));
  assert.throws(() => Analyst.validate({ ...a, recommendations: [{ resource_id: "unreviewed" }] }, s));
});
test("knowledge level is separate from preference and recommendations map to PandaAI resource types", () => {
  const s = G.fresh("知识");
  s.knowledgeAttempts = [
    { id: "trend", correct: true },
    { id: "value", correct: true },
    { id: "defense", correct: false },
  ];
  G.evidence(s, "attribute", "value");
  const a = Analyst.analyze(s);
  assert.equal(a.knowledge.level, "有经验投资者");
  assert.equal(a.knowledge.correct, 2);
  assert.ok(a.labels.some((l) => l.id === "type_value" && /偏好/.test(l.text)));
  assert.ok(a.recommendations.some((r) => r.resource_id === "strategy-value"));
  assert.ok(a.recommendations.every((r) => r.next_task));
});
test("district revenue is fixed and explained before settlement", () => {
  const s = G.fresh("固定收益", false, "探索基础", 10000, 77);
  C.init(s);
  G.evidence(s, "attribute", "trend");
  C.build(s, "trend", ["momentum"], 1000);
  const first = C.returns(s.city.districts[0], C.market(1, 1)),
    second = C.returns(s.city.districts[0], C.market(999, 9));
  assert.equal(first.gross, second.gross);
  assert.equal(first.gross, 180);
  const draft = C.draft(s);
  assert.equal(draft.amount, 180);
  assert.equal(draft.fees, 0);
});
test("career transfer starts a new season without losing progression or reusing daily limits", () => {
  const s = G.fresh("转职", false, "探索基础", 10000, 88);
  C.init(s);
  G.evidence(s, "attribute", "trend");
  C.build(s, "trend", ["momentum"], 1000);
  C.draw(s, "factor");
  C.settle(s, C.draft(s));
  G.draw(s);
  const first = s.event.id;
  G.settle(s, G.proposal(s, "skip"));
  G.next(s);
  s.phase = "summary";
  s.balance = 12345;
  s.city.materials.momentum = 7;
  s.spendingLockDay = 1;
  G.startCareer(s, "trend");
  assert.equal(s.career, "trend");
  assert.equal(s.season, 2);
  assert.equal(s.round, 0);
  assert.equal(s.phase, "ready");
  assert.equal(s.balance, 12345);
  assert.equal(s.city.materials.momentum, 7);
  assert.equal(s.careerHistory.length, 1);
  assert.equal(G.spendingLocked(s), false);
  assert.equal(C.cycledToday(s), false);
  assert.doesNotThrow(() => C.draw(s, "factor"));
  assert.doesNotThrow(() => C.draft(s));
  G.draw(s);
  assert.notEqual(s.event.id, first);
  assert.match(s.event.id, /-s2-e0$/);
});
test("players may remain chairman and still continue progression", () => {
  const s = G.fresh("董事长");
  s.phase = "summary";
  G.startCareer(s, "chairman");
  assert.equal(s.career, "chairman");
  assert.equal(s.season, 2);
  assert.equal(s.view, "city");
});
test("market choices record actual allocation risk separately from knowledge", () => {
  const cases = [
    ["custom", 6000, "高", "集中投入", "自主定额投入"],
    ["custom", 2000, "中", "分批尝试", "自主定额投入"],
    ["custom", 500, "低", "小额试水", "自主定额投入"],
    ["skip", undefined, "低", "保留现金", "风险优先"],
    ["report", undefined, "中低", "先买信息", "证据优先"],
  ];
  for (const [action, amount, risk, money, style] of cases) {
    const s = G.fresh(action, false, "探索基础", 10000, 23);
    G.draw(s);
    Object.assign(s.event, { amount: 10000, fee: 100 });
    G.settle(s, G.proposal(s, action, amount));
    assert.ok(s.evidence.some((e) => e.dimension === "risk_appetite" && e.value === risk));
    assert.ok(s.evidence.some((e) => e.dimension === "money_style" && e.value === money));
    assert.ok(s.evidence.some((e) => e.dimension === "decision_style" && e.value === style));
    assert.equal(
      s.evidence.some((e) => e.dimension === "knowledge"),
      false,
    );
  }
});
test("every market scenario presents four defensible plain-language tradeoffs", () => {
  for (const family of G.families) {
    assert.ok(family.choices);
    assert.deepEqual(Object.keys(family.choices).sort(), ["full", "report", "skip", "small"]);
    for (const text of Object.values(family.choices)) assert.ok(text.length >= 6 && text.length <= 20);
    assert.doesNotMatch(family.title + family.story, /作弊|傻|瞎跟|唯一正确/);
  }
});
