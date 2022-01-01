import { mua } from './mua';
import { ServiceBroker } from 'moleculer';
import * as express from 'express';
import { Server } from 'http';
const request = require('supertest'); //eslint-disable-line

export interface MathService {
  add: ({ a, b }: { a: number; b: number }) => number;
}

const PORT = 3000;

export function createApp({ math }: { math: MathService }) {
  const app = express();
  let server: Server | null = null;

  app.get('/add', async (req, res) => {
    const added = await math.add({ a: 1, b: 2 });
    res.json({ added });
  });

  return {
    getServer: () => server,
    start,
    stop,
  };

  function start() {
    return new Promise<void>((resolve) => {
      server = app.listen(PORT, () => resolve());
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
