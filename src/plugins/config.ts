import fp = require("fastify-plugin");
import { Config } from "../models";

let localConfig: { [key: string]: string } = {};

export class FastifyConfig {
  async load() {
    const settings = await Config.query().where({});
    const config: { [key: string]: string } = {};
    settings.forEach((c) => {
      config[c.key] = c.value;
    });
    localConfig = config;
  }

  get(key: string): string {
    return localConfig[key];
  }

  set(key: string, value: string) {
    return (localConfig[key] = value);
  }
}

interface IConfigOptions {
  fromDb?: boolean;
}

export default fp(async (fastify, options: IConfigOptions = {}, next) => {
  const fastifyConfig = new FastifyConfig();
  if (options.fromDb) await fastifyConfig.load();
  fastify.decorate("config", fastifyConfig);
  next();
});
