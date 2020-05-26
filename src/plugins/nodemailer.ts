import nodemailer from "nodemailer";
import fp = require("fastify-plugin");

export default fp((fastify, opts, next) => {
  fastify.decorate("nodemailer", nodemailer.createTransport(opts));
  next();
});
