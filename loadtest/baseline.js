import http from 'k6/http';
import { check, sleep } from 'k6';

// 只读基线：仅请求健康检查端点，不写任何业务数据
// 用法：BASE_URL=https://your-domain/api ../k6/k6.exe run baseline.js
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // 预热
    { duration: '60s', target: 50 },   // 爬坡
    { duration: '120s', target: 50 },  // 稳态
    { duration: '30s', target: 0 },    // 收尾
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% 请求在 500ms 内
    http_req_failed: ['rate<0.01'],    // 错误率低于 1%
  },
};

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:7239/api';

export default function () {
  const res = http.get(`${BASE}/actuator/health`);
  check(res, {
    '状态 200': (r) => r.status === 200,
  });
  sleep(1);
}
