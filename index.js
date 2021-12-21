const fs = require('fs').promises;
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const { parse } = require('node-html-parser');

console.log("Starting server...");

const indexFile = 'index.jhj';

const readJsj = (file) => {
  return fs.readFile(file, 'utf8');
};

const args = process.argv.slice(2);
const dir = args.length > 0 ? args[0] : '.';

const parseServerSideJs = (html) => {
  const root = parse(html);
  const script = root.querySelector('script[serverside]');

  const code = script.childNodes[0].rawText.trim();

  // Remove server-side code from client
  script.remove();

  // TODO: Add socket compatibility
  // root.querySelector('body').appendChild('script', '<script>')

  return { code, html: root.toString() };
};

let globalCode;

app.get('/', async (req, res) => {
  const jsj = await readJsj(`${dir}/${indexFile}`);
  const { html, code } = parseServerSideJs(jsj);

  globalCode = code;

  res.send(html);
});

io.on('connection', (socket) => {
  console.log('a user connected');

  const modules = eval(globalCode);

  // Send all modules to the client:
  socket.emit('modules', { functions: Object.keys(modules) });

  socket.on('jsMethodCall', ({ method, args }) => {
    modules[method](...args);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(3000, () => {
  console.log("Server started on port 3000");
});
