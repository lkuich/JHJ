const express = require('express');
const fs = require('fs');
const { parse } = require('node-html-parser');
const fetch = require('node-fetch');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");

const routes = require('./routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DEBUG = process.argv.slice(2)[0] === '--debug';

const readFile = (file) => {
  return fs.readFileSync(file, 'utf8');
};

const injectSocket = (body) => {
  // Inject transport layer
  const evalBody = `window.\${func} = function \${func}() {
    socket.emit('jsMethodCall', { method: '\${func}', args: Object.values(arguments) });
      return new Promise((resolve, reject) => {
        socket.on('\${func}Response', function({ response }) {
          resolve(response);
        });
      });
    };`;

  const socketIOClient = readFile('lib/socket.io.min.js');

  const socketIOBody = `
    <script>${socketIOClient}</script>
    <script>
      const socket = io();
      socket.on('jsjModules', function({ functions }) {
        functions.forEach(func => {
          eval(\`${evalBody}\`)
        });
      });

      ${DEBUG && `
        socket.on('jsjError', function({ response }) {
          console.error(response);
        });
      `}
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

const renderJsj = async (file) => {
  const rootPage = await readFile(`src/${file}`);
  const { codeBlocks, component } = await parseRoot(rootPage);

  return { page: component.toString(), codeBlocks };
}

const socketPickup = (socket, serverCode) => {
  try {
    const modules = eval(serverCode.join(''));

    // Send all modules to the client:
    if (modules)
      socket.emit('jsjModules', { functions: Object.keys(modules) });

    socket.on('jsMethodCall', async ({ method, args }) => {
      const response = await modules[method](...args);
      socket.emit(`${method}Response`, { response });
    });
  } catch (e) {
    if (DEBUG) {
      socket.emit('jsjError', { response: e.stack });
    }

    console.error(e.stack);
  }
}

const runServer = () => {
  let globalBlocks = [];

  for (const { route, file } of routes) {
    app.get(route, async (req, res) => {
      const { page, codeBlocks } = await renderJsj(file);

      globalBlocks = codeBlocks;

      res.send(page);
    });
  }

  io.on('connection', (socket) =>
    socketPickup(socket, globalBlocks)
  );
}

module.exports = {
  io,
  app,
  server,
  renderJsj,
  socketPickup,
  runServer
};