import { mua } from './mua';
import { ServiceBroker } from 'moleculer';
import Koa from 'koa';
const router = require('@koa/router')(); // eslint-disable-line
import { Server } from 'http';
const request = require('supertest'); //eslint-disable-line

export interface MathService {
  add: ({ a, b }: { a: number; b: number }) => number;
}

const PORT = 3000;

export function createApp({ math }: { math: MathService }) {
  const app = new Koa();
  let server: Server | null = null;

  router.get('/add', add);
  
  app.use(router.routes());

  return {
    getServer: () => server,
    start,
    stop,
  };

  async function add(ctx) {
    const added = await math.add({ a: 1, b: 2 });
    
    ctx.body = { added };
  }

  function start() {
    return new Promise<void>((resolve) => {
      server = app.listen(PORT);

      resolve();
    });
  }

  function stop() {
    return new Promise<string>((resolve, reject) => {
      if (server?.listening) {
        server.close((err) => {
          if (err) {
            reject(`Server close error: ${err}`);
          }

          resolve('Server stopped successfully.');
        });
      }
    });
  }
}

const mathService = {
  name: 'math',
  actions: {
    add(ctx) {
      return Number(ctx.params.a) + Number(ctx.params.b);
    },
  },
};

describe('moleculerExpress', () => {
  let gateway;
  let broker;

  beforeAll(async () => {
    broker = new ServiceBroker({ nodeID: undefined, logger: false });

    broker.createService(mathService);

    gateway = mua(createApp, {
      dependencies: [mathService.name],
    });

    gateway.createService(broker);

    await broker.start();
  });

  afterAll(async () => await broker.stop());

  it('GET /add', async () => {
    await request(gateway.getApp().getServer())
      .get('/add')
      .then((res) => {
        expect(res.body).toEqual({
          added: 3,
        });
      });
  });

  it('server stopped when broker stopped', async () => {
    await broker.stop();

    expect(gateway.getApp().getServer().listening).toEqual(false);
  });
});
