require("dotenv").config();
import fastify = require("fastify");
import helmet = require("fastify-helmet");
import blipp = require("fastify-blipp");
import redis = require("fastify-redis");

import { bootstrap } from "fastify-decorators";
import { RedisOptions } from "ioredis";

import "./utils";
import { openapi, auth, objection, nodemailer, config } from "./plugins";
import { resolve } from "path";

import { checkForExists } from "./utils";

checkForExists(
  process.env,
  [
    "REDIS_URL",
    "DATABASE_URL",
    "CLAIMS_NAMESPACE",
    "AUTH_PRIVATE_KEY",
    "AUTH_PUBLIC_KEY",
  ],
  (key) => {
    throw new Error(`Environment variable ${key} must be defined`);
  }
);

const instance = fastify({
  logger: true,
});

instance.register(blipp);
instance
  .register(openapi, {
    info: {
      title: "fastify-hasura-auth",
      version: "1.0.0",
    },
    servers: [
      {
        url: process.env.OPENAPI_SERVER || "https://api.example.com",
      },
    ],
  })
  .register(helmet)
  .register(nodemailer, {
    pool: true,
    host: process.env.MAIl_HOST,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_SECURE,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
  })
  .register(objection, {
    url: process.env.DATABASE_URL,
  })
  .register(config, {
    fromDb: true,
  })
  .register(redis, <RedisOptions>{ url: process.env.REDIS_URL })
  .register(auth, {
    privateKey: process.env.AUTH_PRIVATE_KEY || "",
    publicKey: process.env.AUTH_PUBLIC_KEY || "",
    claimsNamespace: process.env.CLAIMS_NAMESPACE || "",
    tokenExpire: 30 * 86400, // 30 days
    usernameField: "email",
  })
  .register(bootstrap, {
    directory: resolve(__dirname, `controllers`),
    mask: /\.controller\./,
  });

const start = async () => {
  try {
    await instance.listen(process.env.PORT || "8000");
    instance.oas();
    instance.blipp();
  } catch (err) {
    console.log(err);
    instance.log.error(err);
    process.exit(1);
  }
};

start();
