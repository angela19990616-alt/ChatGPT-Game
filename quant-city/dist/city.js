(function (root) {
  "use strict";
  const blueprints = [
    {
      id: "trend",
      name: "远见资本",
      strategy: "趋势决策",
      partner: "趋势交易员",
      icon: "◈",
      color: "#90bfea",
      description: "看最近正在持续上涨的板块，设定自己的投入金额和退出规则。",
      dailyIncome: 180,
    },
    {
      id: "value",
      name: "恒金控股",
      strategy: "价值决策",
      partner: "价值投资员",
      icon: "◇",
      color: "#d6b785",
      description: "找价格相对便宜、基本情况还说得过去的标的，防止只因为下跌就买。",
      dailyIncome: 150,
    },
    {
      id: "defense",
      name: "曜盾风控",
      strategy: "防守决策",
      partner: "风险管理师",
      icon: "⬡",
      color: "#91d8c1",
      description: "优先控制一次可能亏多少，看不清时也可以保留现金。",
      dailyIncome: 120,
    },
    {
      id: "research",
      name: "星图研究院",
      strategy: "研究决策",
      partner: "量化研究员",
      icon: "✦",
      color: "#a9a0e8",
      description: "先核对消息、价格、成交量和费用，再决定要不要投入。",
      dailyIncome: 140,
    },
  ];
  const factors = [
    {
      id: "momentum",
      difficulty: "R",
      concept: "动量因子",
      industry: "trend",
      name: "动量策略",
      icon: "▤",
      label: "趋势楼层",
      description: "看最近涨得强的标的是否继续走强；安装后成为一层趋势策略。",
    },
    {
      id: "breakout",
      difficulty: "SR",
      concept: "突破策略",
      industry: "trend",
      name: "突破策略",
      icon: "▤",
      label: "趋势楼层",
      description: "价格突破一段时间的高点后跟进；假突破时可能亏损。",
    },
    {
      id: "lowvol",
      difficulty: "R",
      concept: "低波动因子",
      industry: "defense",
      name: "低波动策略",
      icon: "▥",
      label: "防守楼层",
      description: "优先选择波动较小的标的，但不等于保证不亏。",
    },
    {
      id: "quality",
      difficulty: "SR",
      concept: "质量因子",
      industry: "defense",
      name: "质量防守策略",
      icon: "▥",
      label: "防守楼层",
      description: "关注盈利质量和负债情况，减少只看价格的误判。",
    },
    {
      id: "value",
      difficulty: "R",
      concept: "估值因子",
      industry: "value",
      name: "低估值策略",
      icon: "▧",
      label: "价值楼层",
      description: "寻找相对便宜的标的，同时要防止价值陷阱。",
    },
    {
      id: "reversal",
      difficulty: "SR",
      concept: "反转策略",
      industry: "value",
      name: "反转策略",
      icon: "▧",
      label: "价值楼层",
      description: "押注过度下跌后的修复，继续下跌时风险较大。",
    },
    {
      id: "volume",
      difficulty: "R",
      concept: "量价验证",
      industry: "research",
      name: "量价研究策略",
      icon: "⌁",
      label: "研究楼层",
      description: "把价格变化和成交量放在一起核对，减少只听消息。",
    },
    {
      id: "multifactor",
      difficulty: "SSR",
      concept: "多因子组合",
      industry: "research",
      name: "多因子策略",
      icon: "⌁",
      label: "研究楼层",
      description: "组合多个信号再做判断，需要检查样本外表现和交易成本。",
    },
  ];
  function init(s) {
    if (!s.city)
      s.city = {
        version: 3,
        cycle: 0,
        blueprints: ["trend"],
        materials: { momentum: 2, lowvol: 2, value: 1, volume: 1 },
        districts: [],
        ledger: [],
        draws: [],
        drawn: {},
        pending: null,
        feedback: null,
      };
    s.city.version = 3;
    s.city.feedback ??= null;
    for (const f of factors) s.city.materials[f.id] ??= 0;
    for (const d of s.city.districts) {
      d.floors ??= Math.max(1, d.factors?.length || 1);
      d.strategies ??= (d.factors || []).map((id) => factors.find((f) => f.id === id)?.name || id);
    }
    return s.city;
  }
  function gameDay(s) {
    return Math.min(Game.CONFIG.days, Math.floor(s.round / Game.CONFIG.roundsPerDay) + 1);
  }
  function cycledToday(s) {
    const day = gameDay(s),
      season = s.season || 1;
    return init(s).ledger.some((x) => (x.gameDay || 0) === day && (x.season || 1) === season);
  }
  function draw(s, pool) {
    const c = init(s),
      day = gameDay(s),
      season = s.season || 1,
      key = pool + "-season-" + season + "-day-" + day;
    if (c.drawn[key]) throw Error("今天已经抽过这类卡了，明天再来");
    c.drawn[key] = true;
    let item;
    if (pool === "strategy") {
      const available = blueprints.filter((b) => !c.blueprints.includes(b.id));
      item = available[Math.floor(Game.rand(s.seed + season * 101 + day * 31 + 782) * available.length)];
      if (item) c.blueprints.push(item.id);
      else {
        c.materials.lowvol++;
        item = { name: "区域卡已齐全 · 补充低波动策略卡" };
      }
    } else if (pool === "factor") {
      const f = factors[Math.floor(Game.rand(s.seed + season * 101 + day * 37 + 521) * factors.length)];
      c.materials[f.id] += 1;
      item = { name: f.name + " × 1" };
    } else throw Error("未知卡池");
    const roll = Game.rand(s.seed + season * 101 + day * 97 + (pool === "strategy" ? 11 : 23)),
      rarity = roll < 0.5 ? "R" : roll < 0.85 ? "SR" : "SSR";
    c.draws.push({ season, day, pool, item: item.name, rarity });
    return item.name;
  }
  function build(s, id, factorIds, budget) {
    const c = init(s);
    if (!c.blueprints.includes(id) || c.districts.some((d) => d.id === id)) throw Error("区域卡不可用或大楼已建成");
    if (!s.evidence.some((e) => e.dimension === "attribute" && e.value === id && e.source !== "city_build")) throw Error("先完成一次同类策略决策，才能在这里建楼");
    if (!Number.isInteger(budget) || budget < 100) throw Error("建楼投入至少为100整数游戏币");
    if (budget > s.balance) throw Error("现金不足，不能建楼");
    if (factorIds.length < 1 || factorIds.length > 2 || new Set(factorIds).size !== factorIds.length) throw Error("选择1–2张不同策略卡");
    for (const f of factorIds) {
      const card = factors.find((x) => x.id === f);
      if (!card || card.industry !== id || !c.materials[f]) throw Error("只能使用这栋楼对应的策略卡");
    }
    for (const f of factorIds) c.materials[f]--;
    s.balance -= budget;
    const strategies = factorIds.map((fid) => factors.find((f) => f.id === fid).name),
      district = {
        id,
        factors: [...factorIds],
        strategies,
        floors: strategies.length,
        budget,
        development: 12,
        stability: 100,
        last: null,
      };
    c.districts.push(district);
    c.pending = null;
    const blueprint = blueprints.find((b) => b.id === id);
    c.feedback = {
      kind: "build",
      title: blueprint.name + "建成",
      text: "花费 " + budget + " 游戏币，建成 " + district.floors + " 层；每层运行一个策略：" + strategies.join("、"),
    };
    Game.evidence(s, "construction", id + "|" + factorIds.join("+") + "|cost:" + budget, "observed_action", "during", false, "city-" + id);
    Game.evidence(s, "attribute", id, "city_build", "during", false, "city-" + id);
    return district;
  }
  function refit(s, id, ids, budget) {
    const c = init(s),
      d = c.districts.find((d) => d.id === id);
    if (!d) throw Error("大楼不存在");
    if (!Number.isInteger(budget) || budget < 100) throw Error("加盖投入至少为100整数游戏币");
    const additions = ids.filter((fid) => !d.factors.includes(fid));
    if (budget > s.balance) throw Error("现金不足，不能加盖");
    for (const fid of additions) {
      const card = factors.find((f) => f.id === fid);
      if (!card || card.industry !== id || !c.materials[fid]) throw Error("策略卡不匹配或库存不足");
    }
    for (const fid of additions) {
      c.materials[fid]--;
      d.factors.push(fid);
      d.strategies.push(factors.find((f) => f.id === fid).name);
    }
    s.balance -= budget;
    d.budget += budget;
    d.floors = d.strategies.length;
    c.pending = null;
    const blueprint = blueprints.find((b) => b.id === id);
    c.feedback = {
      kind: "refit",
      title: blueprint.name + (additions.length ? "加盖完成" : "追加投入完成"),
      text: additions.length
        ? "花费 " + budget + " 游戏币，新增 " + additions.length + " 层。当前 " + d.floors + " 层：" + d.strategies.join("、")
        : "追加投入 " + budget + " 游戏币；楼层不变，预计每日经营收益提高。",
    };
    Game.evidence(s, "construction", id + "|add:" + additions.join("+") + "|cost:" + budget, "observed_action", "during", false);
  }
  function market(seed, cycle) {
    const x = Game.rand((seed + cycle * 7919 + 95671) >>> 0);
    return {
      seed: (seed + cycle * 7919 + 95671) >>> 0,
      regime: x < 0.34 ? "上行" : x < 0.67 ? "震荡" : "下行",
      basisPoints: Math.floor(x * 1601) - 800,
    };
  }
  function returns(d, m) {
    const bp = blueprints.find((b) => b.id === d.id),
      invested = Math.max(100, Number(d.budget) || 100),
      floors = Math.max(1, Number(d.floors) || d.factors?.length || 1),
      investmentFactor = Math.sqrt(invested / 1000),
      floorFactor = 1 + (floors - 1) * 0.1,
      developmentFactor = 1 + Math.min(0.16, Math.max(0, Number(d.development) || 0) * 0.0016),
      gross = Math.max(1, Math.floor(bp.dailyIncome * investmentFactor * floorFactor * developmentFactor));
    return {
      bp: 0,
      turnover: 0,
      fee: 0,
      gross,
      credit: gross,
      fixed: true,
      invested,
      floors,
      investmentFactor,
      floorFactor,
      developmentFactor,
    };
  }
  function draft(s) {
    const c = init(s),
      day = gameDay(s),
      season = s.season || 1;
    if (cycledToday(s)) throw Error("今天已经领取过建设收益；完成今天 3 轮决策后，明天可再次领取");
    if (!c.districts.length) throw Error("先建设至少一个策略区域");
    const amount = c.districts.reduce((n, d) => n + returns(d, {}).gross, 0);
    return {
      cycle: c.cycle,
      season,
      gameDay: day,
      key: s.id + "-city-season-" + season + "-day-" + day,
      amount,
      fees: 0,
      config: JSON.stringify(
        c.districts.map((d) => ({
          id: d.id,
          factors: d.factors,
          budget: d.budget,
          development: d.development,
        })),
      ),
      rule: "city-3.0-investment-scaled-income",
    };
  }
  function settle(s, a) {
    const c = init(s),
      prior = c.ledger.find((e) => e.idempotencyKey === a.key);
    if (prior) return prior;
    const valid = draft(s);
    if (a.key !== valid.key || a.config !== valid.config || a.cycle !== valid.cycle || a.gameDay !== valid.gameDay || a.season !== valid.season) throw Error("城市方案已变化，请重新确认");
    const m = { regime: "固定经营", basisPoints: 0, seed: 0 },
      before = s.balance,
      details = c.districts.map((d) => {
        const r = returns(d, m),
          delta = r.gross;
        d.development = Math.min(100, d.development + 8);
        d.stability = 100;
        d.last = { ...r, delta, cycle: c.cycle };
        return {
          id: d.id,
          budget: d.budget,
          factors: [...d.factors],
          development: d.development,
          stability: d.stability,
          ...d.last,
        };
      }),
      delta = details.reduce((n, d) => n + d.delta, 0);
    s.balance += delta;
    const entry = {
      idempotencyKey: a.key,
      cycle: c.cycle,
      season: a.season,
      gameDay: a.gameDay,
      market: m,
      rule: a.rule,
      proposal: a,
      details,
      balanceBefore: before,
      balanceAfter: s.balance,
      delta,
    };
    c.ledger.push(entry);
    c.cycle++;
    c.pending = null;
    c.feedback = {
      kind: "market",
      title: "第 " + a.season + " 赛季第 " + a.gameDay + " 天建设收益",
      text: "城区经营收益 +" + delta + " 游戏币。投入和楼层越多，收益基数越高，但投入采用边际递减。" + details.map((d) => blueprints.find((b) => b.id === d.id).name + " +" + d.delta).join("；"),
    };
    Game.evidence(s, "city", "第" + a.season + "赛季第" + a.gameDay + "天建设收益：" + details.map((d) => d.id + "|投入" + d.budget + "|楼层" + d.floors + "|+" + d.delta).join("；"), "observed_action", "during", false, "city-s" + a.season + "-d" + a.gameDay);
    return entry;
  }
  const api = {
    blueprints,
    factors,
    init,
    gameDay,
    cycledToday,
    draw,
    build,
    refit,
    market,
    returns,
    draft,
    settle,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.GameCity = api;
})(typeof window === "undefined" ? globalThis : window);
