import * as http from "http";
import * as mailer from "nodemailer";
import Knex from "knex";
import { AuthFunction } from "fastify-auth";
import { FastifyConfig } from "plugins/config";

declare module "fastify" {
  export interface FastifyInstance<
    HttpServer = http.Server,
    HttpRequest = http.IncomingMessage,
    HttpResponse = http.ServerResponse
  > {
    knex: Knex;

    registerUser: AuthFunction;
    verifyJwtToken: AuthFunction;
    verifyUsernameAndPassword: AuthFunction;
    nodemailer: mailer.Transporter;
    config: FastifyConfig;
  }
}
