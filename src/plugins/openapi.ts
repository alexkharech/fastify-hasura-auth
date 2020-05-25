import fp = require("fastify-plugin");
import fastifyOas = require("fastify-oas");

export default fp((fastify, opts, next) => {
  fastify.register(fastifyOas, {
    exposeRoute: true,
    addModels: true,
    yaml: true,
    model: "dynamic",
    swagger: {
      ...opts,
      consumes: ["application/json"],
      produces: ["application/json"],
    },
    components: {
      securitySchemes: {
        bearer: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  });

  fastify.addSchema({
    $id: "Error",
    type: "object",
    properties: {
      code: { type: "integer" },
      message: { type: "string" },
    },
  });

  fastify.addSchema({
    $id: "User",
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      email: { type: "string", format: "email" },
      active: { type: "boolean" },
      token: { type: "string" },
      roles: { type: "array", items: { type: "string" } },
    },
  });

  next();
});
