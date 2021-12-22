const express = require('express');

const { app, server, renderJsj } = require('./jhj');
const routes = require('./routes');

app.use(express.static('src/public'));

for (const { route, file } of routes) {
  app.get(route, async (req, res) => {
    const page = await renderJsj(file);
    res.send(page);
  });
}

server.listen(3000, () => {
  console.log("Server started on port 3000");
});
