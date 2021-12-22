const express = require('express');

const {
  io,
  socketPickup,
  app,
  server,
  renderJsj
} = require('./lib/jhj');

const routes = require('./routes');

app.use(express.static('src/public'));

server.listen(3000, () => {
  console.log("Server started on port 3000");
  
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
});
