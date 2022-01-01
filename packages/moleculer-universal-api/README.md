# moleculer-universal-api

`moleculer-universal-api` allows you to use any node API app (e.g. `express`, `koa`, `hapi`, `feathers`, `nestjs`) as an API gateway.

**NB: This is an alpha version as it hasn't been tested with multiple frameworks yet. So please use with caution.**

## Installation

`npm i moleculer-universal-api`

## Usage

Create your app, returning an object with `start`, and `stop` methods - these are used to start and stop the server. Below is a simple example using `express`, you're free to create your app in any way you wish as long as it returns the two methods.

Note that the dependency services are passed in as parameters, so their implemation is decoupled (good for maintenance and testing).

```ts
export function createApp({
  logger,
  math,
}: {
  logger: SomeLoggerService;
  math: SomeMathService;
}) {
  const app = express();
  let server: Server | null = null;

  app.get('/add', async (req, res) => {
    const added = await math.add({ a: 1, b: 2 });

    res.json({ added });
  });

  return {
    start,
    stop,
  };

  function start() {
    return new Promise<void>((resolve) => {
      server = app.listen(PORT, () => {
        logger.info(`Listening on port ${PORT}`);
        
        resolve());
    });
  }

  function stop() {
    return new Promise<string>((resolve, reject) => {
      if (server?.listening) {
        server.close((err) => {
          if (err) {
            logger.error(`Server close error: ${err}`)
            reject();
          }

          logger.info('Server stopped successfully.');
          resolve();
        });
      }
    });
  }
}
```

Then simply create your gateway service using the `mua` function:

```ts
const broker = new ServiceBroker();

broker.createService(mathService);

const { createService, getApp } = mua(createApp, {
  dependencies: ['math'],
  // mixins: ...,
  // settings: ...,
  // methods: ...,
  // etc.
});

createService(broker);

// use `getApp` to retrieve the app instance if you wish to use it later: 
// const app = getApp();
// app.use(someMiddleware);

return broker.start();
```

If you need access to the broker's internal `logger`, there are two strategies. You could either wrap it as a separate service, and pass it in as a dependency as above. Or you could simply wrap your `createApp` and provide it when you create your gateway:

```ts
export function withLogger(logger) {
  return function createApp() {
    const app = express();
    ...
  }
}

const broker = new ServiceBroker();

const { createService, getApp } = mua(withLogger(broker.logger));

createService(broker);
```
