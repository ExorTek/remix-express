# @exortek/remix-express

Express server request handler for Remix

## Installation

```bash
npm install @exortek/remix-express
```

OR

```bash
yarn add @exortek/remix-express
```

## Usage

### createRemixExpressApp

CommonJS

```javascript
const express = require('express');
const {createRemixExpressApp} = require('@exortek/remix-express');

(async () => {
    const remixApp = await createRemixExpressApp({
        express,
        buildOptions: {
            buildDirectory: 'build',
            clientDirectory: 'client',
            serverDirectory: 'server',
            serverBuildFile: 'index.js',
        },
        mode: process.env.NODE_ENV,
        expressStaticOptions: {
            // Options for express.static
        },
        viteOptions: {
            // Options for Vite dev server
        },
    });

    app.listen(3000, () => {
        console.log('Server started on http://localhost:3000');
    });
})();
```

ESM

```javascript
import express from 'express';
import { createRemixExpressApp } from '@exortek/remix-express';

const app = await createRemixExpressApp({
    express,
    buildOptions: {
        buildDirectory: 'build',
        clientDirectory: 'client',
        serverDirectory: 'server',
        serverBuildFile: 'index.js',
    },
    mode: process.env.NODE_ENV,
    expressStaticOptions: {
        // Options for express.static
    },
    viteOptions: {
        // Options for Vite dev server
    },
});

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
```

### remixExpress

CommonJS

```javascript
const express = require('express');
const { remixExpress } = require('@exortek/remix-express');

const app = express();

app.use(express.static('build/client'));

app.use(remixExpress({
    build: () => import('./build/server/index.js'),
    mode: process.env.NODE_ENV,
    getLoadContext: (req,res) => {
        return {
            // Load context
        };
    },
}));

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
```

ESM

```javascript
import express from 'express';
import { remixExpress } from '@exortek/remix-express';

const app = express();

app.use(express.static('build/client'));

app.use(remixExpress({
    build: () => import('./build/server/index.js'),
    mode: process.env.NODE_ENV,
    getLoadContext: (req,res) => {
        return {
            // Load context
        };
    },
}));

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
```

## License
**[MIT](https://github.com/ExorTek/remix-express/blob/master/LICENSE)**<br>
