const fs = require('fs').promises;
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const { parse } = require('node-html-parser');
const fetch = require('node-fetch');
const path = require('path');

const indexFile = 'src/index.html';

const readFile = (file) => {
  return fs.readFile(file, 'utf8');
};

const args = process.argv.slice(2);
const dir = args.length > 0 ? args[0] : '.';

const injectSocket = (body) => {
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

  body.appendChild(parse(socketIOBody))
};

const parseRoot = async (index) => {
  const root = parse(index);
  const body = root.querySelector('body');

  const { component, codeBlocks } = await parseTemplate(root, body);

  injectSocket(body);

  return { component, codeBlocks };
};

const parseTemplate = async (component, body, codeBlocks = [], subTree = []) => {
  const childBlocks = component.querySelectorAll('div[data-src]');

  for (block of childBlocks) {
    // Pull out the contents of the block
    const src = block.getAttribute('data-src');
    const document = await readFile(`src/${subTree.join('/')}/${src}`);
    const parsedDoc = parse(document);

    // Extract the server-side code
    codeBlocks.push(await parseServerSideJs(parsedDoc));

    // Inject the contents of the block into the parent
    block.appendChild(parsedDoc);

    // Track where we are in the filetree
    const dirname = path.dirname(src);
    if (dirname !== '.')
      subTree.push(dirname);

    // Remove the src attribute
    block.removeAttribute('data-src');
  }

  const moreBlocks = body.querySelectorAll('div[data-src]').length > 0;
  if (moreBlocks) {
    return parseTemplate(component, body, codeBlocks, subTree);
  }

  return { component, codeBlocks, subTree };
}

const parseServerSideJs = async (block) => {
  const scripts = block.querySelectorAll('script[backend]');

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

  return codeBlocks.join('\n');
};


app.use(express.static('src/public'));

let globalCode = [];
app.get('/', async (req, res) => {
  const rootPage = await readFile(`${dir}/${indexFile}`);

  const { component, codeBlocks } = await parseRoot(rootPage);

  globalCode = codeBlocks;

  res.send(component.toString());
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
