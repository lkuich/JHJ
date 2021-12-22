const fs = require('fs');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const { parse } = require('node-html-parser');
const fetch = require('node-fetch');
const path = require('path');

const findIndexRoutes = () => {
  return fs.readdirSync('src').filter(f => !f.startsWith('_') && f.endsWith('.html')).map(file => {
    const route = `/${file.replace('.html', '')}`;

    if (route === '/index') return { route: '/', file };
    else
      return { route, file };
  });
};

const readFile = (file) => {
  return fs.readFileSync(file, 'utf8');
};

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
    let src = block.getAttribute('data-src');
    if (!src.endsWith('.html')) src += '.html';

    const document = readFile(`src/${subTree.join('/')}/${src}`);
    const parsedDoc = parse(document);

    // Track where we are in the filetree
    const dirname = path.dirname(src);
    if (dirname !== '.')
      subTree.push(dirname);
    
    // Extract the server-side code
    codeBlocks.push(...(await parseServerSideJs(parsedDoc, subTree)));

    // Inject the contents of the block into the parent
    block.appendChild(parsedDoc);

    // Remove the src attribute
    block.removeAttribute('data-src');
  }

  const moreBlocks = body.querySelectorAll('div[data-src]').length > 0;
  if (moreBlocks) {
    return parseTemplate(component, body, codeBlocks, subTree);
  }

  return { component, codeBlocks, subTree };
}

const parseServerSideJs = async (block, subTree = []) => {
  const scripts = block.querySelectorAll('script[backend]');

  const codeBlocks = await Promise.all(scripts.map(async s => {
    let src = s.getAttribute('src');
    if (!src.endsWith('.js')) src += '.js';

    let code;
    if (src) {
      if (src.startsWith('http')) {
        const response = await fetch(src);
        code = await response.text();
      }
      else
        code = readFile(`src/${subTree.join('/')}/${src}`).trim();
    } else {
      code = s.childNodes[0].rawText.trim()
    }
 
    // Remove server-side code from client
    s.remove();

    return code;
  }));

  return codeBlocks;
};

app.use(express.static('src/public'));

let globalCode = [];

for (const { route, file } of findIndexRoutes()) {
  app.get(route, async (req, res) => {
    const rootPage = await readFile(`src/${file}`);
    const { component, codeBlocks } = await parseRoot(rootPage);
  
    globalCode = codeBlocks;
  
    res.send(component.toString());
  });
}

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
