import http from 'k6/http';
import { check, sleep } from 'k6';

// 静态前端基线：只打首页，测 nginx / TLS 握手 / 带宽
// 零业务副作用，可随时对生产跑
// 用法：STATIC_BASE=https://你的域名 ../k6/k6.exe run static-baseline.js
// 并发上限可用 MAX_VUS 覆盖，方便做阶梯加压：
//   MAX_VUS=5  ../k6/k6.exe run static-baseline.js
//   MAX_VUS=50 ../k6/k6.exe run static-baseline.js
const MAX_VUS = Number(__ENV.MAX_VUS || 20);

export const options = {
  insecureSkipTLSVerify: true,
  stages: [
    { duration: '20s', target: Math.max(1, Math.round(MAX_VUS * 0.25)) }, // 预热
    { duration: '40s', target: MAX_VUS }, // 爬坡
    { duration: '60s', target: MAX_VUS }, // 稳态：这段数据才是基线
    { duration: '20s', target: 0 }, // 收尾
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% 在 800ms 内
    http_req_failed: ['rate<0.01'], // 失败率 < 1%
  },
};

const BASE = __ENV.STATIC_BASE || 'https://109.123.233.208';

const PARAMS = {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    // 服务端 gzip 已开：19KB -> 6.2KB。不带这个头会白拉 3 倍流量，
    // 把"带宽"误判成瓶颈
    'Accept-Encoding': 'gzip, deflate',
  },
  timeout: '15s',
};

export default function () {
  const res = http.get(`${BASE}/`, PARAMS);
  check(res, {
    '状态 200': (r) => r.status === 200,
    '内容完整': (r) => typeof r.body === 'string' && r.body.length > 5000,
  });
  sleep(1);
}
