import type { Express, Request, Response, NextFunction } from 'express';
import type { ServerBuild } from '@remix-run/node';
import type { RequestHandler } from 'express-serve-static-core';

interface RemixExpressOptions {
  build: ServerBuild | (() => Promise<ServerBuild>);
  getLoadContext?: (req: Request, res: Response) => void;
  mode?: string;
}

interface InlineConfig {
  configFile?: string | false;
  envFile?: false;
}

export function remixExpress(options: {
  build: ServerBuild | (() => Promise<ServerBuild>);
  getLoadContext?: (req: Request, res: Response) => void;
  mode?: string;
}): RequestHandler;

export function createRemixExpressApp(options: {
  express?: Express;
  buildOptions?: {
    buildDirectory?: string;
    clientDirectory?: string;
    serverDirectory?: string;
    serverBuildFile?: string;
  };
  mode?: string;
  expressStaticOptions?: import('serve-static').ServeStaticOptions;
  viteOptions?: InlineConfig;
}): Promise<Express>;

export function remixExpress(
  options: RemixExpressOptions
): (req: Request, res: Response, next: NextFunction) => Promise<void>;
