import http from 'k6/http';
import { check, sleep } from 'k6';

// 后台后端只读压测：打 RuoYi 的匿名 GET 接口
//
// 默认只打根路径（无任何副作用）。
// 加 CAPTCHA=1 会同时打 /prod-api/captchaImage —— 这是唯一"有实际计算量"的匿名接口
// （JVM + Redis + 图片渲染），会在 Redis 写一个 2 分钟过期的验证码键，不涉及业务数据。
//
// 用法：
//   ADMIN_BASE=https://admin.pai.casino ../k6/k6.exe run admin-readonly.js
//   ADMIN_BASE=https://admin.pai.casino CAPTCHA=1 ../k6/k6.exe run admin-readonly.js
export const options = {
  insecureSkipTLSVerify: true,
  stages: [
    { duration: '20s', target: 5 },
    { duration: '40s', target: 15 },
    { duration: '60s', target: 15 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE = __ENV.ADMIN_BASE || 'https://admin.pai.casino';
const WITH_CAPTCHA = __ENV.CAPTCHA === '1';

const PARAMS = {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: 'application/json,text/html,*/*',
    'Accept-Encoding': 'gzip, deflate',
  },
  timeout: '15s',
};

export default function () {
  // 轻量请求：验证路由与线程池是否正常
  const root = http.get(`${BASE}/prod-api/`, PARAMS);
  check(root, {
    '后端根 200': (r) => r.status === 200,
  });

  // 重量请求：真正的计算路径（默认关闭）
  if (WITH_CAPTCHA) {
    const cap = http.get(`${BASE}/prod-api/captchaImage`, PARAMS);
    check(cap, {
      '验证码 200': (r) => r.status === 200,
      '返回图片字段': (r) => typeof r.body === 'string' && r.body.includes('img'),
    });
  }

  sleep(1);
}
