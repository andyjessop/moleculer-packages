import Moleculer = require('moleculer');

export type CreateApp<T> = (deps: T) => App;

export type App = {
  start: () => void;
  stop: () => void;
};

export function mua<T = unknown>(createApp: CreateApp<T>, {
  dependencies,
  ...rest
}: {
  dependencies?:
    | string
    | Moleculer.ServiceDependency
    | (string | Moleculer.ServiceDependency)[];
  rest?: Moleculer.ServiceSchema;
}) {
  let app: App;

  return {
    getApp: () => app,
    createService,
  };

  function createService(broker: Moleculer.ServiceBroker) {
    return broker.createService({
      name: 'api',

      dependencies,

      ...rest,

      created() {
        // Add individual dependencies as empty objects to allow for deconstructing in express app
        this.deps = this.schema.dependencies
          .map(toDepName)
          .reduce(asObject, <Record<string, unknown>>{});

        app = createApp(this.deps);
      },

      async started(): Promise<void> {
        const servicesList: Moleculer.Service[] = await broker.call(
          '$node.services',
          { withActions: true }
        );

        servicesList
          .filter((service) =>
            this.schema.dependencies.map(toDepName).includes(service.name)
          )
          .forEach((service) => {
            if (!service.name) {
              return;
            }

            Object.keys(service.actions).forEach((fullActionName) => {
              const actionName = fullActionName.split('.')[1];

              this.deps[service.name] = this.deps[service.name] || {};

              this.deps[service.name][actionName] = async function (
                args: Record<string, unknown>
              ) {
                return broker.call(fullActionName, args);
              };
            });
          });

        app.start();
      },
      async stopped(): Promise<void> {
        app.stop();
      },
    });
  }
}

function toDepName(
  dep:
    | string
    | Moleculer.ServiceDependency
    | (string | Moleculer.ServiceDependency)
) {
  return typeof dep === 'string' ? dep : dep.name;
}

function asObject(acc, cur) {
  acc[cur] = {};
  return acc;
}
