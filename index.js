'use strict';

const {
  createReadableStreamFromReadable,
  writeReadableStreamToWritable,
  createRequestHandler: createRemixRequestHandler,
} = require('@remix-run/node');
const path = require('node:path');
const url = require('node:url');

/**
 * Middleware function for integrating Remix with Express.
 *
 * @param {Object} options - Configuration options for Remix integration.
 * @param {Object} options.build - Remix build instance.
 * @param {Function} [options.getLoadContext] - Function to generate the load context.
 * @param {string} options.mode - Application mode (e.g., development or production).
 * @returns {Function} Express middleware function.
 */
const remixExpress =
  ({ build, getLoadContext, mode = process.env.NODE_ENV || 'development' }) =>
  async (req, res, next) => {
    try {
      const remixRequestHandler = createRemixRequestHandler(build, mode);

      const request = createRemixRequest(req, res);
      const loadContext = getLoadContext ? getLoadContext(req, res) : {};

      const response = await remixRequestHandler(request, loadContext);
      await sendRemixResponse(res, response);
    } catch (error) {
      next(error);
    }
  };

/**
 * Sends a Remix response using the given Express response object.
 *
 * @param {Object} res - Express response object.
 * @param {Object} nodeResponse - Remix response object.
 * @returns {Promise<void>}
 */
async function sendRemixResponse(res, nodeResponse) {
  const { status, statusText, headers, body } = nodeResponse;

  res.statusMessage = statusText;
  res.status(status);

  res.set(Object.fromEntries(headers));

  const contentType = headers.get('Content-Type');
  if (contentType?.toLowerCase().includes('text/event-stream')) {
    res.flushHeaders();
  }

  if (body) {
    await writeReadableStreamToWritable(body, res);
  } else {
    res.end();
  }
}

/**
 * Converts incoming request headers to a Remix Headers object.
 *
 * @param {Object} requestHeaders - Incoming request headers.
 * @returns {Headers} Headers object for Remix.
 */
function createRemixHeaders(requestHeaders) {
  return new Headers(
    Object.entries(requestHeaders).flatMap(([key, values]) =>
      values ? (Array.isArray(values) ? values.map((value) => [key, value]) : [[key, values]]) : []
    )
  );
}

/**
 * Extracts the port number from the host header.
 *
 * @param {string} header - Host header value.
 * @returns {string|undefined} Port number if available.
 */
const getPort = (header) => header?.split(':')?.[1];

/**
 * Creates a Remix Request object from an Express request.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Request} Remix Request object.
 */
function createRemixRequest(req, res) {
  const port = getPort(req.get('X-Forwarded-Host')) || getPort(req.get('host'));
  const host = `${req.hostname}${port ? `:${port}` : ''}`;
  const url = new URL(`${req.protocol}://${host}${req.originalUrl}`);
  const controller = new AbortController();
  res.on('close', () => controller.abort());

  const init = {
    method: req.method,
    headers: createRemixHeaders(req.headers),
    signal: controller.signal,
  };

  if (!['GET', 'HEAD'].includes(req.method)) {
    init.body = createReadableStreamFromReadable(req);
    init.duplex = 'half';
  }
  return new Request(url.href, init);
}

/**
 * Create a new express app with Remix SSR support.
 *
 * @param {Object} config - Configuration object for the app.
 * @param {Function} [config.express=require('express')] - Express instance.
 * @param {Object} [config.buildOptions] - Remix build options.
 * @param {string} [config.buildOptions.buildDirectory='build'] - Build directory.
 * @param {string} [config.buildOptions.clientDirectory='public'] - Client directory.
 * @param {string} [config.buildOptions.serverDirectory='server'] - Server directory.
 * @param {string} [config.buildOptions.serverBuildFile='index.js'] - Server build file.
 * @param {string} [config.mode=process.env.NODE_ENV] - Node environment mode.
 * @param {Object} [config.expressStaticOptions={}] - Express static options.
 * @param {Object} [config.viteOptions={}] - Vite options.
 * @returns {Promise<Function>} Express app.
 */
const createRemixExpressApp = async ({
  express = require('express'),
  buildOptions = {
    buildDirectory: 'build',
    clientDirectory: 'client',
    serverDirectory: 'server',
    serverBuildFile: 'index.js',
  },
  mode = process.env.NODE_ENV || 'development',
  expressStaticOptions = {},
  viteOptions = {},
}) => {
  const app = express();
  const cwd = process.cwd();
  const clientDirectory = path.join(cwd, buildOptions.buildDirectory, buildOptions.clientDirectory);

  const serverBuildUrl = url.pathToFileURL(
    path.join(cwd, buildOptions.buildDirectory, buildOptions.serverDirectory, buildOptions.serverBuildFile)
  ).href;

  let viteDevServer = undefined;

  if (mode === 'development') {
    const vite = await require('vite');
    viteDevServer = await vite.createServer({
      ...viteOptions,
      server: { middlewareMode: true, ...viteOptions?.server },
    });
    app.use(viteDevServer.middlewares);
  } else {
    app.use(
      express.static(clientDirectory, {
        ...expressStaticOptions,
      })
    );
  }

  const build = viteDevServer
    ? () => viteDevServer.ssrLoadModule('virtual:remix/server-build')
    : () => import(serverBuildUrl);

  app.use(
    remixExpress({
      build,
      mode,
    })
  );

  return app;
};

module.exports = {
  createRemixExpressApp,
  remixExpress,
};
