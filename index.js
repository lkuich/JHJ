import express from 'express';

import { app, server, runServer } from './lib/jhj.js';

app.use(express.static('src/public'));

server.listen(3000, () => {
  console.log("Server started on port 3000");
  
  runServer();
});
