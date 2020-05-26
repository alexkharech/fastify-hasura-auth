import { FastifyRequest, FastifyInstance, FastifyReply } from "fastify";
import {
  Controller,
  POST,
  FastifyInstanceToken,
  getInstanceByToken,
} from "fastify-decorators";
import { ServerResponse } from "http";
import { readFileSync } from "fs";
import { resolve } from "path";
import Handlebars from "handlebars";

import { generateToken, validateEmail } from "../utils";
import errors from "../errors";
import { User } from "../models";
import { IStatus, IError, IUserToken } from "interfaces";

const passwordRecoveryTemplate = Handlebars.compile(
  readFileSync(
    resolve(__dirname, "../templates/password_recovery.hbs")
  ).toString()
);

const passwordResetTemplate = Handlebars.compile(
  readFileSync(resolve(__dirname, "../templates/password_reset.hbs")).toString()
);

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
                password: { type: "string" },
              },
              required: ["email", "password"],
            },
          },
        },
      },
      preValidation(request, reply, next) {
        const { email }: { email: string } = request.body.input;
        if (!validateEmail(email)) {
          reply.status(422).send<IError>({
            message: errors.INVALID_EMAIL_ADDRESS,
          });
        }
        next();
      },
      preHandler: AuthController.instance.auth([
        AuthController.instance.verifyUsernameAndPassword,
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
                photographer: { type: "boolean", default: false },
              },
              required: ["email", "password"],
            },
          },
        },
      },
      preValidation(request, reply, next) {
        const { email }: { email: string } = request.body.input;
        if (!validateEmail(email)) {
          reply.status(422).send<IError>({
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
          type: "object",
          properties: {
            authorization: { type: "string" },
          },
          required: ["authorization"],
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
    reply.send<IUserToken>(request.user as IUserToken);
  }

  @POST({
    url: "/password_recovery",
    options: {
      schema: {
        summary: "Recovery password",
        response: {
          200: "Status#",
          422: "Error#",
          404: "Error#",
          500: "Error#",
        },
        body: {
          type: "object",
          properties: {
            input: {
              type: "object",
              properties: {
                email: { type: "string" },
              },
              required: ["email"],
            },
          },
        },
      },
      preValidation(request, reply, next) {
        const { email }: { email: string } = request.body.input;
        if (!validateEmail(email)) {
          reply.status(422).send<IError>({
            message: errors.INVALID_EMAIL_ADDRESS,
          });
        }
        next();
      },
    },
  })
  async recoveryPasswordHandler(
    request: FastifyRequest,
    reply: FastifyReply<ServerResponse>
  ) {
    const { email }: { email: string } = request.body.input;
    const user = await User.query().findOne("email", email);

    if (!user) {
      return reply.status(404).send<IError>({
        message: errors.USER_NOT_FOUND,
      });
    }

    const fastify = AuthController.instance;
    const token = await generateToken();

    const redisKey = `password_reset:${token}`;
    try {
      const res = await fastify.redis.set(redisKey, user.id, "EX", 86400);
      if (res !== "OK") throw new Error("redis set failed");
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send<IError>({
        message: errors.SERVER_ERROR,
      });
    }

    const html = passwordRecoveryTemplate({
      url: `${process.env.APP_URL}/auth/password_reset/${token}`,
    });
    try {
      const info = await fastify.nodemailer.sendMail({
        from: fastify.config.get("mail.from"),
        subject: fastify.config.get("mail.recovery.subject"),
        to: email,
        html: html,
      });
      fastify.log.info(`Message sent: ${info.messageId}`);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send<IError>({
        message: errors.SERVER_ERROR,
      });
    }

    reply.send<IStatus>({
      status: true,
    });
  }

  @POST({
    url: "/password_reset",
    options: {
      schema: {
        summary: "Reset password",
        response: {
          200: "Status#",
          422: "Error#",
          404: "Error#",
          500: "Error#",
        },
        body: {
          type: "object",
          properties: {
            input: {
              type: "object",
              properties: {
                token: { type: "string" },
              },
              required: ["token"],
            },
          },
        },
      },
    },
  })
  async resetPaswordHandler(
    request: FastifyRequest,
    reply: FastifyReply<ServerResponse>
  ) {
    const fastify = AuthController.instance;
    const { token }: { token: string } = request.body.input;
    let userId: string;

    const redisKey = `password_reset:${token}`;
    try {
      const userIdInRedis = await fastify.redis.get(redisKey);
      if (!userIdInRedis) throw new Error(errors.INVALID_TOKEN);
      userId = userIdInRedis;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send<IError>({
        message: errors.SERVER_ERROR,
      });
    }
    const user = await User.query().findOne("id", userId);
    if (!user) {
      return reply.status(404).send<IError>({
        message: errors.USER_NOT_FOUND,
      });
    }

    const newPassword = await generateToken(4);
    try {
      user.$query().update({
        password: newPassword,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send<IError>({
        message: errors.SERVER_ERROR,
      });
    }

    const html = passwordResetTemplate({
      password: newPassword,
    });
    try {
      const info = await fastify.nodemailer.sendMail({
        from: fastify.config.get("mail.from"),
        subject: fastify.config.get("mail.reset.subject"),
        to: user.email,
        html: html,
      });
      fastify.log.info(`Message sent: ${info.messageId}`);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send<IError>({
        message: errors.SERVER_ERROR,
      });
    }

    await fastify.redis.del(redisKey);
    reply.send<IStatus>({
      status: true,
    });
  }
}
