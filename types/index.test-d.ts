import { expectType } from 'tsd';
import { remixExpress, createRemixExpressApp } from './index';
import type { Express, RequestHandler } from 'express';
import type { ServerBuild } from '@remix-run/node';

{
  const middleware = remixExpress({
    build: {} as ServerBuild,
    mode: 'development',
  });

  expectType<RequestHandler>(middleware);
}

{
  const appPromise = createRemixExpressApp({
    buildOptions: {
      buildDirectory: 'custom-build',
      clientDirectory: 'custom-public',
      serverDirectory: 'custom-server',
      serverBuildFile: 'custom-index.js',
    },
    mode: 'production',
    expressStaticOptions: {
      dotfiles: 'allow',
    },
    viteOptions: {},
  });

  expectType<Promise<Express>>(appPromise);
}
