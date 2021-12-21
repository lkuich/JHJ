const fs = require('fs').promises;
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const { parse } = require('node-html-parser');

console.log("Starting server...");

const indexFile = 'index.html';

const readJsj = (file) => {
  return fs.readFile(file, 'utf8');
};

const args = process.argv.slice(2);
const dir = args.length > 0 ? args[0] : '.';

const parseServerSideJs = (html) => {
  const root = parse(html);
  const script = root.querySelector('script[serverside]');

  if (script.childNodes.length === 0) return { code: '', html: root.toString() };

  const code = script.childNodes[0].rawText.trim();

  // Remove server-side code from client
  script.remove();

  // Inject transport layer
  const evalBody = "window.${func} = function ${func}() {\n" +
    "socket.emit('jsMethodCall', { method: '${func}', args: Object.values(arguments) });\n" +
      "return new Promise((resolve, reject) => {\n" +
        "socket.on('${func}Response', function({ response }) {\n" +
          "resolve(response);\n" +
        "});\n" +
      "});\n" +
    "};";

  const socketIOBody = `
    <script src="/socket.io/socket.io.js"></script>
    <script>
      const socket = io();
      socket.on('modules', function({ functions }) {
        functions.forEach(func => {
          eval(\`${evalBody}\`)
        });
      });
    </script>
  `;

  root.querySelector('body').appendChild(parse(socketIOBody))

  return { code, html: root.toString() };
};

let globalCode;

app.use(express.static('public'));

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
  if (modules)
    socket.emit('modules', { functions: Object.keys(modules) });

  socket.on('jsMethodCall', async ({ method, args }) => {
    const response = await modules[method](...args);
    socket.emit(`${method}Response`, { response });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(3000, () => {
  console.log("Server started on port 3000");
});
