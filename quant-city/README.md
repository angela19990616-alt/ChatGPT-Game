# 量化之城

手机竖屏优先的 H5 城市经营游戏，Node.js 22+（建议24）。不需要前端构建。

```sh
npm ci
npm start
```

在自己的浏览器打开终端显示的地址。默认绑定 `127.0.0.1:8080`，未配置密钥时完整本地模拟运行。先运行 `npm run pack`，纯离线即可打开生成的 `量化之城-离线版.html`；离线不能调用 DeepSeek 后端。

首次进入：短剧情 → 输入名字 → 首次抽卡 → 决策 → 领取材料 → 建造追光港 → 自由经营。已有本机存档自动续玩。资料、画像和课程放在手账或局末，不是城市主界面。

## 玩法

- 事件池：卡背飞入、3D旋转三圈并减速、翻牌、角色讨论和确认决策。
- 蓝图池：解锁趋势跟随、价值研究、低波动三个城区。
- 材料池：动量木材、低波钢材、价值玻璃、量能铜线；每区配置1–2种。
- 推进行情：确定性合成行情运行策略，净收益推动建设，损失影响稳定，换手收取维护费。无实盘或真钱。
- 角色大立绘和视觉小说对白、原创SVG海岛道路/建筑/云/船/车辆、建设动画、金币飞向HUD。
- 无可见好感/人格加减。画像依赖证据和用户修订，不以收益判断能力。

## DeepSeek（尚未真实接通）

复制 `.env.example` 为 `.env`。仅在自己授权预算后设置 `DEEPSEEK_API_KEY`、`ENABLE_PAID_AI=true`，再启动服务。浏览器设置 → 剧情AI设置 → 明确同意后开启；每次刷新默认回到本地模式。不要在前端或聊天输入密钥。

服务端使用官方 `https://api.deepseek.com/chat/completions`，模型变量 `DEEPSEEK_MODEL`，默认 `deepseek-flash`。2026-10-31核对官方文档：
- https://api-docs.deepseek.com/api/create-chat-completion/
- https://api-docs.deepseek.com/guides/json_mode/

事件AI只改叙事，不能写经济规则；支持角色对白、针对决策的课堂讲解、局末交易画像。JSON校验、10秒超时、会话限频、幂等缓存、取消和过期响应隔离；失败回退本地。画像必须引用已有证据ID和审核课程目录ID。

图像是独立接口，当前无图像供应商或密钥，只返回固定角色图占位及任务状态。没有收费调用。

## 验证与交接

```sh
npm test
npm run check
npm run pack
```

阅读 `CODEX_HANDOFF.md` 和 `TEST-REPORT.md`。自动化浏览器验收受环境策略限制，因此尚未验证真实画面或手机布局。仓库含四张原始人物PNG；单文件离线HTML可由 `npm run pack` 完整重建，不重复提交大体积生成文件。`dist/assets/ASSETS.md`记录对应关系。运行 `node tests/package.cjs` 可复验素材和脚本。游戏不会用emoji替代人物。
