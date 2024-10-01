const { createRemixExpressApp, remixExpress } = require('../index');
const { createRequestHandler } = require('@remix-run/node');
const path = require("path");
const url = require("node:url");

jest.mock('@remix-run/node');

jest.mock('express', () => {
  const mockExpress = jest.fn().mockReturnValue({
    use: jest.fn(),
  });
  mockExpress.static = jest.fn().mockReturnValue(() => {});
  return mockExpress;
});

jest.mock('vite', () => ({
  createServer: jest.fn().mockResolvedValue({
    middlewares: {},
    ssrLoadModule: jest.fn().mockResolvedValue({}),
  }),
}));

const buildOptions = {
  buildDirectory: '/test/test-app/build',
  serverDirectory: 'server',
  serverBuildFile: 'index.js',
  clientDirectory: 'client',
};

describe('remixExpress', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      headers: {},
      get: jest.fn(),
      protocol: 'http',
      hostname: 'localhost',
      originalUrl: '/test',
    };
    mockRes = {
      on: jest.fn(),
      status: jest.fn().mockReturnThis(),
      set: jest.fn(),
      end: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should create a development middleware function', async () => {
    const mockBuild = await import('./test-app/build/server');

    const mockHandler = jest.fn().mockResolvedValue({
      status: 200,
      headers: new Headers(),
      body: null,
    });
    createRequestHandler.mockReturnValue(mockHandler);

    const middleware = remixExpress({ build: mockBuild, mode: 'development' });
    await middleware(mockReq, mockRes, mockNext);

    expect(createRequestHandler).toHaveBeenCalledWith(mockBuild, 'development');
    expect(mockHandler).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.end).toHaveBeenCalled();
  });

  it('should create a production middleware function', async () => {
    const mockBuild = await import('./test-app/build/server');

    const mockHandler = jest.fn().mockResolvedValue({
      status: 200,
      headers: new Headers(),
      body: null,
    });
    createRequestHandler.mockReturnValue(mockHandler);

    const middleware = remixExpress({ build: mockBuild, mode: 'production' });
    await middleware(mockReq, mockRes, mockNext);

    expect(createRequestHandler).toHaveBeenCalledWith(mockBuild, 'production');
    expect(mockHandler).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.end).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const mockBuild = await import('./test-app/build/server');

    const mockError = new Error('Test error');
    const mockHandler = jest.fn().mockRejectedValue(mockError);
    createRequestHandler.mockReturnValue(mockHandler);

    const middleware = remixExpress({ build: mockBuild, mode: 'production' });
    await middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(mockError);
  });
});

describe('createRemixExpressApp', () => {
  let mockExpress, mockVite;

  beforeEach(() => {
    jest.resetModules();
    mockExpress = require('express');
    mockVite = require('vite');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an express app with development configuration', async () => {
    const app = await createRemixExpressApp({
      mode: 'development',
      buildOptions: {
        ...buildOptions,
      },
      viteOptions: {
        server: { port: 3000 },
      },
    });

    expect(mockExpress).toHaveBeenCalled();
    expect(mockVite.createServer).toHaveBeenCalledWith({
      server: { middlewareMode: true, port: 3000 },
    });
    expect(app.use).toHaveBeenCalledWith({});
    expect(mockExpress.static).not.toHaveBeenCalled();
  });

  it('should create an express app with production configuration', async () => {
    const app = await createRemixExpressApp({
      mode: 'production',
      buildOptions: {
        ...buildOptions,
        buildDirectory: 'custom-build',
        clientDirectory: 'custom-client',
      },
      expressStaticOptions: {
        maxAge: '1d',
      },
    });

    expect(mockExpress).toHaveBeenCalled();
    expect(mockVite.createServer).not.toHaveBeenCalled();
    expect(mockExpress.static).toHaveBeenCalledWith(path.join(process.cwd(), 'custom-build', 'custom-client'), {
      maxAge: '1d',
    });
    expect(app.use).toHaveBeenCalledTimes(2);
  });

  it('should use default options when not provided', async () => {
    await createRemixExpressApp({});

    expect(mockExpress.static).toHaveBeenCalledWith(path.join(process.cwd(), 'build', 'client'), {});
  });

  it('should handle errors gracefully', async () => {
    mockVite.createServer.mockRejectedValueOnce(new Error('Vite error'));

    await expect(createRemixExpressApp({ mode: 'development' })).rejects.toThrow('Vite error');
  });

  it('should use provided express instance', async () => {
    const customExpress = jest.fn().mockReturnValue({
      use: jest.fn(),
    });
    customExpress.static = jest.fn().mockReturnValue(() => {});

    await createRemixExpressApp({ express: customExpress });

    expect(customExpress).toHaveBeenCalled();
    expect(mockExpress).not.toHaveBeenCalled();
  });

  it('should create correct server build URL in production mode', async () => {
    const cwd = process.cwd();

    const serverBuildUrl = url.pathToFileURL(
      path.join(cwd, buildOptions.buildDirectory, buildOptions.serverDirectory, buildOptions.serverBuildFile)
    ).href;

    const mockServerBuild = {
      default: jest.fn(),
    };
    jest.doMock(serverBuildUrl, () => mockServerBuild, { virtual: true });

    const mockApp = {
      use: jest.fn(),
    };
    mockExpress.mockReturnValue(mockApp);

    await createRemixExpressApp({ mode: 'production' });

    expect(mockApp.use).toHaveBeenCalled();

    const remixExpressMiddleware = mockApp.use.mock.calls.find(
      (call) => call[0] && typeof call[0] === 'function' && call[0].toString().includes('build')
    );

    expect(remixExpressMiddleware).toBeDefined();

    const middlewareFunction = remixExpressMiddleware[0];

    const req = {};
    const res = {};
    const next = jest.fn();

    await middlewareFunction(req, res, next);

    expect(jest.requireMock(serverBuildUrl)).toBe(mockServerBuild);
  });
});
