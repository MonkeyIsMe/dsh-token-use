# dsh-token-use · DSH Token 用量面板

DSH（DeepSeek Harness）插件 **`@local/dsh-token-stats` v1.0.0**，在设置里新增一个「Token 用量」面板：
**按天 / 按小时**的用量图表，加上**全时段按模型**的总览。

数据全部来自**本机 DSH 的会话日志**，不联网、不上传、不依赖任何外部服务。

---

## 面板显示什么

| 区块 | 内容 |
|---|---|
| 今日 | 今天的输入 / 输出 / 缓存读写 / 合计 token、调用次数 |
| 近 7 天 | 每天一根柱（最近 7 天，本地时区），可点开看当天各模型的拆分 |
| 按小时 | 今天 0–23 点的分布；另有「一天中各小时的累计」（hourOfDayAll） |
| 全时段 | 从第一份日志到现在的总计，以及**按模型**的排行榜（allTimeByModel） |
| 状态行 | 已折叠会话数、待读队列、无法读取的日志数、扫描中/已完成、更新时间、时区 |

`allSince` 是第一份日志的时间戳，面板据此显示「统计起点」。

## 数据从哪来

- 源：`sessionQuery` 服务读到的**持久化会话日志**（`~/.dsh/sessions/**/session.v4.jsonl.zstd`，zstd 压缩的 JSONL）。
  插件不自己解压文件，而是通过 `sessionQuery` 读取，兼容 DSH 的日志演进。
- 折叠口径：每条记录里的 provider usage（input / output / cacheRead / cacheWrite / reasoning / calls）
  按**本地时区**归入「天」和「小时」两个桶；同时全量折叠一份**按模型**的账本。
- 热更新：`session/event` 事件进来时即时累加；未读过的会话进队列，做一次「精确读一次」的补录。
- 上限：单进程最多折叠 `MAX_SESSIONS = 5000` 份日志，每排一次语料清单至少间隔 `REFRESH_INTERVAL_MS = 15000` ms。

## 接口（跨端契约）

- 通道：`/dsh-token-usage`，端点 `summary`。
- 路由：`POST /api/dsh-token-usage/summary`（挂在 `ctx.connection.fetch.register` 上，
  所以自动继承 `/api` 的 Host/Origin 围栏与浏览器鉴权）。
- 响应：`{ ok: true, value: <summary> }`，失败为 `{ ok: false, error: { code, message } }`，HTTP 500。

**summary 的字段**（Client 端读的全部内容）：

```
days[]          近 7 天，每天：{ key: 'YYYY-MM-DD', dow, input, output, cache, total, calls, models[] }
allTimeDays[]   全时段每天的同样结构（升序）
hours[]         今天 0..23 点：{ hour, input, output, cache, total, calls, models[] }
hourOfDayAll[]  全时段各小时的累计（同为 24 项）
today / week / allTime        { input, output, cache, total, calls }
byModel[]                    近 7 天按模型拆分
allTimeByModel[]             全时段按模型拆分（按 total 降序）
allSince                     第一份日志的时间戳（本地 epoch ms），无则 null
start                        向量起点
sessions / queued / unreadable / problem / scanning / updatedAt / timeZone   状态信息
```

## 组件与加载方式

```
package.json        name=@local/dsh-token-stats，dsh.client = { platform: 'web', immediately: true,
                    inject: ['@deepseek-ai/dsh-client-ui-settings', '...-settings-plugins'] }
cordis.patch.yml    Loader 补丁：insert 一条 id=dsh-token-stats 的 bundle
host.js             入口 shim，静态导出 inject = ['sessionQuery','connection','webServer']；
                    用 `./impl.js?v=Date.now()` 动态 import —— 让"原地改代码"能在重新激活时生效
impl.js             Host 半边：读日志、折叠、聚合、注册 Fetch 路由（约 470 行）
client.js           Client 半边：设置页里的面板与图表（约 1370 行）
locale/{zh,en}.json 面板文案
icon.svg            侧栏图标
```

## 安装（本机当时的方式）

1. 把本仓库目录放在任意固定路径，例如 `C:\Users\<用户名>\dsh-token-stats`。
2. 用 DSH 的 **plugin_manager**（bundle 方式）`install_bundle`，target 填该目录的**绝对路径**。
   本机是 `link:` 方式装的，源码目录直接生效；也可以复制目录后再装。
3. 重载/重启 DSH 后，设置页出现「Token 用量」。
4. 想改代码：编辑 `impl.js` / `client.js` 后在插件管理里重新安装（激活一次即可，不必重启 GUI —— 见 host.js 的 `?v=` 说明）。

## 换机器（另一台电脑）要注意的点

见 [ADAPT.md](./ADAPT.md)。

## 已知边界

- 只统计**本机**日志；两台机器各自算各自的，本仓库不做数据同步。
- 不做系统通知、不导出 CSV —— 面板内查看。
- 费用（cost）字段当前恒为 0：DSH 日志里没有单价信息。
