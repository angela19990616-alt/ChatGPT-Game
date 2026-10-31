# 量化之城 · Codex 接手说明

## 当前版本和目标

v0.3.0。已从网页仪表盘重构为全屏H5游戏：原创等距海岛、简洁金币/日期HUD、底部图标栏、大立绘视觉小说对白、手游式教程与3D抽卡演出。保留确定性规则与证据画像。

## 文件结构

- `dist/index.html`, `style.css`, `app.js`：舞台、教程状态机、弹层、存档、游戏流程。
- `dist/city-art.js`：原创SVG场景与图标；无第三方网络资产。
- `dist/engine.js`：事件、随机种子、整数账本、幂等与行为证据。
- `dist/city.js`：城市材料、策略配置、合成行情、建设/稳定与周期账本。
- `dist/analyst.js`：本地模拟画像和目录校验。
- `dist/ai-client.js`：同源API请求、主动启用、AbortController与乱序隔离。
- `server/api.mjs`：DeepSeek、JSON校验、受控事件叙事、动态课堂、证据画像、独立图像占位任务。
- `server/server.mjs`：零运行依赖Node静态+API服务。
- `server/worker.mjs`：可移植Worker源码；尚未通过Sites官方构建/部署。
- `tests/`：规则、API mock、完整DOM手游流程、20组乱序响应测试。

## 运行和配置

1. Node22+；执行 `npm ci`、`npm start`。默认仅监听本机。
2. 无配置时完全Mock可玩。`.env.example`只有变量名和非敏感示例；绝不提交`.env`。
3. 配置真实Key后，还要显式设置`ENABLE_PAID_AI=true`。浏览器内必须再同意匿名游戏数据发送，才调用服务端。
4. 外网监听必须设`APP_PASSWORD`；`APP_USER`默认player。服务使用浏览器HTTP Basic认证，生产必须由HTTPS反代终结。Worker live配置也要求APP_PASSWORD与SESSION_SECRET。不得把后端密钥发到浏览器。
5. `SESSION_SECRET`应为长随机值，仅由部署环境注入。Node本地缺省会随机生成，重启后会话失效。
6. 本仓库只提供源码，不含线上部署身份；公开部署前自行验证访问控制、HTTPS和预算限制。

## 真实AI范围

官方endpoint与JSON模式已核对，默认模型deepseek-flash，可通过变量覆盖。API支持`/api/event`、`/api/dialogue`、`/api/lesson`、`/api/profile`；`/api/status`签发HttpOnly同站会话与CSRF令牌。POST要求同源Origin、签名会话、CSRF、自愿发送标识和幂等键。匿名化去除昵称/账户等，仅发送当前合成事实、选择理由、概念和最多60条证据。

每会话每分钟12次、正文24KB、回复长度限制、10秒超时。进程内缓存最多500项，并发相同请求复用Promise，幂等键冲突拒绝。当前限频/缓存是单实例内存，不是跨Worker全局预算控制，生产需要Durable Object/共享限频器和账户总预算。

模型事件输出只有标题/剧情，经济规则不接受模型修改；模型画像校验证据ID、目录ID和未校准low/medium证据等级。前端对模型文本转义。模型失败、空JSON、非法schema或取消时保留本地内容。

当前没有真实DeepSeek Key、没有费用授权或真实调用验证。单测的Key是无效测试占位，fetch被stub，不访问官方服务。图像API只演示queued/generating/ready/cancelled；需要另选图像provider、授权与任务队列，不能声称文本模型能直接产图。

## 教程和存档

继续兼容既有localStorage键`panda-neon-v1`与schema1；该内部兼容键不是展示品牌。缺少tutorial字段的老存档视为完成教程，不强迫重来。

新玩家：开场对白（可跳过）→名字（必填）→`draw`→`decision`→`reward`→`build`→`finish`→`done`。每个已创建存档的教程阶段可刷新恢复。只有完成教程才开放底部自由经营操作。

抽卡时先锁定事件，动画仅演出。卡背飞入+1080度旋转减速+reveal；点击可跳过，prefers-reduced-motion直接揭示。取消/返回后保留同一事件，不能刷新重抽。蓝图/材料先入库再演出，关闭不会丢失，也不能重复领取。角色入场、建筑成长、金币飞入HUD均有CSS动画，减少动效模式关闭。

金币与事件/城市账本分开记录但共享余额；导出同时包含两份。静态存档可被玩家修改，不能用于真实资产或防作弊经济系统。

## 角色素材已补齐

最终组装时已补入四张授权原始PNG，并查看真实像素；均为1024×1536 RGBA。`dist/assets/ASSETS.md`列出角色文件。`npm run pack`已重新生成完整单文件离线版，四张PNG逐字节内嵌；缺图会直接报错，不会静默交付不完整工程。`node tests/package.cjs`验证素材和脚本一致性。

## 浏览器限制

自动化浏览器验收受执行环境策略限制，未完成。只做Node/jsdom测试；未验证390px/1440px实渲染、触摸、遮挡或动画观感。必须在获许可的正常用户浏览器补视觉QA。

## 部署说明

`server/worker.mjs`是可移植Worker源码，不是已部署制品。部署时需要正确绑定静态资源、配置服务端环境变量，并验证认证、限频和HTTPS。本仓库不含平台站点身份或私有配置。

## 接手优先顺序

1. 素材和完整离线包已齐；先运行 npm ci、npm test、npm run check、node tests/package.cjs 复验。
2. 在获准浏览器检查390px与桌面全教程、场景构图、对白/卡牌不遮挡。
3. 用户自行在安全环境注入DeepSeek密钥和预算，做小额真实集成测试；目前不要说已连通。
4. 完成同源Worker适配、持久限频和访问控制验证，再安排部署。
5. 独立配置图像provider及审批/预算后再开真实异步产图。
