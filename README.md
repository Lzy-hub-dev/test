# test

压测工具与脚本仓库。存放 k6、Apache JMeter 两套压测工具的分发包，以及配套的压测脚本。

## 目录结构

```
test/
├── k6/
│   └── k6.exe                  # k6 v1.8.3 (windows/amd64) 单文件可执行
├── apache-jmeter-5.6.3/        # Apache JMeter 5.6.3 完整分发包
│   ├── bin/                    # jmeter.bat / jmeter.sh / ApacheJMeter.jar
│   ├── lib/                    # 依赖 jar
│   └── ...
└── loadtest/
    └── baseline.js             # k6 只读基线脚本（健康检查）
```

## 工具选型

| 维度 | k6 | JMeter |
|---|---|---|
| 脚本形式 | JavaScript，可纳入版本管理 | XML + GUI |
| WebSocket | 原生支持（`k6/ws`） | 需插件 |
| 资源占用 | 单机数千并发 | 同并发下内存占用更高 |
| 结果输出 | 终端实时 + JSON/Prometheus | 需生成 HTML 报告 |
| 图形界面 | 无 | 有 |

游戏类平台（实时余额、牌局、赔率推送）优先 k6；需要图形界面给非技术同事看、或压 JDBC/消息队列时用 JMeter。

## k6 快速上手

确认可执行：

```bash
cd test
./k6/k6.exe version
```

跑只读基线：

```bash
cd loadtest
../k6/k6.exe run baseline.js
```

指定目标地址（默认是本地 7239 健康检查）：

```bash
BASE_URL=https://your-domain/api ../k6/k6.exe run baseline.js
```

### 结果判读

| 指标 | 含义 | 参考值 |
|---|---|---|
| `http_req_duration p(95)` | 95% 请求响应时间 | < 500ms |
| `http_reqs` | 每秒请求数（RPS） | 结合延迟一起看 |
| `http_req_failed` | 失败率 | < 1% |
| `vus_max` | 峰值并发 | 记录拐点 |

**找拐点**：并发从 50 → 100 → 200 → 500 递增，当 RPS 不再上升而延迟飙升，该点即容量上限。若延迟线性上升但 RPS 不变，通常是数据库连接池打满。

## JMeter 使用

```bash
cd apache-jmeter-5.6.3/bin
./jmeter.bat        # Windows
./jmeter.sh         # Linux / macOS
```

非 GUI 模式（推荐用于正式压测）：

```bash
./jmeter.sh -n -t plan.jmx -l result.jtl -e -o report/
```

## 压测注意事项

1. **写接口不要压生产**：下注、抽奖、充值、提现会产生真实资金流水，污染账本且事后对账困难。优先压只读接口拿容量基线。
2. **WebSocket 单独压**：HTTP 压测通过不代表 WS 撑得住，连接数上限通常先在 WS 上暴露。
3. **注意限流干扰**：若前置 Nginx 或 WAF 有限流，压测会提前触发 429，看起来像"应用扛不住"，实际是网关挡的。
4. **区分直连与走网关**：直连 `IP:端口` 只测应用层；走域名包含 Nginx 转发、TLS 握手、限流，两者都要测。
5. **账号池**：需要登录态的压测建议准备专用测试账号（50–100 个），避免单账号触发风控。

## 版本

| 工具 | 版本 |
|---|---|
| k6 | v1.8.3 |
| Apache JMeter | 5.6.3 |

## 许可

- k6：AGPL-3.0，见 https://github.com/grafana/k6
- Apache JMeter：Apache License 2.0，见 `apache-jmeter-5.6.3/LICENSE`
