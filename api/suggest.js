'use strict';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const q = (req.query && req.query.q) || '';
  if (!q.trim()) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('[]');
    return;
  }

  try {
    const url = 'https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=' +
      encodeURIComponent(q);
    const upstream = await fetch(url);
    const data = await upstream.json();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data[1] || []));
  } catch (_) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('[]');
  }
};
