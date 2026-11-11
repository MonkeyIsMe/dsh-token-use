# 换机适配说明（给另一台电脑的 DSH）

目标：在另一台机器上装上同一个 Token 用量面板，**读到那台机器自己的会话日志**。
本插件不搬运数据，所以适配的核心只有「插件能被加载 + 四个注入点都在」。

## 一、前置检查（先查再装，顺序别反）

在被注入的 Host 里确认这几个服务名存在，插件 `inject` 用的就是它们：

| 注入点 | 用在哪 | 缺失时的症状 |
|---|---|---|
| `sessionQuery` | 读持久化会话日志（冷启动补录全量语料） | 面板永远空，`sessions = 0` |
| `connection` | `connection.fetch.register` 注册 `POST /api/dsh-token-usage/summary` | 面板报 transport failure / HTTP 404 |
| `webServer` | 供 `/api` 路由挂载 | 同上 |

`host.js` 已经在入口处**静态声明** `inject`（Loader 在 `apply` 之前就读它），
并在 `apply` 里校验 `impl.inject` 是它的子集，缺哪个会直接抛
`dsh-token-stats: entry inject must also declare <name>`。**看到这条错就是注入点对不上**，不要怀疑面板代码。

## 二、会话日志的位置与格式（数据源）

```
<DSH 数据目录>/sessions/<工作目录转义名>/<sessionId>/session.v4.jsonl.zstd
```

- 本机实测：`C:\Users\<用户名>\.dsh\sessions\**\session.v4.jsonl.zstd`，212 份。
- **zstd 压缩的 JSONL**：不要用 `cat` 看，会得到乱码；插件通过 `sessionQuery` 读，不用自己解压。
- 每条记录携带 provider usage，字段口径：`inputTokens / outputTokens / cacheReadTokens /
  cacheWriteTokens / reasoningTokens / calls`。
- 折叠按**本地时区**分桶（`dayKey` / `hourKey` 用 `new Date()` 的本地 getter），
  所以两台机器跨时区时「同一天」的口径不同 —— 这是设计如此，不是 bug。
- 若那台机器把会话存到别处（自定义数据目录），只要 `sessionQuery` 指向同一批日志即可，路径无需硬编码。

## 三、装法

1. 目录放任意固定路径（不必和这台机器一样）。
2. plugin_manager 用 **bundle** 方式 `install_bundle`，target = 该目录绝对路径。
3. 若装了旧版同名插件，先 `remove_bundle` 再装，避免两份 `insert` 抢同一个 id。
4. 装完**重载**。面板第一次打开会扫描全量日志（最多 5000 份），
   `scanning: true` / `queued > 0` 是正常的，等它跑完再看总数。

## 四、验收标准

- [ ] 设置页出现「Token 用量」，图标与文案正常（中英文都显示）。
- [ ] 「今日」总数 > 0（当天至少跑过一次对话）。
- [ ] 近 7 天柱状图有数据；点某天能看到该天各模型的拆分。
- [ ] 「全时段按模型」列表非空，且第一行的 total 是最大值（降序）。
- [ ] 状态行 `unreadable = 0`、`problem = null`、`scanning` 最终变 false。
- [ ] DevTools 里 `POST /api/dsh-token-usage/summary` 返回 200，body 形如 `{ok:true,value:{...}}`。

## 五、排障对照

| 现象 | 原因 | 处理 |
|---|---|---|
| 面板空白，无报错 | 路由没挂上（`connection`/`webServer` 注入失败） | 看 Host 日志有没有 `must also declare` / `cannot get property webServer` |
| HTTP 500 + `token-usage/failed` | 读日志抛错 | 看 `error.message` 里的原始异常 |
| `sessions = 0` 但有日志 | 日志版本不是 v4 | 确认那台机器的 `session.v4.jsonl.zstd` 存在 |
| 数字一直不涨 | 新的 `session/event` 没触发 | 确认 Host 是同一个进程；重载一次让 live 订阅重建 |
| 改了 `impl.js` 没生效 | Node 的 ESM 模块缓存 | 重新安装/重新激活（`host.js` 的 `?v=` 时间戳就是为这个加的） |

## 六、源码里已标注的两个"别踩"点（照抄即可）

1. `ctx.connection.rpc.handle` 在这个构建上**不可用**：它内部把 `owner.webServer` 交给一个
   任何 `inject` 都满足不了的 owner，实测 root / scoped 两种注册都抛
   "cannot get property webServer without inject"。所以本插件改用 `connection.fetch.register`
   精确注册一个 `/api` 路由 —— 这也是 `webServer` 仍留在 `inject` 里的原因。
2. `impl.js` 用带时间戳的动态 import，是为了绕开"Node 对已解析 URL 的 ESM 缓存"，
   否则原地修改的代码永远进不了正在运行的 Host。
