const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3000;
// 替换为你的Gitee私人令牌
const GITEE_TOKEN = '63f2130f328339f9b8e2ae55e5945fef'; 
const TARGET_HOST = 'gitee.com';

http.createServer((req, res) => {
  // 处理CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    return res.end();
  }

  // 构建目标URL
  const parsedUrl = url.parse(req.url, true);
  const targetPath = parsedUrl.path.replace(/^\/proxy/, '') || '/';
  
  // 发送代理请求（自动携带Token）
  const proxyReq = https.request({
    hostname: TARGET_HOST,
    path: targetPath,
    method: req.method,
    headers: {
      // 关键：添加Token认证
      'Authorization': `token ${GITEE_TOKEN}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      ...req.headers,
      host: TARGET_HOST
    }
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('代理错误：', err);
    res.writeHead(500);
    res.end('请求失败');
  });

  req.pipe(proxyReq);

}).listen(PORT, () => {
  console.log(`带Token的代理服务器启动：http://localhost:${PORT}`);
});
    