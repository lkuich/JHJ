const express = require('express');

const { app, server, runServer } = require('./lib/jhj');

app.use(express.static('src/public'));

server.listen(3000, () => {
  console.log("Server started on port 3000");
  
  runServer();
});
