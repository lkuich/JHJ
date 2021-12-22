const fs = require('fs').promises;
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const { parse } = require('node-html-parser');
const fetch = require('node-fetch');

const indexFile = 'src/index.html';

const readFile = (file) => {
  return fs.readFile(file, 'utf8');
};

const args = process.argv.slice(2);
const dir = args.length > 0 ? args[0] : '.';

const parseHtmlTemplates = async (html) => {
  const root = parse(html);
  const body = root.querySelector('body');
  const childBlocks = root.querySelectorAll('div[data-src]');
  
  for (const childBlock of childBlocks) {
    const block = await readFile(`src/${childBlock.getAttribute('data-src')}`);
    body.appendChild(parse(block));
    childBlock.removeAttribute('data-src');
  }

  const moreBlocks = root.querySelectorAll('div[data-src]').length > 0;
  if (moreBlocks) return parseHtmlTemplates(root.toString());

  return root.toString();
}

const parseServerSideJs = async (html) => {
  const root = parse(html);
  const scripts = root.querySelectorAll('script[backend]');

  const codeBlocks = await Promise.all(scripts.map(async s => {
    const src = s.getAttribute('src');

    let code;
    if (src) {
      if (src.startsWith('http')) {
        const response = await fetch(src);
        code = await response.text();
      }
      else
        code = (await readFile(`src/${src}`)).trim();
    } else {
      code = s.childNodes[0].rawText.trim()
    }
 
    // Remove server-side code from client
    s.remove();

    return code;
  }));

  if (codeBlocks.length === 0) return { code: '', html: root.toString() };

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

  return { codeBlocks, html: root.toString() };
};

let globalCode = [];

app.use(express.static('src/public'));

app.get('/', async (req, res) => {
  const rootPage = await readFile(`${dir}/${indexFile}`);
  const page = await parseHtmlTemplates(rootPage);
  const { html, codeBlocks } = await parseServerSideJs(page);

  globalCode = codeBlocks;

  res.send(html);
});

io.on('connection', (socket) => {
  const modules = eval(globalCode.join(''));

  // Send all modules to the client:
  if (modules)
    socket.emit('modules', { functions: Object.keys(modules) });

  socket.on('jsMethodCall', async ({ method, args }) => {
    const response = await modules[method](...args);
    socket.emit(`${method}Response`, { response });
  });

  socket.on('disconnect', () => {
    // Any cleanup needed
  });
});

server.listen(3000, () => {
  console.log("Server started on port 3000");
});
