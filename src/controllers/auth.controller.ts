import { FastifyRequest, FastifyInstance, FastifyReply } from "fastify";
import {
  Controller,
  GET,
  POST,
  FastifyInstanceToken,
  getInstanceByToken,
} from "fastify-decorators";
import { ServerResponse } from "http";

import errors from "../errors";
import { generateToken, validateEmail } from "../utils";

@Controller({ route: "/auth" })
export default class AuthController {
  private static instance = getInstanceByToken<FastifyInstance>(
    FastifyInstanceToken
  );

  @POST({
    url: "/login",
    options: {
      schema: {
        summary: "Login",
        response: {
          200: "User#",
          400: "Error#",
          401: "Error#",
        },
        body: {
          type: "object",
          properties: {
            input: {
              type: "object",
              properties: {
                email: { type: "string" },
                password: { type: "string", minLength: 6, maxLength: 255 },
              },
            },
          },
          required: ["input"],
        },
      },
      preValidation(request, reply, next) {
        const { email }: { email: string } = request.body.input;
        if (!validateEmail(email)) {
          reply.status(422).send({
            message: errors.INVALID_EMAIL_ADDRESS,
          });
        }
        next();
      },
      preHandler: AuthController.instance.auth([
        AuthController.instance.verifyLoginAndPassword,
      ]),
    },
  })
  async loginHandler(
    request: FastifyRequest,
    reply: FastifyReply<ServerResponse>
  ) {
    reply.send(request.user);
  }

  @POST({
    url: "/register",
    options: {
      schema: {
        summary: "Rregistration",
        response: {
          200: "User#",
          409: "Error#",
          422: "Error#",
        },
        body: {
          type: "object",
          properties: {
            input: {
              type: "object",
              properties: {
                email: { type: "string" },
                password: { type: "string", minLength: 6, maxLength: 255 },
              },
            },
          },
          required: ["input"],
        },
      },
      preValidation(request, reply, next) {
        const { email }: { email: string } = request.body.input;
        if (!validateEmail(email)) {
          reply.status(422).send({
            message: errors.INVALID_EMAIL_ADDRESS,
          });
        }
        next();
      },
      preHandler: AuthController.instance.auth([
        AuthController.instance.registerUser,
      ]),
    },
  })
  async registerHandler(
    request: FastifyRequest,
    reply: FastifyReply<ServerResponse>
  ) {
    reply.send(request.user);
    return;
  }

  @POST({
    url: "/token",
    options: {
      schema: {
        summary: "Get token",
        headers: {
          Authorization: { type: "string" },
        },
        response: {
          200: "User#",
          401: "Error#",
        },
        security: [
          {
            bearer: [],
          },
        ],
      },
      preHandler: AuthController.instance.auth([
        AuthController.instance.verifyJwtToken,
      ]),
    },
  })
  async tokenHandler(
    request: FastifyRequest,
    reply: FastifyReply<ServerResponse>
  ) {
    reply.send(request.user);
  }
}
