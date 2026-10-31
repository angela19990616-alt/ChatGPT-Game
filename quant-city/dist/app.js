(() => {
  "use strict";
  const G = Game,
    $ = (s) => document.querySelector(s),
    app = $("#app"),
    modal = $("#modal"),
    KEY = "panda-neon-v1",
    AI_PREF = "panda-ai-mode-v1";
  let s = null,
    saved = null,
    drawTimer = 0,
    cgToken = 0,
    toastTimer,
    poolTimer = 0,
    poolLoot = null;
  const esc = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && (![1, 2].includes(saved.schema) || !Array.isArray(saved.ledger) || !Number.isFinite(saved.balance))) saved = null;
  } catch {}
  function toast(t) {
    const el = $("#toast");
    el.textContent = t;
    el.style.display = "block";
    try {
      el.showPopover?.();
    } catch {}
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      try {
        el.hidePopover?.();
      } catch {}
      el.style.display = "none";
    }, 3500);
  }
  function save() {
    if (!s?.save) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      saved = JSON.parse(JSON.stringify(s));
    } catch {
      toast("浏览器无法保存；本次仍可继续，请勿关闭页面。");
    }
  }
  function call(fn) {
    try {
      fn();
    } catch (e) {
      toast(e.message);
    }
  }
  function level() {
    return 1 + Math.floor((s?.xp || 0) / 60);
  }
  function migrateStrategies(state) {
    if (!state) return state;
    const enrich = (event) => {
      if (!event || event.strategy) return;
      const family = G.families.find((f) => f.title === event.title);
      if (family)
        Object.assign(event, {
          strategy: family.strategy,
          strategyName: family.strategyName,
          lead: family.lead,
        });
    };
    enrich(state.event);
    for (const entry of state.ledger || []) {
      enrich(entry.event);
      entry.status ||= "settled";
      if (!entry.event?.strategy || state.evidence.some((e) => e.dimension === "strategy" && e.eventId === entry.eventId)) continue;
      const stance = entry.amount ? "follow" : entry.report ? "study" : "pass";
      state.evidence.push({
        id: "ev-" + (state.evidence.length + 1),
        eventId: entry.eventId,
        family: entry.event.type,
        dimension: "strategy",
        value: entry.event.strategy + ":" + stance,
        source: "migration",
        phase: "during",
        prompted: false,
        rule: G.CONFIG.rule,
      });
    }
    state.schema = 2;
    return state;
  }
  const foot = () => `<span class="mockmark">${PandaAI.enabled ? "AI 剧情 · 本地结算" : "本地模拟"} · 非真实行情</span>`;
  function hud() {
    const day = s ? Math.min(3, Math.floor(s.round / G.CONFIG.roundsPerDay) + 1) : 1,
      turn = s ? (s.round % G.CONFIG.roundsPerDay) + 1 : 1;
    return `<header class="gamehud"><div class="goldcoin">${CityArt.icon("coin")}<b>${(s?.balance || 10000).toLocaleString()}</b></div><div class="daycount">第 ${day} 天 <span>· 第 ${turn}/3 轮</span></div>${s ? '<button class="roundbutton" data-do="settings" aria-label="设置">' + CityArt.icon("gear") + "</button>" : ""}</header>`;
  }
  function header() {
    return hud();
  }
  function world(interactive = false) {
    if (s) GameCity.init(s);
    return `<div class="game-world">${CityArt.map(s, { interactive })}<div class="vignette"></div></div>`;
  }
  function character(p = G.people[0]) {
    return `<div class="vn-character">${art(p, "large-portrait")}</div>`;
  }
  function speech(text, buttons, p = G.people[0]) {
    return `<section class="vn-dialogue"><div class="nameplate">${p.name}<small>${p.role}</small></div><p>${text}</p><div class="vn-controls">${buttons}</div></section>`;
  }
  function dock() {
    const done = GameCity.cycledToday(s);
    return `<nav class="game-dock" aria-label="集团操作"><button data-do="cardHall">${CityArt.icon("cards")}<span>商业情报</span></button><button data-do="warehouse">${CityArt.icon("bag")}<span>策略中心</span></button><button class="nextday" data-do="cycle" ${done ? "disabled" : ""} title="每天可领取一次集团经营收益">${CityArt.icon("clock")}<span>${done ? "今日已结算" : "集团结算"}</span></button><button data-do="bonds">${CityArt.icon("book")}<span>核心团队</span></button><button data-do="records">${CityArt.icon("blueprint")}<span>董事长手账</span></button></nav>`;
  }

  function art(p, cls = "portrait") {
    return `<img class="${cls}" src="assets/${p.file}" alt="${esc(p.name)} · ${p.role}" onerror="this.hidden=true">`;
  }
  function intro() {
    s = null;
    app.innerHTML = `<main class="game opening">${world()}<div class="opening-shade"></div><div class="chapter-stamp">第一集<small>董事长，请接管这座城</small></div>${character()}${speech(`<b>三天之内，把小平层做成摩天集团。</b><br>① 每天处理 3 份商业情报，决定投入、不投或先调查。<br>② 拿下区域、招募策略团队，让办公室从一层总部一路升级。<br>③ 第 4 天召开集团庆功宴，公布你的董事长画像与下一步版图。<br><small>这是量化经营游戏，不代表真实投资收益。</small>`, '<button class="primary" data-do="askName">签署任命书，接管集团 ' + CityArt.icon("arrow") + "</button>")}<button class="skip-dialogue" data-do="askName">直接进入集团</button>${foot()}</main>`;
  }
  function askName() {
    app.innerHTML = `<main class="game opening">${world()}<div class="opening-shade"></div>${character()}<section class="vn-dialogue name-dialogue"><div class="nameplate">量化研究员<small>新手引导</small></div><p>请告诉我您的名字。接下来，大家统一称呼您为“董事长”。</p><form id="start"><div class="nameentry"><input id="nickname" maxlength="12" placeholder="输入你的名字" autocomplete="off" aria-label="董事长姓名"></div><label class="savechoice"><input id="persist" type="checkbox" checked> 保存到这台设备</label><small class="privacyline">名字、对话和选择只用于本局，可查看、纠正或清除。</small><button class="primary" type="submit">以董事长身份进入 →</button></form></section>${foot()}</main>`;
    $("#start").onsubmit = (e) => {
      e.preventDefault();
      const name = $("#nickname").value.trim();
      if (!name) return toast("请先输入你的名字。");
      s = G.fresh(name, $("#persist").checked, "探索基础", 10000);
      s.tutorial = "draw";
      s.view = "board";
      GameCity.init(s);
      save();
      render();
    };
    $("#nickname").focus();
  }

  function say(text) {
    s.chats.push({ npc: s.npc, text, round: s.round });
    if (s.chats.length > 80) s.chats.shift();
    save();
  }
  function dialogue(p) {
    const e = s.event,
      addr = "董事长";
    if (!e) return `${addr}，${p.hint} 你的第一张命运卡已经送达。`;
    const lead = [`${addr}，先区分已知规则和未知叙事。`, `${addr}，我不会替你决定，但会守住风险边界。`, `${addr}，漂亮曲线不是证据。我们需要能复现的检验。`, `${addr}，资金的去处，必须有清晰的理由。`][s.npc];
    return lead + " " + p.hint;
  }
  function render() {
    if (!s) return intro();
    GameCity.init(s);
    if (s.bankrupt || s.phase === "bankrupt") return bankruptcy();
    if (s.phase === "daybreak") return daybreak();
    if (s.phase === "finalReport") return finalReport();
    if (s.phase === "summary") return summary();
    if (s.view === "city") return city();
    const p = G.people[s.npc],
      last = [...s.chats].reverse().find((c) => c.npc === s.npc && c.round === s.round),
      tutorial = s.tutorial && s.tutorial !== "done",
      attr = {
        trend: "趋势",
        value: "价值",
        defense: "防守",
        research: "研究",
      }[s.ledger.at(-1)?.attribute];
    app.innerHTML = `<main class="game event-game">${world()}${hud()}${tutorial ? '<button class="tutorial-skip" data-do="skipTutorial">跳过教程</button>' : ""}<div class="event-shade"></div>${character(p)}${!tutorial ? `<button class="backcity" data-do="city">‹ 返回城市</button><div class="partner-switch">${G.people.map((p, i) => `<button data-do="npc" data-id="${i}" class="${s.npc === i ? "selected" : ""}" aria-label="切换到${p.name}">${art(p, "partner-face")}</button>`).join("")}</div>` : ""}${eventPanel()}${speech(s.phase === "result" ? `<b>${attr} +1</b><br>这次选择记下了。` : tutorial ? `第一封市场来信到了。<br>${s.phase === "event" ? "先看可能会赚多少、亏多少，再选投入、不投或先查资料。" : "点卡片，看看今天发生了什么。"}` : last ? esc(last.text) : dialogue(p), s.phase === "result" ? `<button class="primary" data-do="${tutorial ? "tutorialReward" : "next"}">${tutorial ? "领取开城物资" : s.round === G.CONFIG.rounds - 1 ? "看最终画像" : (s.round + 1) % G.CONFIG.roundsPerDay === 0 ? "结束今天" : "下一轮"} →</button>` : s.phase === "ready" || s.phase === "drawing" ? "" : `<div class="hintrow"><button data-do="ask" data-kind="risk">问风险</button><button data-do="ask" data-kind="tech">问依据</button><button data-do="ask" data-kind="finance">问费用</button><button data-do="lesson">没听懂</button></div>${tutorial ? "" : `<form id="chat" class="chatrow"><input id="message" maxlength="250" aria-label="和角色讨论" placeholder="说说你的想法…"><button type="submit">发送</button></form>`}`, p)}${foot()}</main>`;
    if ($("#chat"))
      $("#chat").onsubmit = (e) => {
        e.preventDefault();
        call(() => send($("#message").value));
      };
  }

  function reportFor(day) {
    const rows = s.ledger.filter((x) => Math.floor(Number(x.eventId.match(/e(\d+)$/)?.[1] || 0) / 3) + 1 === day),
      invested = rows.reduce((n, x) => n + x.amount, 0),
      fees = rows.reduce((n, x) => n + x.fee + x.report, 0),
      income = rows.reduce((n, x) => n + x.credit, 0),
      net = income - invested - fees;
    return { rows, invested, fees, income, net };
  }
  function reportBody(day) {
    const r = reportFor(day),
      names = {
        full: "大笔跟进",
        small: "半价试买",
        skip: "先不买",
        report: "花钱调查",
        custom: "自定金额",
      };
    return `<div class="numbers"><div><small>投入</small><strong>${r.invested}</strong></div><div><small>收入/返还</small><strong>${r.income}</strong></div><div><small>净收入</small><strong class="${r.net >= 0 ? "positive" : "negative"}">${r.net >= 0 ? "+" : ""}${r.net}</strong></div></div><p><b>费用：</b>${r.fees} 币</p><h3>董事长昨日决策</h3>${r.rows.map((x, i) => `<div class="ledgeritem">第 ${i + 1} 轮 · ${names[x.actionId] || x.actionId} · ${x.attribute} +1<br><small>投入 ${x.amount} / 返还 ${x.credit} / 净收入 ${x.delta >= 0 ? "+" : ""}${x.delta}</small></div>`).join("")}`;
  }
  function daybreak() {
    const day = Math.floor(s.round / G.CONFIG.roundsPerDay) + 1;
    app.innerHTML = `<main class="game opening daybreak">${world()}<div class="opening-shade"></div>${character()}${speech(`<b>第 ${day} 天 · 昨日财报</b>${reportBody(day - 1)}<div class="notice">今天仍可自由决定每轮投多少；可用现金不足时，可以少投、先查资料或不投。</div>`, `<button class="primary" data-do="startDay">确认财报并进入第 ${day} 天 →</button>`)}${foot()}</main>`;
    save();
  }
  function finalReport() {
    app.innerHTML = `<div class="shell">${header()}<main class="summary"><div class="eyebrow">第 4 天 · 最终结算</div><h1>三日经营财报</h1>${reportBody(3)}<div class="panel"><h2>三天总结果</h2><p>期初 ${s.initial.toLocaleString()} 币 → 期末 ${s.balance.toLocaleString()} 币，累计净收入 <b class="${s.balance - s.initial >= 0 ? "positive" : "negative"}">${s.balance - s.initial >= 0 ? "+" : ""}${s.balance - s.initial}</b> 币。</p></div><button class="primary" data-do="finalProfile">看我的策略画像 →</button></main>${foot()}</div>`;
    save();
  }

  function bankruptcy() {
    app.innerHTML = `<main class="bankruptcy-screen"><div class="bankruptcy-crack">⚡</div><div class="bankruptcy-card"><small>余额 ${s.balance.toLocaleString()} 币</small><h1>资金耗尽，本局破产</h1><p>可用现金已经归零，无法继续下一轮决策。</p><button class="primary" data-do="new">重新来一局</button><button data-do="ledger">看账本</button></div></main>`;
    save();
  }

  function tradeType(action, amount, event) {
    if (action === "report") return "先查资料";
    if (action === "skip") return "暂不投入";
    const names = {
      trend: "趋势策略",
      value: "价值策略",
      defense: "风控策略",
      research: "研究策略",
    };
    return names[event.strategy] || "自主投入";
  }
  function maxInvestable(balance = s?.balance || 0) {
    let amount = Math.max(0, Math.floor((balance * 100) / 101));
    while (amount > 0 && amount + Math.ceil(amount / 100) > balance) amount--;
    return amount;
  }
  function eventPanel() {
    if (s.phase === "ready" || s.phase === "drawing") return `<div class="drawstage"><button class="sealedcard ${s.phase === "drawing" ? "cardspinning" : ""} ${s.event ? "rarity-" + s.event.rarity.toLowerCase() : ""}" data-do="${s.phase === "drawing" ? "reveal" : "draw"}" aria-label="抽取事件卡"><span class="seal-border"></span><span class="seal">✦</span><b>市场来信</b><small>${s.phase === "drawing" ? "点击翻开" : "点击抽取"}</small></button>${s.phase === "drawing" ? '<button class="cancel-draw" data-do="cancelDraw">先等等</button>' : '<div class="finger-guide">点击卡片开启</div>'}</div>`;
    const e = s.event,
      day = Math.floor(s.round / G.CONFIG.roundsPerDay) + 1,
      turn = (s.round % G.CONFIG.roundsPerDay) + 1,
      fullCost = e.amount + Math.ceil(e.amount / 100),
      smallAmount = Math.floor(e.amount / 2),
      smallCost = smallAmount + Math.ceil(smallAmount / 100),
      available = maxInvestable(),
      copy = e.choices || {
        full: "看好机会，买入较多",
        small: "先买少量，边走边看",
        skip: "暂时不买，保留现金",
        report: "先查数据再决定",
      };
    if (s.phase === "result") {
      const l = s.ledger.at(-1),
        a = { trend: "趋势", value: "价值", defense: "防守", research: "研究" }[l.attribute],
        risk = { full: "较高", small: "适中", skip: "较低", report: "中低" }[l.actionId];
      return `<article class="eventcard receipt"><div class="card-kicker">第 ${day} 天 · 第 ${turn}/3 轮</div><h2>${a}偏好 +1</h2><p>本次风险选择：${risk}</p><div class="receipt-value">−${l.debit}<small>今天先冻结</small></div><div class="receipt-detail">明天返还 ${l.credit}<br>现在还能用 ${s.balance}</div><button class="quiet small" data-do="ledger">看账单</button></article>`;
    }
    return `<article class="eventcard card-reveal rarity-${e.rarity.toLowerCase()}"><div class="rarity-badge">${e.rarity}</div><div class="card-kicker">第 ${day} 天 · 第 ${turn}/3 轮 · 总进度 ${s.round + 1}/9</div><div class="event-illustration">${CityArt.icon(e.type === "成本" ? "coin" : "city")}<span>${e.strategyName}</span></div><h2>${esc(e.title)}</h2><p>${esc(e.story)}</p><div class="notice"><b>简单说：</b>${esc(e.fact)}</div><details class="rules"><summary>钱什么时候回来？</summary><p>今天投入的钱先冻结，第二天连同结果一起返还。第三天投入的钱会在最终画像前结算。</p></details><div class="gamechoices"><button data-do="choose" data-id="full" ${available < 1 ? "disabled" : ""}><em class="choice-type">自定金额投入</em>${esc(copy.full)}<small>${available < 1 ? "无可投资金" : "最多可投 " + available + " 币"}</small></button><button data-do="choose" data-id="small" ${available < 1 ? "disabled" : ""}><em class="choice-type">小额投入</em>${esc(copy.small)}<small>${available < 1 ? "无可投资金" : "金额可修改"}</small></button><button data-do="choose" data-id="skip"><em class="choice-type">不投</em>${esc(copy.skip)}<small>不花钱，保留现金</small></button><button data-do="choose" data-id="report" ${50 > s.balance ? "disabled" : ""}><em class="choice-type">先查资料</em>${esc(copy.report)}<small>${50 > s.balance ? "钱不够" : "花 50 币查证"}</small></button></div></article>`;
  }

  function open(title, body) {
    modal.innerHTML = `<div class="modalhead"><h2>${title}</h2><button class="quiet small" data-do="close" aria-label="关闭">✕</button></div>${body}`;
    if (!modal.open) modal.showModal();
  }
  function close() {
    PandaAI.cancel();
    clearTimeout(poolTimer);
    poolLoot = null;
    modal.close();
    if (s?.city) s.city.pending = null;
    if (s?.draft) {
      s.draft = null;
      save();
    }
    cgToken++;
  }
  modal.addEventListener("cancel", () => {
    PandaAI.cancel();
    clearTimeout(poolTimer);
    poolLoot = null;
    if (s?.city) s.city.pending = null;
    if (s?.draft) {
      s.draft = null;
      save();
    }
    cgToken++;
  });
  function investmentPreview(action) {
    const input = $("#investAmount"),
      out = $("#investOutcome"),
      confirm = $("[data-do=confirm]");
    if (!input || !out) return;
    try {
      const amount = Number(input.value);
      s.draft = G.proposal(s, action, amount);
      const a = s.draft,
        e = s.event,
        share = Math.round((a.amount / Math.max(1, s.balance)) * 100),
        gain = Math.floor((a.amount * e.up) / 100) - a.amount - a.fee,
        loss = a.amount + a.fee - Math.floor((a.amount * e.down) / 100),
        lossRate = Math.round((loss / a.amount) * 100);
      out.innerHTML = `投入占现有现金 <b>${share}%</b> · 手续费 ${a.fee}<br>如果上涨：大约净赚 <b class="positive">+${gain}</b>；如果下跌：大约净亏 <b class="negative">-${loss}</b>（约 ${lossRate}%）<br>今天先扣 ${a.amount + a.fee}，还剩 ${s.balance - a.amount - a.fee}。`;
      confirm.disabled = false;
      save();
    } catch (e) {
      out.textContent = e.message;
      confirm.disabled = true;
    }
  }
  function confirmAction(action, amount) {
    PandaAI.cancel();
    const limit = maxInvestable(),
      initial = ["full", "small", "custom"].includes(action) ? Math.min(amount ?? s.event.amount, limit) : amount;
    s.draft = G.proposal(s, action, initial);
    save();
    const a = s.draft,
      e = s.event,
      type = tradeType(a.action, a.amount, e),
      editable = a.amount > 0;
    open("确认选择", `<div class="trade-type"><b>${type} +1</b></div>${editable ? `<label for="investAmount">这次想投入多少？（1–${limit} 游戏币）</label><input id="investAmount" type="number" min="1" max="${limit}" step="1" value="${a.amount}"><input id="investSlider" type="range" min="1" max="${limit}" step="1" value="${a.amount}">` : ""}<div class="facts" id="investOutcome">${a.report ? "花 50 币先查信息，这轮不买。" : a.amount ? "正在计算可能结果…" : "这轮不花钱，保留全部现金。"}</div><p class="muted">新手提示：先看“最多可能亏多少”，再决定投入。如果现金和手续费全部耗尽，本局直接进入破产结局。</p><label for="reason">为什么这样选（可不填）</label><textarea id="reason" maxlength="300" placeholder="例如：先小额试试，不想一次投太多"></textarea><div class="actions" style="margin-top:15px"><button class="primary" data-do="confirm">就这么选</button><button data-do="close">返回</button></div>`);
    if (editable) {
      $("#investAmount").oninput = () => {
        if ($("#investSlider")) $("#investSlider").value = $("#investAmount").value;
        investmentPreview(action);
      };
      $("#investSlider").oninput = () => {
        $("#investAmount").value = $("#investSlider").value;
        investmentPreview(action);
      };
      investmentPreview(action);
    }
  }
  function ask(kind, fromPrompt = true) {
    if (!s.event) {
      toast("先抽取一张事件，便能针对它讨论。");
      return;
    }
    if (s.phase !== "event") {
      toast("本轮已结算；你可以查看账本，或进入下一夜。");
      return;
    }
    const e = s.event;
    G.observe(s, kind, "", fromPrompt);
    const response = {
      risk: `董事长，以标准投入 ${e.amount} 计算，坏分支返还 ${Math.floor((e.amount * e.down) / 100)}，加上费用，净损失 ${e.amount + e.fee - Math.floor((e.amount * e.down) / 100)} 币。没有杠杆，本轮立即退出。你愿意为这次试验承担这个范围吗？`,
      tech: `董事长，这只是游戏生成的行情。先问三个问题：数据是真的吗？当时真的能看到吗？换一段时间还能用吗？游戏里的 ${e.p}% 只是本局抽签概率，不代表真实市场胜率。`,
      finance: `董事长，标准试验占用 ${e.amount + e.fee} 币，占当前余额 ${(((e.amount + e.fee) / s.balance) * 100).toFixed(1)}%。执行前可用现金剩 ${s.balance - e.amount - e.fee} 币。更小的试验也能验证想法。`,
    };
    say(response[kind]);
    render();
  }
  function send(t) {
    const parsed = G.parse(s, t);
    if (PandaAI.enabled && !parsed.action && !parsed.kind) {
      remoteDialogue(t);
      return;
    }
    if (parsed.action) {
      if (s.phase !== "event") return toast("请先抽取事件。");
      return confirmAction(parsed.action, parsed.amount);
    }
    if (parsed.kind) return ask(parsed.kind, false);
    say(parsed.message);
    render();
  }
  function ledger() {
    open("收支账本", `<p>初始 ${s.initial.toLocaleString()} 币 → 当前 ${s.balance.toLocaleString()} 币</p><small>城市周期净变化合计：${(s.city?.ledger || []).reduce((n, l) => n + l.delta, 0)} 币；下方列出事件流水。</small><small>整数记账 · 无未平仓持仓 · 同一事件仅结算一次</small>${s.ledger.length ? s.ledger.map((l, i) => `<div class="ledgeritem"><b>${i + 1}. ${esc(l.event.title)}</b><br>投入 −${l.amount} / 手续费 −${l.fee} / 报告 −${l.report} / 返还 +${l.credit}<br>${l.balanceBefore} → <b>${l.balanceAfter}</b><br><small>规则 ${l.ruleVersion} · seed ${l.event.seed} · ${l.idempotencyKey}</small><br><button class="small quiet" data-do="replay" data-id="${i}">重放核验</button></div>`).join("") : '<p class="muted">暂无已结算事件。</p>'}`);
  }
  function bonds() {
    const scores = { ai: 0, risk: 0, tech: 0, finance: 0 },
      map = {
        research: "ai",
        defense: "risk",
        trend: "tech",
        value: "finance",
      },
      rank = (n) => (n >= 5 ? "SSR" : n >= 2 ? "SR" : "R");
    for (const e of s.evidence.filter((e) => e.dimension === "attribute")) if (map[e.value]) scores[map[e.value]]++;
    open(
      "策略伙伴",
      `<p class="muted">同类决策和建设会增加伙伴点数：2 点升 SR，5 点升 SSR。</p><div class="partner-inventory">${G.people
        .map((p, i) => {
          const rarity = rank(scores[p.id]);
          return `<button class="partner-card rarity-${rarity.toLowerCase()} ${scores[p.id] ? "unlocked" : "locked"}" data-do="partnerDetail" data-id="${i}"><span class="partner-rarity">${rarity}</span>${art(p, "partner-card-art")}<span class="partner-card-info"><b>${p.name}</b><small>${scores[p.id] ? p.code + "经验 · " + scores[p.id] + " 点" : "完成" + p.code + "决策解锁"}</small></span></button>`;
        })
        .join("")}</div>`,
    );
  }
  function partnerDetail(i) {
    const p = G.people[i],
      lines = s.chats.filter((c) => c.npc === i).slice(-3),
      blueprint = GameCity.blueprints.find((b) => b.partner === p.name),
      factor = GameCity.factors.find((f) => f.industry === blueprint?.id),
      score = s.evidence.filter((e) => e.dimension === "attribute" && { ai: "research", risk: "defense", tech: "trend", finance: "value" }[p.id] === e.value).length,
      rarity = score >= 5 ? "SSR" : score >= 2 ? "SR" : "R";
    open(p.name + " · " + rarity + "角色卡", `<div class="partner-profile">${art(p, "partner-profile-art")}<div><span class="badge">${rarity} · ${p.code}策略 · ${score} 点</span><h2>${p.name}</h2><b>${p.role}</b><p>${p.hint}</p><div class="notice"><b>玩法关联：</b>${blueprint?.name || ""} → ${factor?.name || ""} → 建设后增加${p.code}画像点</div><small>升级规则：2 点 SR，5 点 SSR</small></div></div><h3>最近互动</h3>${lines.map((c) => `<div class="partner-line">第 ${c.round + 1} 轮 · ${esc(c.text)}</div>`).join("") || '<p class="muted">还没有互动。进入市场来信后可以和TA说话。</p>'}<button data-do="bonds">返回伙伴背包</button>`);
  }
  const statusNames = {
    unknown: "未观察",
    candidate: "候选 · 待确认",
    confirmed: "你已确认",
    rejected: "已拒绝",
    roleplay: "仅为角色扮演",
  };
  function profileBody() {
    return `<p class="muted">只描述本局可见行为。知识与偏好不会由收益或角色好感推定。画像版本 v${s.profileVersion}。</p><label for="profileGoal">你明确选择的学习目标（可纠正）</label><select id="profileGoal">${["探索基础", "验证交易想法", "编程研究", "工具实践"].map((g) => `<option ${g === s.goal ? "selected" : ""}>${g}</option>`).join("")}</select><button class="small" data-do="goal">更新目标</button>${G.claims(s)
      .map((c) => `<div class="claim"><h3>${c.label} <span class="badge">${statusNames[c.status]}</span></h3><small>观察到 ${c.events} 个场景；${c.events < 2 ? "证据有限，不判断稳定习惯。" : "跨场景出现，但仍需你确认。"}</small>${c.evidence.map((e) => `<small>${e.id} · ${e.value} · ${e.prompted ? "提示后" : "自主"} / ${e.phase === "after_learning" ? "学习后" : "学习前"}</small>`).join("")}<div class="actions" style="margin-top:10px"><button class="small" data-do="correct" data-id="${c.id}" data-value="confirmed">符合我的习惯</button><button class="small" data-do="correct" data-id="${c.id}" data-value="roleplay">只是在扮演</button><button class="small" data-do="correct" data-id="${c.id}" data-value="rejected">不符合我</button></div></div>`)
      .join("")}<details><summary>原始资金配置证据</summary>${
      s.evidence
        .filter((x) => x.dimension === "allocation")
        .map((x) => `<p class="muted">${esc(x.value)} · ${esc(x.eventId)}</p>`)
        .join("") || "尚无配置行动"
    }</details><div class="notice">知识状态：${s.lessons.length ? "已学习 " + s.lessons.join("、") : "未测，不等于低分"}。练习答对仅表示学习后完成该题，尚未验证迁移能力。</div>`;
  }
  const lessons = {
    回撤: ["赚过的钱又亏回去多少", "账户最高有 100 元，后来只剩 80 元，就是从最高点跌了 20%。想回到 100 元，需要从 80 元再涨 25%。", "80 元要涨回 100 元，需要涨多少？", ["20%", "25%"], 1],
    样本外验证: ["别拿练习题冒充考试题", "先用一段旧数据想办法，再换一段从没看过的数据考试。如果反复看考试答案再改方法，成绩就不可信了。", "哪种测试更靠谱？", ["只挑表现最好的一年", "换一段从没用来改方法的数据"], 1],
    交易成本: ["小赚也可能被费用吃掉", "真正赚到的钱，要用最后拿回来的钱，减去原本投入的钱，再减掉买卖费用。", "投入 500，买卖费用 5，最后拿回 525，实际赚了多少？", ["20", "25"], 0],
    未来数据泄漏: ["不能偷看明天的答案", "判断星期一该不该买，只能使用星期一当时已经知道的消息，不能假装提前知道星期五公布的结果。", "今天做决定，可以使用哪项信息？", ["明天才公布的财报", "今天已经公开的数据"], 1],
    资金占用: ["别一次把钱全花光", "投出去的钱暂时不能拿去做别的事。留一部分现金，新机会出现时才有选择。", "手里有 10000，投入 3000，还剩多少现金？", ["7000", "3000"], 0],
    概率与结果: ["一次赢，并不能证明方法对", "已知概率只描述重复试验的分布。一次结果既包含决策也包含随机性。应把过程证据与盈亏分开。", "一轮盈利意味着？", ["已经证明真实投资能力", "只观察到一个模拟结果"], 1],
  };
  const glossary = {
    回撤: ["一段时间里，钱从最高点跌下来多少。", "比如账户从 100 元涨到 120 元，后来跌到 90 元，回撤是从 120 元往下跌了 25%。"],
    样本外验证: ["用一段从没拿来调策略的数据，再考一次这个策略。", "就像练习题和考试题要分开；如果拿考试答案反复修改方法，成绩会显得虚高。"],
    交易成本: ["每次买卖额外花掉的钱，包括手续费等。", "一笔交易看起来赚 10 元，但买卖一共花了 6 元费用，真正只赚 4 元。"],
    未来数据泄漏: ["做过去的模拟时，不小心用了当时还不知道的信息。", "比如假装在星期一买股票，却用了星期五才公布的财报，这会让策略显得异常聪明。"],
    资金占用: ["钱投入以后，暂时不能拿去做别的事情。", "把大部分现金都买了一只股票，新机会出现时就可能没钱参与。"],
    概率与结果: ["一次赚或亏不代表方法一定正确或错误。", "胜率 60% 的方法也可能连续几次亏钱，需要看很多次结果。"],
  };
  function glossaryOpen(concept) {
    const g = glossary[concept] || ["这是本题涉及的量化概念。", "可以先按题目中的大白话理解，不影响继续游戏。"];
    open("词语解释 · " + concept, `<div class="glossary-card"><h3>一句话解释</h3><p>${g[0]}</p><h3>举个例子</h3><p>${g[1]}</p><div class="notice">看懂这个词不等于会投资；它只帮助你理解本题在问什么。</div><a class="course-cta" href="https://www.pandaaiquant.com/learninghub/newcourse" target="_blank" rel="noopener noreferrer">还是没懂？去 PandaAI 课程中心看完整讲解 →</a></div>`);
  }
  function decorateEventConcept() {
    const card = app.querySelector(".event-game .eventcard:not(.receipt)"),
      notice = card?.querySelector(".notice");
    if (!card || !notice || !s?.event?.concept) return;
    if (!notice.nextElementSibling?.classList.contains("concept-help")) notice.insertAdjacentHTML("afterend", `<button class="concept-help" data-do="termHelp" data-concept="${esc(s.event.concept)}">？「${esc(s.event.concept)}」是什么意思</button>`);
    const invest = card.querySelector("[data-do=choose][data-id=full]"),
      small = card.querySelector("[data-do=choose][data-id=small]"),
      skip = card.querySelector("[data-do=choose][data-id=skip]"),
      report = card.querySelector("[data-do=choose][data-id=report]");
    if (invest && !card.dataset.simpleChoices) {
      card.dataset.simpleChoices = "true";
      invest.dataset.id = "custom";
      invest.innerHTML = `<em class="choice-type">投入 · 金额由你决定</em>看好这个机会，自己填写投入金额<small>当前最多可投 ${maxInvestable()} 币</small>`;
      small?.remove();
      if (skip) skip.innerHTML = '<em class="choice-type">不投 · 保留现金</em>这次不投入<small>不会扣钱</small>';
      if (report) report.innerHTML = '<em class="choice-type">先查资料 · 研究</em>先看资料再决定<small>花 50 币查证</small>';
    }
  }
  function decorateDecisionReview() {
    if (s?.phase !== "result") return;
    const entry = s.ledger.at(-1),
      text = app.querySelector(".event-game .vn-dialogue>p");
    if (!entry || !text || text.dataset.reviewed) return;
    const ratio = Math.round((entry.amount / Math.max(1, entry.balanceBefore)) * 100),
      tone = entry.report ? "先补信息" : !entry.amount ? "本轮保守观望" : ratio >= 50 ? "本轮明显进取" : ratio >= 20 ? "本轮相对均衡" : "本轮小额试探",
      reason = entry.proposal.reason?.trim();
    text.dataset.reviewed = "true";
    text.innerHTML = `<b>${tone}</b><br>你投入了现金的 ${ratio}%${reason ? "，理由是“" + esc(reason) + "”" : "，没有填写理由"}。这是本轮状态，不直接等于固定人格。`;
    if (PandaAI.enabled && !entry.aiReviewRequested) {
      entry.aiReviewRequested = true;
      save();
      void remoteDialogue(`请根据本轮投入比例 ${ratio}% 和玩家理由“${reason || "未填写"}”，用两句话说明为什么这次更激进、均衡或保守。只评价本轮状态，不推断固定人格。`);
    }
  }
  new MutationObserver(() => {
    decorateEventConcept();
    decorateDecisionReview();
  }).observe(app, { childList: true, subtree: true });
  function interceptTermHelp(event) {
    const button = event.target.closest("[data-do=termHelp]");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    glossaryOpen(button.dataset.concept);
  }
  app.addEventListener("click", interceptTermHelp, true);
  modal.addEventListener("click", interceptTermHelp, true);
  const districtQuiz = {
    trend: {
      question: "一只股票已经连续涨了很多天。现在跟着买，最需要担心什么？",
      answers: ["它可能突然转头下跌", "它的名字不够好听"],
      correct: 0,
      explain: "趋势可能随时反转，所以要提前想好退出规则。",
    },
    value: {
      question: "一只股票跌了很多，就一定值得买吗？",
      answers: ["一定值得", "不一定，可能基本面变差"],
      correct: 1,
      explain: "价格低不等于价值高，要防止“价值陷阱”。",
    },
    defense: {
      question: "一种方法平时涨跌比较小，是不是就一定不会亏？",
      answers: ["不是，只是平时起伏可能小一点", "是，一定不会亏"],
      correct: 0,
      explain: "低波动不等于保本，任何策略都可能亏损。",
    },
    research: {
      question: "模拟星期一买股票时，可以使用星期五才公布的消息吗？",
      answers: ["可以，只要结果好看", "不可以，当时根本不知道"],
      correct: 1,
      explain: "数据必须在决策当时已经公开可用。",
    },
  };
  function knowledgeStatus() {
    const attempts = s?.knowledgeAttempts || [],
      correct = new Set(attempts.filter((x) => x.correct).map((x) => x.id)).size,
      answered = new Set(attempts.map((x) => x.id)).size,
      accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    const level = answered < 2 ? "知识水平待观察" : correct >= 4 && accuracy >= 75 ? "研究型高手" : correct >= 2 ? "有经验投资者" : "入门小白";
    return {
      level,
      correct,
      answered,
      accuracy,
      limitation: answered < 2 ? "题目太少，暂不下结论。" : "这是游戏知识题结果，不等于真实投资能力。",
    };
  }
  function districtChallenge(id) {
    const b = GameCity.blueprints.find((x) => x.id === id),
      q = districtQuiz[id];
    open("解锁 " + b.name, `<div class="eyebrow">建设前知识题 · 可重试</div><h3>${q.question}</h3><div class="choices">${q.answers.map((a, i) => `<button data-do="districtAnswer" data-id="${id}" data-value="${i}">${a}</button>`).join("")}</div><p class="muted">答题用于区分知识熟悉度，不影响你的策略偏好分。</p>`);
  }
  function lesson(concept) {
    concept = concept || s?.event?.concept || "交易成本";
    const l = lessons[concept];
    open("微课堂 · " + concept, `<article class="lesson"><div class="eyebrow">随时返回 · 不改变事件与概率</div><h3>${l[0]}</h3><p>${l[1]}</p><label for="sim">试一试：投入金额 <b id="simvalue">500</b> 币</label><input id="sim" type="range" min="100" max="2000" step="100" value="500"><div class="facts" id="simout">返还 525 − 投入 500 − 费用 5 = 净结果 +20</div><p>小练习：${l[2]}</p><div class="choices">${l[3].map((a, i) => `<button data-do="quiz" data-concept="${concept}" data-id="${i}">${a}</button>`).join("")}</div><p id="quizfeedback" role="status"></p><div class="actions" style="margin-top:20px"><button class="primary" data-do="close">返回${s ? "董事会" : "开局"}</button><button data-do="lessonMenu">更多概念</button>${PandaAI.enabled ? `<button data-do="aiLesson" data-concept="${concept}">让伙伴针对这次决定讲解</button>` : ""}</div><div id="aiLessonText"></div></article>`);
    $("#sim").oninput = (e) => {
      const a = Number(e.target.value);
      $("#simvalue").textContent = a;
      $("#simout").textContent = `返还 ${Math.floor(a * 1.05)} − 投入 ${a} − 费用 ${Math.ceil(a * 0.01)} = 净结果 +${Math.floor(a * 1.05) - a - Math.ceil(a * 0.01)}`;
    };
    if (s && !s.lessons.includes(concept)) {
      s.lessons.push(concept);
      save();
    }
  }
  function resources() {
    const labels = {
      探索基础: ["基础概念实验室", "回撤"],
      验证交易想法: ["策略验证工作单", "样本外验证"],
      编程研究: ["数据时间戳检查", "未来数据泄漏"],
      工具实践: ["预算模拟器", "资金占用"],
    };
    const [title, concept] = labels[s.goal] || labels["探索基础"];
    return `<div class="grid2"><div class="panel"><span class="badge">内置演示资源 · 免费</span><h3 style="margin-top:12px">${title}</h3><p class="muted">因为你选择了「${s.goal}」。前置条件：无；形式：讲解 + 小实验；无需平台权限。</p><button data-do="resource" data-concept="${concept}">开始学习 →</button><button class="quiet small" data-do="feedback" data-id="${title}">${s.resourceFeedback.includes(title) ? "已记为不适合" : "不适合我"}</button></div><div class="panel"><span class="badge">内置演示资源 · 免费</span><h3 style="margin-top:12px">净收益与成本工作台</h3><p class="muted">本局所有行动都有成本。${s.lessons.includes("交易成本") ? "你已学过，可再次巩固。" : "这个练习可补齐未验证的成本概念。"}前置条件：无。</p><button data-do="resource" data-concept="交易成本">打开工作台 →</button></div></div><small>Panda 平台目录尚未接入。这里提供可立即使用的内置学习资源，没有虚构真实课程链接。</small>`;
  }
  function careerPanel() {
    const a = currentAnalysis(),
      recommended = a.recommendedCareer || "research",
      jobs = {
        trend: { name: "趋势交易员", product: "趋势信号 AI Skill" },
        value: { name: "价值投资员", product: "价值策略库" },
        defense: { name: "风险管理师", product: "低波动与仓位控制策略库" },
        research: { name: "量化研究员", product: "因子研究库" },
      };
    if (s.career) return `<section class="career-panel"><div class="eyebrow">当前职业 · 第 ${s.season || 1} 赛季</div><h2>${s.career === "chairman" ? "董事长" : jobs[s.career].name}</h2><p>职业已经保留。金币、城区、材料、角色等级和历史画像都会带进下一赛季。</p><button class="primary" data-do="careerChoice" data-id="${s.career}">继续下一赛季 →</button></section>`;
    return `<section class="career-panel"><div class="eyebrow">序章完成 · 可以转职</div><h2>推荐职业：${jobs[recommended].name}</h2><p>推荐产品：${jobs[recommended].product}。你可以接受推荐、改选其他职业，也可以继续当董事长。</p><div class="career-grid">${Object.entries(jobs)
      .map(([id, j]) => `<button class="${id === recommended ? "recommended" : ""}" data-do="careerChoice" data-id="${id}"><small>${id === recommended ? "画像推荐" : "可选择"}</small><b>${j.name}</b><span>${j.product}</span></button>`)
      .join("")}</div><button class="quiet" data-do="careerChoice" data-id="chairman">暂不转职，继续当董事长</button></section>`;
  }
  function summary() {
    const k = knowledgeStatus();
    app.innerHTML = `<div class="shell">${header()}<main class="summary"><div class="eyebrow">第 ${(s.season || 1) * 3 + 1} 天 · 赛季结算</div><h1>你的策略画像</h1><p class="muted">策略偏好看本局选择和建设；知识水平只看答题，两者分开计算。</p><div class="numbers"><div><small>最后余额</small><strong>${s.balance.toLocaleString()}</strong></div><div><small>完成赛季</small><strong>第 ${s.season || 1} 季</strong></div><div><small>知识水平</small><strong>${k.level}</strong></div></div><div class="notice"><b>知识题：</b>${k.correct}/${k.answered || 0} 答对${k.answered ? " · 正确率 " + k.accuracy + "%" : ""}。${k.limitation}</div><div class="panel"><h2>本季画像</h2>${analystBody()}<details><summary>看原始记录</summary>${profileBody()}</details></div>${careerPanel()}<div class="actions" style="margin-top:25px"><button data-do="ledger">看账本</button><button data-do="bonds">看职业角色</button><button class="quiet" data-do="export">导出记录</button><button class="quiet" data-do="restart">完全重开</button></div></main>${foot()}</div>`;
    save();
  }
  function cgHTML() {
    return s.cg === "ready" ? '<div class="cg"><small>MOCK CG · 剧情演出</small><br><b>✦ 海风之上，新的盟约 ✦</b><p>星光装饰已解锁。每个有依据的决定，都让董事会更了解你。</p></div>' : s.cg === "generating" ? '<p class="muted">剧情画面准备中… <button class="small" data-do="cancelCG">取消</button></p>' : s.cg === "cancelled" ? "<small>剧情画面已取消，结算不受影响。</small>" : '<button class="small quiet" data-do="cg">展开本夜剧情 CG（Mock）</button>';
  }
  function cg() {
    s.cg = "generating";
    save();
    render();
    const token = ++cgToken,
      id = s.event.id;
    setTimeout(() => {
      if (token !== cgToken || s?.event?.id !== id || s.phase !== "result") return;
      s.cg = "ready";
      save();
      render();
    }, 700);
  }
  function settings() {
    open("事务所设置", `<label for="rename">昵称（最多12字）</label><input id="rename" maxlength="12" value="${esc(s.name)}"><button class="small" data-do="rename">修改称呼</button><div class="notice">${s.save ? "当前在浏览器本地自动保存" : "当前临时体验，关闭或刷新后不保留本局"}。可以导出 JSON 账本备份。未接入真实 AI / Panda API。</div><div class="actions"><button data-do="toggleSave">${s.save ? "停止保存并删除本地存档" : "开启本地保存"}</button><button data-do="export">导出本局记录</button><button data-do="aiOptions">剧情 AI 设置</button><button data-do="restart">重开新局</button><button data-do="clear">清除本地进度与画像</button></div>`);
  }
  function interceptCareer(event) {
    const b = event.target.closest("[data-do=careerChoice]");
    if (!b || b.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    call(() => {
      const jobs = {
          trend: "趋势交易员",
          value: "价值投资员",
          defense: "风险管理师",
          research: "量化研究员",
          chairman: "董事长",
        },
        chosen = b.dataset.id;
      G.startCareer(s, chosen);
      save();
      render();
      toast("已选择 " + jobs[chosen] + "，进入第 " + s.season + " 赛季。");
    });
  }
  app.addEventListener("click", interceptCareer, true);
  modal.addEventListener("click", interceptCareer, true);
  function interceptKnowledgeAndIncome(event) {
    const b = event.target.closest("[data-do]");
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.do === "districtAnswer") {
      event.preventDefault();
      event.stopImmediatePropagation();
      const q = districtQuiz[d.id],
        yes = Number(d.value) === q.correct;
      s.knowledgeAttempts ||= [];
      s.knowledgeAttempts.push({ id: d.id, correct: yes, round: s.round });
      if (yes) {
        s.knowledgeUnlocks ||= {};
        s.knowledgeUnlocks[d.id] = true;
        s.xp += 10;
        G.evidence(s, "knowledge", d.id + "建设题答对", "task_result", "after_learning", false, "knowledge-" + d.id);
        save();
        district(d.id);
        toast("答对了：" + q.explain);
      } else {
        save();
        districtChallenge(d.id);
        toast("还差一点：" + q.explain);
      }
      return;
    }
    if (d.do === "cycle") {
      event.preventDefault();
      event.stopImmediatePropagation();
      call(() => {
        const a = GameCity.draft(s);
        s.city.pending = a;
        open("领取今日建设收益", `<p>城区收益根据累计投入、策略楼层和建设度计算。领取后当天不能重复领取。</p><div class="numbers"><div><small>今日经营收入</small><strong>+${a.amount}</strong></div><div><small>运营费用</small><strong>0</strong></div><div><small>领取后现金</small><strong>${s.balance + a.amount}</strong></div></div><p class="notice">这是游戏内的城市经营收益：投入越多，收益基数越高，但会边际递减。不代表真实投资回报。</p><button class="primary" data-do="confirmCycle">确认领取</button><button data-do="close">取消</button>`);
      });
    }
  }
  app.addEventListener("click", interceptKnowledgeAndIncome, true);
  modal.addEventListener("click", interceptKnowledgeAndIncome, true);
  app.addEventListener("click", (event) => handle(event));
  modal.addEventListener("click", (event) => handle(event));
  function handle(event) {
    const b = event.target.closest("[data-do]");
    if (!b || b.disabled || !b.isConnected) return;
    const d = b.dataset;
    if (s?.tutorial === "build" && d.do === "district" && d.id !== s.ledger.at(-1)?.attribute) return;
    call(() => {
      switch (d.do) {
        case "skipTutorial":
          clearTimeout(drawTimer);
          clearTimeout(poolTimer);
          s.tutorial = "done";
          if (s.phase === "drawing") s.phase = "ready";
          save();
          render();
          toast("已跳过新手教程，可随时点问号查看概念说明。");
          break;
        case "startDay":
          G.startDay(s);
          save();
          render();
          break;
        case "finalProfile":
          s.phase = "summary";
          save();
          render();
          break;
        case "dismissFeedback":
          s.city.feedback = null;
          save();
          city();
          break;
        case "aiProfile":
          remoteProfile();
          break;
        case "aiLesson":
          remoteLesson(d.concept);
          break;
        case "poolReveal":
          poolReveal();
          break;
        case "aiOptions":
          aiOptions();
          break;
        case "aiEnable":
          PandaAI.enabled = true;
          localStorage.setItem(AI_PREF, "ai");
          close();
          toast("已开启剧情AI；本局匿名游戏信息会发送到服务端。");
          break;
        case "aiDisable":
          PandaAI.enabled = false;
          localStorage.setItem(AI_PREF, "local");
          PandaAI.cancel();
          close();
          toast("已切回本地剧情。");
          break;
        case "askName":
          askName();
          break;
        case "cardHall":
          cardHall();
          break;
        case "drawPool":
          drawPool(d.id);
          break;
        case "warehouse":
          warehouse();
          break;
        case "records":
          open("董事长手账", '<div class="actions"><button data-do="ledger">事件账本</button><button data-do="cityLedger">城市账本</button><button data-do="profile">过程证据</button><button data-do="lessonMenu">微课堂</button><button data-do="bonds">伙伴档案</button></div>');
          break;
        case "tutorialReward":
          if (s.tutorial !== "reward") break;
          s.city.materials.momentum++;
          s.city.materials.lowvol++;
          s.tutorial = "build";
          s.view = "city";
          save();
          render();
          toast("收到动量木材与低波钢材，去建造吧。");
          break;
        case "finishTutorial":
          s.tutorial = "done";
          s.view = "city";
          if (s.phase === "result") G.next(s);
          save();
          render();
          break;
        case "tagStatus":
          if (G.people.some((p) => p.id === d.id)) G.correct(s, d.id, d.value);
          s.analystCorrections ||= {};
          s.analystCorrections[d.id] = {
            ...(s.analystCorrections[d.id] || {}),
            status: d.value,
          };
          s.profileVersion++;
          save();
          summary();
          break;
        case "tagEdit": {
          const l = currentAnalysis().labels.find((l) => l.id === d.id);
          open("修改这条标签", `<label for="tagText">请用自己的话描述（最多80字）</label><input id="tagText" maxlength="80" value="${esc(l.edited || l.text)}"><button class="primary" data-do="tagSave" data-id="${d.id}">保存我的描述</button>`);
          break;
        }
        case "tagSave": {
          const text = $("#tagText").value.trim();
          if (!text) throw Error("描述不能为空");
          s.analystCorrections ||= {};
          s.analystCorrections[d.id] = { status: "confirmed", text };
          s.profileVersion++;
          save();
          modal.close();
          summary();
          break;
        }
        case "template": {
          const c = ProfileAnalyst.catalog.find((c) => c.id === d.id && c.status === "active");
          if (!c) throw Error("资源不可用");
          open(c.title, `<span class="badge">内置演示 / ${c.kind}</span><p style="margin-top:15px">${c.description}</p><div class="notice">不是实际资金策略建议。所需数据：自备或合成研究样本；研究时必须自行定义费用、样本区间和验证基准。本原型不连接真实账户。</div><button class="primary" data-do="resource" data-concept="${c.concept}">进入配套微课堂</button>`);
          break;
        }
        case "city":
          PandaAI.cancel();
          clearTimeout(drawTimer);
          if (s.phase === "drawing") s.phase = "ready";
          s.view = "city";
          save();
          render();
          break;
        case "board":
          modal.close();
          s.view = "board";
          save();
          render();
          break;
        case "pool":
          toast(GameCity.draw(s, d.id));
          save();
          city();
          break;
        case "district":
          district(d.id);
          break;
        case "buildCity": {
          const chosen = [...modal.querySelectorAll("input[name=factor]:checked")].map((x) => x.value);
          GameCity.build(s, d.id, chosen, Number($("#cityBudget").value));
          if (s.tutorial === "build") s.tutorial = "finish";
          save();
          modal.close();
          city();
          toast("区域蓝图已落地，等待领取建设收益。");
          break;
        }
        case "cityBudget": {
          const ids = [...modal.querySelectorAll("input[name=factor]:checked")].map((x) => x.value);
          GameCity.refit(s, d.id, ids, Number($("#cityBudget").value));
          save();
          modal.close();
          city();
          break;
        }
        case "cycle": {
          const a = GameCity.draft(s);
          s.city.pending = a;
          open("领取今日建设收益", `<p>根据当前城区、材料、预算和今日市场状态，结算一次建设收益。领取后当天不能重复领取。</p><div class="numbers"><div><small>城区预算</small><strong>${a.amount}</strong></div><div><small>运营费用</small><strong>${a.fees}</strong></div><div><small>当前现金</small><strong>${s.balance}</strong></div></div><p class="notice">教学规则 city-1.0：合成市场变动在 −8% 至 +8%；不同策略和材料改变暴露。净结果可能为负；组合毛收益界限约 −12% 至 +12%，再扣上述费用。没有真实行情或 Panda 回测。</p><button class="primary" data-do="confirmCycle">确认领取</button><button data-do="close">取消</button>`);
          break;
        }
        case "confirmCycle": {
          if (!s.city.pending) break;
          const a = s.city.pending;
          GameCity.settle(s, a);
          save();
          modal.close();
          city();
          toast("今日建设收益已到账，城区建设与稳定性已更新。");
          break;
        }
        case "cityLedger":
          cityLedger();
          break;
        case "close":
          close();
          break;
        case "continue":
          s = migrateStrategies(JSON.parse(JSON.stringify(saved)));
          s.tutorial ||= "done";
          if (s.phase === "drawing") s.phase = "ready";
          if (s.cg === "generating") s.cg = "cancelled";
          s.draft = null;
          render();
          break;
        case "draw":
          if (s.phase !== "ready") break;
          if (!s.event) G.draw(s);
          s.phase = "drawing";
          save();
          render();
          drawTimer = setTimeout(reveal, window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 40 : 2400);
          break;
        case "reveal":
          reveal();
          break;
        case "cancelDraw":
          clearTimeout(drawTimer);
          s.phase = "ready";
          save();
          render();
          break;
        case "npc":
          PandaAI.cancel();
          s.npc = Number(d.id);
          save();
          render();
          break;
        case "ask":
          ask(d.kind, true);
          break;
        case "choose":
          confirmAction(d.id);
          break;
        case "confirm": {
          if (!s.draft) break;
          const a = { ...s.draft, reason: $("#reason").value };
          b.disabled = true;
          G.settle(s, a);
          const linked = GameCity.init(s),
            attribute = s.ledger.at(-1)?.attribute;
          if (attribute && !linked.blueprints.includes(attribute)) linked.blueprints.push(attribute);
          if (s.tutorial === "decision") s.tutorial = "reward";
          say(a.amount ? `董事长，${a.amount} 币试验已经落账。下一夜，我们可以回看这次假设是否得到检验；一次输赢还不说明方法。` : a.report ? `董事长，报告已经归档。时间戳、独立样本和完整费用，是我们下一次讨论的起点。` : `董事长，这一夜你保留了现金。选择观察也有它的理由，我会记住你对这次情境的解释。`);
          if (s.round === G.CONFIG.rounds - 1) {
            G.next(s);
            save();
            modal.close();
            render();
            toast("第三天完成，已结算；请先查看第 4 天最终财报。");
          } else {
            save();
            modal.close();
            render();
            toast("决策已记录，故事继续。");
          }
          break;
        }
        case "next":
          PandaAI.cancel();
          cgToken++;
          G.next(s);
          save();
          render();
          break;
        case "ledger":
          ledger();
          break;
        case "replay": {
          const l = s.ledger[Number(d.id)],
            r = G.replay(l.event, l.proposal);
          toast(r.delta === l.delta ? "核验一致：净变化 " + r.delta + " 币" : "核验异常，请导出账本");
          break;
        }
        case "bonds":
          bonds();
          break;
        case "partnerDetail":
          partnerDetail(Number(d.id));
          break;
        case "profile":
          open("本局画像证据", profileBody());
          break;
        case "correct":
          G.correct(s, d.id, d.value);
          s.analystCorrections ||= {};
          s.analystCorrections[d.id] = {
            ...(s.analystCorrections[d.id] || {}),
            status: d.value,
          };
          save();
          if (s.phase === "summary" && !modal.open) summary();
          else open("本局画像证据", profileBody());
          toast("已更新画像；拒绝的观察不会自动重新启用");
          break;
        case "goal":
          s.goal = $("#profileGoal").value;
          s.profileVersion++;
          save();
          if (s.phase === "summary") summary();
          toast("学习目标已更新，推荐使用新目标");
          break;
        case "lesson":
        case "introLesson":
          lesson();
          break;
        case "lessonMenu":
          open(
            "选择一间微课堂",
            Object.keys(lessons)
              .map((c) => `<p><button data-do="resource" data-concept="${c}">${c} →</button></p>`)
              .join(""),
          );
          break;
        case "resource":
          lesson(d.concept);
          break;
        case "quiz": {
          const yes = Number(d.id) === lessons[d.concept][4];
          $("#quizfeedback").textContent = yes ? "答对了。你完成了一次学习后练习；还不能据此判断迁移能力。" : "再想想。上面的讲解可以帮助你核对，不扣分。";
          if (s && yes && !s.quiz.includes(d.concept)) {
            s.quiz.push(d.concept);
            s.xp += 10;
            G.evidence(s, "knowledge", d.concept + "练习答对", "task_result", "after_learning", true);
            save();
          }
          break;
        }
        case "cg":
          cg();
          break;
        case "cancelCG":
          cgToken++;
          s.cg = "cancelled";
          save();
          render();
          break;
        case "settings":
          settings();
          break;
        case "rename":
          s.name = ($("#rename").value.trim().slice(0, 12) || "玩家").replace(/总+$/, "") || "玩家";
          save();
          close();
          render();
          break;
        case "toggleSave":
          s.save = !s.save;
          if (s.save) save();
          else {
            localStorage.removeItem(KEY);
            saved = null;
          }
          settings();
          break;
        case "restart":
          open("开启新一局？", '<p>本局会被新局替换。若想保留记录，可以先导出。</p><div class="actions"><button data-do="export">导出本局</button><button class="primary" data-do="new">确认重开</button><button data-do="close">取消</button></div>');
          break;
        case "new":
          PandaAI.cancel();
          cgToken++;
          clearTimeout(drawTimer);
          localStorage.removeItem(KEY);
          saved = null;
          modal.close();
          intro();
          break;
        case "clear":
          open("清除本地记录？", '<p>删除此游戏在浏览器中的进度与画像；该操作不能撤回。已导出的文件需要你自行删除。</p><button class="primary" data-do="clearYes">确认清除</button><button data-do="close">取消</button>');
          break;
        case "clearYes":
          PandaAI.cancel();
          clearTimeout(drawTimer);
          clearTimeout(poolTimer);
          cgToken++;
          localStorage.removeItem(KEY);
          saved = null;
          s = null;
          modal.close();
          intro();
          toast("本地进度与画像已清除");
          break;
        case "feedback":
          if (!s.resourceFeedback.includes(d.id)) s.resourceFeedback.push(d.id);
          save();
          summary();
          toast("已记录反馈，可修改学习目标获得不同推荐");
          break;
        case "export": {
          const a = document.createElement("a"),
            url = URL.createObjectURL(
              new Blob([JSON.stringify(s, null, 2)], {
                type: "application/json",
              }),
            );
          a.href = url;
          a.download = "量化董事会-本局记录.json";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          break;
        }
      }
    });
  }
  function currentAnalysis() {
    const a = JSON.parse(JSON.stringify(s.aiProfile || ProfileAnalyst.analyze(s)));
    for (const l of a.labels) {
      const c = s.analystCorrections?.[l.id] || s.corrections?.[l.id];
      if (c) {
        l.status = typeof c === "string" ? c : c.status;
        l.edited = c.text || null;
      }
    }
    return a;
  }
  function decisionTrace() {
    const types = {
      trend: { name: "趋势型", role: "趋势交易员", score: 0 },
      value: { name: "价值型", role: "价值投资员", score: 0 },
      defense: { name: "防守型", role: "风险管理师", score: 0 },
      research: { name: "研究型", role: "量化研究员", score: 0 },
    };
    for (const e of s.evidence.filter((e) => e.dimension === "attribute")) if (types[e.value]) types[e.value].score++;
    const total = Object.values(types).reduce((n, x) => n + x.score, 0) || 1,
      ranked = Object.values(types).sort((a, b) => b.score - a.score),
      top = ranked[0],
      person = G.people.find((p) => p.name === top.role),
      raw = Object.values(types).map((x) => (x.score / total) * 100),
      floors = raw.map(Math.floor),
      left = 100 - floors.reduce((a, b) => a + b, 0),
      order = raw.map((x, i) => ({ i, r: x - floors[i] })).sort((a, b) => b.r - a.r);
    for (let i = 0; i < left; i++) floors[order[i % order.length].i]++;
    Object.values(types).forEach((x, i) => (x.percent = floors[i]));
    return `<section class="decision-map"><div class="result-role">${art(person, "result-portrait")}<div><small>你的主角色 · 推荐职业</small><h2>${top.role}</h2><h3>${top.name} · ${top.percent}%</h3><p>${esc(person.hint)}</p></div></div><div class="strategy-grid">${Object.values(types)
      .map((x) => `<span class="${x === top ? "top" : ""}"><b>${x.percent}%</b>${x.name}<small>${x.score} 点 · ${x.role}</small></span>`)
      .join("")}</div><p class="muted">百分比合计 100%。每轮选择 +1，首次建设对应产业也 +1；职业由玩家最终决定。</p></section>`;
  }
  function strategyGuide() {
    const counts = { trend: 0, value: 0, defense: 0, research: 0 };
    for (const e of s.evidence.filter((e) => e.dimension === "attribute")) if (e.value in counts) counts[e.value]++;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0],
      humor = {
        trend: "你的手比新闻推送还快：看到方向就想上车，但记得车也会掉头。",
        value: "你像逛打折区的董事长：便宜会心动，不过先确认不是“清仓甩卖”。",
        defense: "你是董事会的现金保安：别人冲浪，你先检查救生衣。",
        research: "你是董事会的问号制造机：不先把依据问明白，钱就别想出门。",
      }[top];
    const guides = [
      {
        id: "trend",
        name: "趋势策略",
        plain: "看到价格已经连续朝一个方向走，再考虑跟上；如果它突然掉头，就按事先定好的位置退出。",
        match: "可用工具：看近期涨跌、是否创出新高，以及跌到哪里必须停手。",
        url: "https://www.pandaaiquant.com/docs/strategy",
        cta: "看策略开发与趋势模板",
      },
      {
        id: "value",
        name: "价值策略",
        plain: "找价格变便宜、公司经营又没有明显变坏的股票。不要因为跌得多，就自动认为值得买。",
        match: "可用工具：比较价格和盈利，检查负债、现金够不够，以及公司为什么变便宜。",
        url: "https://www.pandaaiquant.com/docs/factor-library",
        cta: "看 PandaAI 因子库",
      },
      {
        id: "defense",
        name: "防守策略",
        plain: "每次少投一点，手里留些现金，先规定最多能接受亏多少，再等下一次机会。",
        match: "可用工具：限制每次投入、优先选择涨跌较小的标的，并把买卖费用算进去。",
        url: "https://www.pandaaiquant.com/docs/strategy",
        cta: "看风控与策略闭环",
      },
      {
        id: "research",
        name: "研究策略",
        plain: "先查消息和数据是不是真的，再换一段从没看过的时间测试，避免只挑好看的结果。",
        match: "可用工具：把价格和成交量放在一起看，用多个信号互相核对。",
        url: "https://www.pandaaiquant.com/docs/quantfactor-center",
        cta: "去量化因子中心",
      },
    ];
    return `<section class="strategy-guide"><div class="humor-profile"><b>董事会吐槽式鉴定</b><p>${humor}</p></div><h2>四种策略到底在干什么？</h2>${guides.map((g) => `<article class="strategy-explain ${g.id === top ? "best" : ""}"><span class="badge">${g.id === top ? "最匹配" : "可搭配"} · ${counts[g.id]} 点</span><h3>${g.name}</h3><p>${g.plain}</p><small>${g.match}</small><a href="${g.url}" target="_blank" rel="noopener noreferrer">${g.cta} →</a></article>`).join("")}<a class="course-cta" href="https://www.pandaaiquant.com/learninghub/newcourse" target="_blank" rel="noopener noreferrer">还看不懂？去量变学院系统学 →</a></section>`;
  }
  function measurementBody() {
    const values = (dimension) => s.evidence.filter((e) => e.dimension === dimension).map((e) => e.value),
      top = (arr) => {
        const c = {};
        for (const x of arr) c[x] = (c[x] || 0) + 1;
        return Object.entries(c).sort((a, b) => b[1] - a[1])[0] || ["暂无", 0];
      },
      risks = values("risk_appetite"),
      money = values("money_style"),
      decisions = values("decision_style"),
      r = top(risks),
      m = top(money),
      d = top(decisions),
      k = knowledgeStatus(),
      riskLabel = r[0] === "高" ? "偏进取" : r[0] === "低" ? "偏稳健" : r[0] === "中" || r[0] === "中低" ? "相对均衡" : "待观察",
      stable = risks.length >= 3 && r[1] / risks.length >= 0.6 ? "选择比较稳定" : risks.length >= 3 ? "会根据场景调整" : "证据还不够";
    return `<section class="measurement"><h2>这次到底测了什么？</h2><div class="measurement-grid"><article><small>风险偏好</small><b>${riskLabel}</b><p>${risks.length} 次记录 · ${stable}</p></article><article><small>资金管理</small><b>${m[0]}</b><p>${money.length} 次资金选择</p></article><article><small>决策方式</small><b>${d[0]}</b><p>${decisions.length} 次决策记录</p></article><article><small>金融知识</small><b>${k.level}</b><p>${k.correct}/${k.answered || 0} 道知识题答对</p></article></div><p class="muted">风险高低没有好坏；金融知识由答题判断，不会因为赚了钱就算高手。证据互相冲突时显示“会根据场景调整”。</p></section>`;
  }
  function analystBody() {
    const a = currentAnalysis();
    return `<div class="notice">${a.mode === "ai" ? "DeepSeek 生成的候选画像 · 需你确认。" : "规则画像 · 行为证据可核查。"}${PandaAI.enabled ? '<button class="small" data-do="aiProfile">生成 AI 复盘</button>' : ""}</div><p>${esc(a.narrative)}</p>${measurementBody()}${decisionTrace()}${strategyGuide()}${a.labels.map((l) => `<div class="claim"><h3>${esc(l.edited || l.text)} <span class="badge">${statusNames[l.status]}</span></h3><small>${esc(l.context)}</small><small>依据：${l.evidence_ids.join("、")} · ${l.edited ? "你修改的自述" : "规则生成候选"}</small><div class="actions"><button class="small" data-do="tagStatus" data-id="${l.id}" data-value="confirmed">确认</button><button class="small" data-do="tagStatus" data-id="${l.id}" data-value="rejected">拒绝</button><button class="small" data-do="tagEdit" data-id="${l.id}">修改描述</button></div></div>`).join("") || "<p>偏好未知：缺少足够行为证据。</p>"}<h3>PandaAIQuant 个性化下一步</h3><p class="muted">以下按策略偏好和知识水平分别匹配。AI Skills、策略库、因子库为比赛接入位；公开链接先进入课程中心。</p>${a.recommendations
      .map((r) => {
        const c = ProfileAnalyst.catalog.find((c) => c.id === r.resource_id);
        return `<div class="claim"><span class="badge">${c.kind} · ${c.fee}</span><h3>${c.title}</h3><p class="muted">为什么：${esc(r.reason)}</p><div class="notice"><b>下一步任务：</b>${esc(r.next_task || "打开资源继续学习")}</div><div class="actions"><button data-do="template" data-id="${c.id}">看本地说明</button><a class="button" href="${c.url}" target="_blank" rel="noopener noreferrer">去 PandaAI 学习中心 →</a></div></div>`;
      })
      .join("")}`;
  }
  function city() {
    const c = GameCity.init(s),
      t = s.tutorial && s.tutorial !== "done",
      target = s.ledger.at(-1)?.attribute || "trend",
      targetBlueprint = GameCity.blueprints.find((b) => b.id === target),
      feedback = c.feedback ? `<aside class="city-feedback"><b>${esc(c.feedback.title)}</b><p>${esc(c.feedback.text)}</p><button class="small" data-do="dismissFeedback">知道了</button></aside>` : "";
    app.innerHTML = `<main class="game city-game ${s.tutorial === "build" ? "tutorial-build tutorial-" + target : ""}">${world(!t || s.tutorial === "build")}${hud()}${t ? '<button class="tutorial-skip" data-do="skipTutorial">跳过教程</button>' : ""}${s.tutorial === "build" ? `<div class="tutorial-banner">你刚才选了${targetBlueprint.strategy}决策。现在建立对应总部。<span>↓</span></div><div class="tutorial-objective">落成${targetBlueprint.name} · 集团版图 +1</div>` : s.tutorial === "finish" ? `${character()}${speech(`${targetBlueprint.name}总部落成。<br>${esc(c.feedback?.text || targetBlueprint.strategy + " +1。")}`, '<button class="primary" data-do="finishTutorial">继续扩张 →</button>')}` : `<div class="island-name">ANGELA CAPITAL<small>董事长总部 · ${c.districts.length} / 4 栋战略大楼已落成</small></div><button class="mail-float" data-do="board" aria-label="打开商业情报">${CityArt.icon("cards")}<i></i></button>${dock()}${feedback}`}<div class="ambient-leaf leaf1"></div><div class="ambient-leaf leaf2"></div>${foot()}</main>`;
    save();
  }
  function cardHall() {
    const c = GameCity.init(s),
      day = GameCity.gameDay(s),
      season = s.season || 1,
      prefix = "-season-" + season + "-day-",
      strategy = c.drawn["strategy" + prefix + day],
      factor = c.drawn["factor" + prefix + day],
      types = GameCity.blueprints.map((b) => `<span><b>${b.name}</b><small>${b.partner}</small></span>`).join(""),
      materials = GameCity.factors.map((f) => `<span><b>${f.name}</b><small>${f.label}</small></span>`).join("");
    open("第 " + season + " 赛季 · 第 " + day + " 天补给站", `<p class="muted">新手记住两件事：蓝图卡用来解锁一块地；策略卡用来给楼增加一层。每天各抽 1 张。</p><div class="strategy-link-grid">${types}</div><div class="poolselection"><button class="pool-card" data-do="board"><span>✦</span><b>市场决策</b><small>${s.round % 3}/3 已完成</small></button><button class="pool-card blueprint-pool" data-do="drawPool" data-id="strategy" ${strategy ? "disabled" : ""}><span>${CityArt.icon("blueprint")}</span><b>抽区域蓝图</b><small>${strategy ? "今天抽过了" : "抽到后才能在对应区域建楼"}</small></button><button class="pool-card materials-pool" data-do="drawPool" data-id="factor" ${factor ? "disabled" : ""}><span>${CityArt.icon("cards")}</span><b>抽策略卡</b><small>${factor ? "今天抽过了" : "每张卡就是一层策略楼"}</small></button></div><details><summary>查看策略卡分类</summary><div class="strategy-link-grid materials">${materials}</div></details>`);
  }
  function drawPool(pool) {
    if (poolLoot) return;
    const item = GameCity.draw(s, pool),
      rarity = s.city.draws.at(-1).rarity;
    save();
    poolLoot = { pool, item, rarity };
    open("补给抵港", `<div class="pool-spin-stage"><button class="sealedcard poolspin ${pool} rarity-${rarity.toLowerCase()}" data-do="poolReveal"><span class="rarity-badge">${rarity}</span><span class="seal">✦</span><b>${pool === "strategy" ? "区域蓝图" : "策略卡"}</b><small>点击跳过演出</small></button></div>`);
    poolTimer = setTimeout(poolReveal, window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 40 : 2400);
  }
  function poolReveal() {
    if (!poolLoot) return;
    clearTimeout(poolTimer);
    const { pool, item, rarity } = poolLoot;
    poolLoot = null;
    const clean = item.replace(/ × 2$/, ""),
      bp = GameCity.blueprints.find((x) => item.includes(x.name)),
      factor = GameCity.factors.find((x) => clean === x.name),
      explain = bp ? `${bp.strategy}产业：${bp.description} 建成后对应属性 +1。` : factor ? `${factor.label}：${factor.description} 安装到对应大楼后，就会新增一层。` : "四个区域蓝图已经集齐，所以改送一张补充策略卡。";
    open(rarity + " 抽到了", `<div class="loot-reveal rarity-${rarity.toLowerCase()}"><div class="loot-icon">${CityArt.icon(pool === "strategy" ? "blueprint" : "wood")}</div><h3>${item}</h3><p>${esc(explain)}</p><small>已放进仓库 · 今天不能再抽同类卡</small><button class="primary" data-do="close">收下</button></div>`);
  }
  function warehouse() {
    const c = GameCity.init(s),
      guides = {
        trend: { plain: "顺着已经形成的上涨或下跌方向做，但要防止刚追进去就反转。", rule: "先定什么情况买，再定跌到哪里退出；突破失败就停。", signals: "近期涨跌、均线、价格突破" },
        value: { plain: "找价格相对便宜、基本情况还可以的标的，等价格回到更合理的位置。", rule: "便宜不等于值得买；要同时看盈利、负债和为什么变便宜。", signals: "估值、盈利质量、价格反转" },
        defense: { plain: "先控制最坏会亏多少，再考虑能赚多少；看不清时可以少投或不投。", rule: "限制单次投入和最大亏损，避免把钱集中在一个机会里。", signals: "波动、质量、仓位和止损" },
        research: { plain: "先查证消息和数据，再组合多个信号做决定，重点是换个时间还能不能成立。", rule: "用旧数据想办法，再用没看过的数据考试；算上费用，也不能偷看后来才公布的消息。", signals: "价格、成交量、多个信号互相核对" },
      },
      cards = GameCity.blueprints.map((b) => {
        const g = guides[b.id],
          factors = GameCity.factors.filter((f) => f.industry === b.id),
          district = c.districts.find((d) => d.id === b.id),
          installed = district?.factors || [];
        return `<section class="strategy-family family-${b.id}"><header><span>${b.icon}</span><div><h3>${b.strategy}</h3><small>${g.plain}</small></div></header><div class="strategy-rule"><b>怎么做</b><p>${g.rule}</p><small>常看：${g.signals}</small></div><div class="factor-shelf">${factors.map((f) => `<article class="factor-card ${installed.includes(f.id) ? "installed" : ""}"><div><b>${f.name}</b><em>${f.difficulty}</em></div><p>${f.description}</p><small>${installed.includes(f.id) ? "✓ 已装进 " + b.name : "库存 " + c.materials[f.id] + " 张 · 可装进 " + b.name}</small><a href="https://www.pandaaiquant.com/docs/factor-library" target="_blank" rel="noopener noreferrer">去 Panda 因子库核对</a></article>`).join("")}</div><div class="strategy-status"><b>我的策略楼</b><span>${district ? `${district.floors} 层 · 已投入 ${district.budget} 币 · ${district.strategies.join("、")}` : "还没建设；先在市场事件中做一次同类决策，再抽到区域蓝图。"}</span></div><nav class="panda-actions"><a href="https://www.pandaaiquant.com/docs/strategy" target="_blank" rel="noopener noreferrer">看 Panda 策略规则</a><a href="https://www.pandaaiquant.com/docs/quantfactor-center" target="_blank" rel="noopener noreferrer">挑选更多因子</a><a href="https://www.pandaaiquant.com/docs/qube" target="_blank" rel="noopener noreferrer">让 AI 研究候选策略</a></nav></section>`;
      }).join("");
    open("集团策略中心", `<div class="strategy-library-intro"><b>四条商业路线，决定你的集团版图</b><p>策略是集团的买卖规则；因子是团队用来判断的数据信号。每栋总部对应一条路线，每装一张同类策略卡，大楼就向上生长一层。</p></div>${cards}<p class="muted">当前是规则映射和官方入口直连：会把你带到 PandaAI 对应的策略开发、因子中心或 Qube 研究说明。尚未登录或取得 PandaAI 接口授权，因此不会假装已经把你的游戏策略自动写入 Panda 账户。</p>`);
  }

  function district(id) {
    const c = GameCity.init(s),
      b = GameCity.blueprints.find((b) => b.id === id),
      d = c.districts.find((d) => d.id === id),
      cards = GameCity.factors.filter((f) => f.industry === id);
    if (!c.blueprints.includes(id)) return toast("先抽到对应区域卡，才能在这里建楼。");
    s.knowledgeUnlocks ||= {};
    if (s.tutorial === "build") s.knowledgeUnlocks[id] = true;
    if (!d && !s.knowledgeUnlocks[id]) return districtChallenge(id);
    const suggested = Math.max(100, Math.min(s.balance, Math.round((s.balance * 0.1) / 100) * 100));
    open(b.name, `<div class="eyebrow">${b.strategy} / ${s.tutorial === "build" ? "新手引导免答" : "已通过知识题"}</div><p>${b.description}</p><div class="notice"><b>${d ? "当前 " + d.floors + " 层" : "建楼会真实扣除游戏币"}</b><br>追加资金会提高每日收益；每安装一张同类策略卡，才会增加一层楼。投入越多收益越高，但会逐渐边际递减。</div>${d ? `<p>已运行策略：${d.strategies.join("、")}。累计建楼投入 ${d.budget} 游戏币。</p>` : '<p class="muted">选择1–2张策略卡作为首批楼层。没有对应区域卡不能建设。</p>'}${cards.map((f) => `<label><input type="checkbox" name="factor" value="${f.id}" ${d?.factors.includes(f.id) ? "checked disabled" : ""} ${!d?.factors.includes(f.id) && !c.materials[f.id] ? "disabled" : ""}> ${f.name}（卡库 ${c.materials[f.id]}）<small> · ${f.description}</small></label>`).join("")}<label for="cityBudget">${d ? "本次追加投入" : "本次建楼投入"}（最低 100，上限为当前现金 ${s.balance}）</label><input id="cityBudget" type="number" min="100" max="${s.balance}" step="1" value="${suggested}"><div class="numbers city-return-preview"><div><small>本次投入</small><strong id="cityPreviewSpend">${suggested}</strong></div><div><small>建成后楼层</small><strong id="cityPreviewFloors">-</strong></div><div><small>预计每日收益</small><strong id="cityPreviewIncome">-</strong></div></div><p class="muted">预计值按游戏规则计算；投入越多收益越高，但不会等比无限增长。</p><div class="notice">楼内策略当前使用合成行情教学。真实行情必须接 Panda Data 或其他明确数据源。</div><button class="primary" data-do="${d ? "cityBudget" : "buildCity"}" data-id="${id}" ${s.balance < 100 ? "disabled" : ""}>${d ? "追加投入 / 安装新策略" : "确认投资建楼"}</button>`);
    const updatePreview = () => {
      const amount = Number($("#cityBudget")?.value) || 0,
        additions = [...modal.querySelectorAll('input[name="factor"]:checked:not(:disabled)')].length,
        floors = d ? d.floors + additions : Math.max(1, additions),
        projected = { id, budget: (d?.budget || 0) + amount, floors, factors: Array(floors).fill("strategy"), development: d?.development || 0 },
        income = amount >= 100 && amount <= s.balance ? GameCity.returns(projected, {}).gross : 0;
      $("#cityPreviewSpend").textContent = amount || "-";
      $("#cityPreviewFloors").textContent = floors + " 层";
      $("#cityPreviewIncome").textContent = income ? "约 +" + income : "金额无效";
    };
    $("#cityBudget").addEventListener("input", updatePreview);
    modal.querySelectorAll('input[name="factor"]').forEach((input) => input.addEventListener("change", updatePreview));
    updatePreview();
  }
  function cityLedger() {
    const c = GameCity.init(s);
    open("每日建设收益账本", `${c.ledger.map((l) => `<div class="ledgeritem"><b>游戏第 ${l.gameDay || "?"} 天 · 经营收益</b><br>${l.balanceBefore} → ${l.balanceAfter} 币${l.details.map((d) => `<p>${GameCity.blueprints.find((b) => b.id === d.id).name}：投入 ${d.budget} · ${d.floors || d.factors.length} 层 · 收入 +${d.delta}<br><small>策略 ${d.factors.join(", ")} · 建设度 ${d.development}%</small></p>`).join("")}<small>${l.rule} · ${l.idempotencyKey}</small></div>`).join("") || "<p>还没有领取建设收益。先建设一个区域吧。</p>"}<p class="muted">这是游戏内按投入、楼层和建设度计算的收益，不代表真实投资回报。</p>`);
  }
  async function aiOptions() {
    const status = await PandaAI.status();
    open("智慧角色", `<p>${status.mode === "available" ? "服务端 AI 已配置，可以开启。" : "AI 尚未配置，当前使用本地剧情。"}</p><p><b>角色语音：${status.voice === "available" ? "ElevenLabs 已连接" : "未配置"}</b></p><p class="muted">开启后只发送当前合成事件、匿名选择、课堂概念和证据。角色语音开启时会把生成的短对白发送给 ElevenLabs，并产生相应用量。金币与结算仍由本地规则计算。</p>${status.mode === "available" ? '<button class="primary" data-do="aiEnable">同意并开启智慧角色</button>' : ""}<button data-do="aiDisable">使用本地剧情</button>`);
  }
  async function remoteDialogue(text) {
    const eventId = s.event?.id,
      npc = s.npc,
      run = s.id;
    toast("正在听取伙伴的想法…");
    const result = await PandaAI.request("dialogue", { role: G.people[npc].id, message: text, facts: s.event || {} }, run + "-" + Date.now());
    if (!s || s.id !== run || s.event?.id !== eventId || s.npc !== npc) return;
    const reply = result?.text || G.parse(s, text).message || "先核对规则，再决定这一步。";
    say(reply);
    render();
    if (result) PandaAI.speak(G.people[npc].id, reply);
  }
  async function remoteEvent() {
    const id = s.event.id,
      run = s.id;
    const result = await PandaAI.request("event", { facts: s.event, role: G.people[s.npc].id }, id + "-story");
    if (result && s?.id === run && s.event?.id === id && s.phase === "event" && !s.draft) {
      s.event.story = result.story;
      s.event.title = result.title;
      s.event.source = "DeepSeek 叙事 / 本地锁定规则";
      save();
      render();
    }
  }
  async function remoteLesson(concept) {
    const id = s?.event?.id,
      run = s?.id;
    const target = $("#aiLessonText");
    if (!target) return;
    target.textContent = "伙伴正在整理讲解…";
    const result = await PandaAI.request(
      "lesson",
      {
        concept,
        facts: s?.event || {},
        choices: s?.ledger.slice(-2).map((l) => ({ action: l.actionId, reason: l.proposal.reason })) || [],
      },
      (run || "lesson") + "-" + Date.now(),
    );
    if (!target.isConnected || !modal.open || s?.id !== run || s?.event?.id !== id) return;
    target.innerHTML = result ? `<h3>${esc(result.title)}</h3><p>${esc(result.explanation)}</p><small>DeepSeek生成讲解；下方原有练习仍按本地规则判断。</small>` : "暂时没有收到讲解，可继续使用上面的本地课堂。";
  }
  async function remoteProfile() {
    const run = s.id,
      v = s.profileVersion;
    toast("伙伴正在整理本局证据…");
    const result = await PandaAI.request(
      "profile",
      {
        evidence: s.evidence,
        goal: s.goal,
        choices: s.ledger.map((l) => ({
          action: l.actionId,
          reason: l.proposal.reason,
        })),
        city: s.city?.districts || [],
      },
      run + "-profile-" + v,
    );
    if (!s || s.id !== run || s.profileVersion !== v) return;
    if (result) {
      try {
        ProfileAnalyst.validate(result, s);
        s.aiProfile = result;
        save();
        summary();
      } catch {
        toast("画像证据校验失败，保留本地结果。");
      }
    } else toast("AI暂不可用，保留本地结果。");
  }
  function reveal() {
    if (s?.phase !== "drawing") return;
    clearTimeout(drawTimer);
    s.phase = "event";
    if (!s.event) G.draw(s);
    if (s.event?.lead) {
      const lead = G.people.findIndex((p) => p.id === s.event.lead);
      if (lead >= 0) s.npc = lead;
    }
    if (s.tutorial === "draw") s.tutorial = "decision";
    save();
    render();
    if (PandaAI.enabled) remoteEvent();
  }
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      toast("另一个标签页修改了存档。为避免冲突，本页改为临时体验。");
      if (s) s.save = false;
    }
  });
  app.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[role=button][data-do]")) {
      e.preventDefault();
      handle({ target: e.target });
    }
  });
  window.addEventListener("offline", () => toast("离线可继续：规则、课堂与存档均在本机运行。"));
  const publicAiHost = location.hostname.endsWith("github.io") || location.hostname === "quant-game.angela-tech.com";
  if (publicAiHost && localStorage.getItem(AI_PREF) !== "local") {
    PandaAI.enabled = true;
    void PandaAI.status().then((status) => {
      if (status.mode !== "available") PandaAI.enabled = false;
      if (s) render();
    });
  }
  if (saved) {
    s = migrateStrategies(JSON.parse(JSON.stringify(saved)));
    s.tutorial ||= "done";
    if (s.phase === "drawing") s.phase = "ready";
    s.draft = null;
    if (s.city) s.city.pending = null;
    if (s.cg === "generating") s.cg = "cancelled";
    render();
  } else intro();
})();
