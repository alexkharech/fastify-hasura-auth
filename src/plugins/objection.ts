import Knex from "knex";
import { Model } from "objection";
import fp = require("fastify-plugin");

export default fp((fastify, opts, next) => {
  if (!opts.url) throw new Error("Url must be specified");
  const knex = Knex(opts.url);
  Model.knex(knex);
  fastify.decorate("knex", knex);

  next();
});
