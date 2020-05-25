import * as fastify from "fastify";
import * as http from "http";
import Knex from "knex";
import { AuthFunction } from "fastify-auth";

declare module "fastify" {
  export interface FastifyInstance<
    HttpServer = http.Server,
    HttpRequest = http.IncomingMessage,
    HttpResponse = http.ServerResponse
  > {
    knex: Knex;

    registerUser: AuthFunction;
    verifyJwtToken: AuthFunction;
    verifyLoginAndPassword: AuthFunction;
  }
}

declare global {
  interface String {
    isValidEmail(): boolean;
  }

  interface Array<T> {
    ifNotFound(
      this: T[],
      options: { [key: string]: any },
      callback: (name: string) => void
    ): void;
  }
}
