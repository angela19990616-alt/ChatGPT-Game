const { JSDOM } = require("jsdom");
const fs = require("fs");
const assert = require("node:assert/strict");

const html = fs.readFileSync(__dirname + "/../dist/index.html", "utf8");

(async () => {
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "https://angela19990616-alt.github.io/ChatGPT-Game/quant-city/dist/index.html",
  });
  const w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.matchMedia = () => ({ matches: true });
  const requests = [];
  w.fetch = async (url) => {
    requests.push(String(url));
    return {
      ok: true,
      json: async () => ({
        mode: "available",
        voice: "mock",
        csrf: "test-csrf",
        session: "test-session",
      }),
    };
  };
  for (const file of ["engine.js", "city.js", "analyst.js", "city-art.js", "ai-client.js", "app.js"])
    w.eval(fs.readFileSync(__dirname + "/../dist/" + file, "utf8"));
  await new Promise((resolve) => w.setTimeout(resolve, 0));
  assert.equal(w.PandaAI.enabled, true);
  assert.ok(requests.some((url) => url === "https://quant-game.angela-tech.com/api/status"));
  assert.match(w.document.body.textContent, /AI 剧情 · 本地结算/);
  w.close();
  console.log("PASS: public GitHub Pages enables the secured AI backend by default.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
