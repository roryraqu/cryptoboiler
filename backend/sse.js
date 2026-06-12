let clients = [];

function subscribe(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-store, no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.push(res);

  // Очистка при отключении клиента
  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
}

function broadcast(event, data) {
  clients.forEach(client => {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  });
}

module.exports = { subscribe, broadcast };