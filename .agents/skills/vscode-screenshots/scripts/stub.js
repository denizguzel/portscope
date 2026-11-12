// Fake dev server for screenshots. STUB_PORT=<port> STUB_MODE=ok|error|silent node vite.js
const http = require('node:http');
const net = require('node:net');

const port = Number(process.env.STUB_PORT);
const mode = process.env.STUB_MODE || 'ok';

if (mode === 'silent') {
  // Accepts connections and never answers: PortScope shows it as "not answering".
  net.createServer(() => {}).listen(port, '127.0.0.1');
} else {
  http
    .createServer((_request, response) => {
      response.writeHead(mode === 'error' ? 500 : 200, { 'content-type': 'text/plain' });
      response.end('demo');
    })
    .listen(port);
}
