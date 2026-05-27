'use strict';

const { URLSearchParams } = require('url');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text }),
    signal: AbortSignal.timeout(5000),
  });
}

async function getQuery(req) {
  // Vercel may pre-parse the body into req.body
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return String(req.body.q || '').trim();
    }
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
    return (new URLSearchParams(raw).get('q') || '').trim();
  }
  // Otherwise read the stream directly
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return (new URLSearchParams(raw).get('q') || '').trim();
}

module.exports = async (req, res) => {
  console.log('BOT_TOKEN:', BOT_TOKEN ? BOT_TOKEN.slice(0, 10) + '...' : 'MISSING');
  console.log('CHAT_ID:', CHAT_ID || 'MISSING');

  let query = '';
  try {
    query = await getQuery(req);
    console.log('query:', query);
  } catch (err) {
    console.error('getQuery error:', err.message);
  }

  if (query) {
    try {
      await sendTelegram(query);
      console.log('Telegram: sent');
    } catch (err) {
      console.error('Telegram error:', err.message);
    }
  }

  const googleUrl = 'https://www.google.com/search?' + new URLSearchParams({ q: query });
  res.writeHead(302, { Location: googleUrl });
  res.end();
};
