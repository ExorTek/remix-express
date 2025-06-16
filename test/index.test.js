// const express = require('express');
// const { remixExpress } = require('../');
//
// (async () => {
//   const app = express();
//
//   app.use(
//     remixExpress({
//       build: () => import('../test/build/server/index.js'),
//       mode: 'production',
//     })
//   );
//
//   app.listen(3000, () => {
//     console.log('Server is running on http://localhost:3000');
//   });
// })();

import express from 'express';
import { remixExpress } from '../index.js';

const app = express();

app.use(express.static('test/test-app/build/client', {}));

app.use(
  remixExpress({
    build: () => import('../test/test-app/build/server/index.js'),
    mode: 'production',
  })
);

app.listen(3001, () => {
  console.log('Server is running on http://localhost:3000');
});

await new Promise((resolve) => setTimeout(resolve, 1000));

process.on('SIGTERM', () => {
  app.close(() => {});
});
