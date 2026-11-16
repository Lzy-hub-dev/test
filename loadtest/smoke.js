import http from 'k6/http';
import { check, group } from 'k6';

// 冒烟测试：每个目标各打几次，只验证"脚本对不对、目标通不通"
// 不产生压力，可以在生产环境放心跑
// 用法：../k6/k6.exe run smoke.js
export const options = {
  vus: 1,
  iterations: 5,
  insecureSkipTLSVerify: true, // 直连 IP 时证书域名不匹配，需要跳过校验
  thresholds: {
    checks: ['rate>0.99'], // 所有断言通过率必须 99% 以上
  },
};

const STATIC = __ENV.STATIC_BASE || 'https://109.123.233.208';
const ADMIN = __ENV.ADMIN_BASE || 'https://admin.pai.casino';

const PARAMS = {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: 'text/html,application/json,*/*',
    'Accept-Encoding': 'gzip, deflate',
  },
  timeout: '10s',
};

export default function () {
  group('静态前端（nginx + TLS）', () => {
    const res = http.get(`${STATIC}/`, PARAMS);
    check(res, {
      '首页 200': (r) => r.status === 200,
      '返回 HTML': (r) => typeof r.body === 'string' && r.body.includes('<!DOCTYPE html'),
      '有 SPA 挂载点': (r) => typeof r.body === 'string' && r.body.includes('id=app'),
    });
  });

  group('后台后端（Spring Boot）', () => {
    // 根路径：匿名可达，返回框架横幅或跳转提示
    const root = http.get(`${ADMIN}/prod-api/`, PARAMS);
    check(root, {
      '后端根 200': (r) => r.status === 200,
      '有响应体': (r) => r.body && r.body.length > 0,
    });

    // 验证码接口：唯一的匿名"有实际计算"的读接口
    // 注意：会在 Redis 写一个 2 分钟过期的验证码键，无业务数据副作用
    const cap = http.get(`${ADMIN}/prod-api/captchaImage`, PARAMS);
    check(cap, {
      '验证码 200': (r) => r.status === 200,
      '返回图片字段': (r) => typeof r.body === 'string' && r.body.includes('img'),
    });
  });
}
