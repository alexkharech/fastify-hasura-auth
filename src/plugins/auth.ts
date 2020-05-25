import fp = require("fastify-plugin");
import auth = require("fastify-auth");
import jwt = require("fastify-jwt");

import { FastifyRequest, FastifyReply } from "fastify";
import { ServerResponse } from "http";
import { User } from "../models";
import { SignOptions } from "jsonwebtoken";
import errorTexts from "../errors";

interface Options {
  [key: string]: any;
  claimsNamespace: string;
  privateKey: string;
  publicKey: string;
}

const loginField = "email";

type UserToken = {
  id: string;
  active: boolean;
  roles: string[];
  token?: string;
  [loginField]: string;
};

export default fp((fastify, opts: Options, next) => {
  ["claimsNamespace", "privateKey", "publicKey"].ifNotFound(opts, (name) => {
    throw new Error(`Auth option ${name} must be defined`);
  });

  fastify.register(auth);
  fastify.register(jwt, {
    secret: {
      private: opts.privateKey,
      public: opts.publicKey,
    },
  });

  const getJwt = (user: UserToken) => {
    const signOptions: SignOptions = {
      subject: user.id,
      expiresIn: "30d", // 30 days validity
      algorithm: "RS256",
    };

    const claim = {
      ...user,
      iat: Math.floor(Date.now() / 1000),
      [opts.claimsNamespace]: {
        "x-hasura-allowed-roles": user.roles,
        "x-hasura-default-role": "user",
        "x-hasura-user-id": user.id,
        // 'x-hasura-org-id': '123',
        // 'x-hasura-custom': 'custom-value'
      },
    };
    return fastify.jwt.sign(claim, signOptions);
  };

  const createUserToken = async (user: User): Promise<UserToken> => {
    const userToken: UserToken = {
      id: user.id,
      [loginField]: user[loginField],
      active: user.active,
      roles: user.getRoles(),
    };
    userToken.token = getJwt(userToken);

    const redisKey = `tokens:${userToken.token}`;
    const errors = await fastify.redis
      .multi()
      .set(redisKey, userToken.id)
      .expire(redisKey, opts.tokenExpire) // expire token in 30 days
      .exec();

    errors.filter((err) => err[0]).forEach((err) => fastify.log.error(err));
    return userToken;
  };

  fastify.decorate(
    "verifyLoginAndPassword",
    async (
      request: FastifyRequest,
      reply: FastifyReply<ServerResponse>,
      done: Function
    ) => {
      const {
        [loginField]: login,
        password,
      }: { [loginField]: string; password: string } = request.body.input;

      const user = await User.query()
        .where({ [loginField]: login.toLowerCase() })
        .first()
        .eager("roles");

      if (!user || !(await user.verifyPassword(password)))
        return done(new Error(errorTexts.AUTH_USER_NOT_FOUND));

      if (!user.active)
        return done(new Error(errorTexts.AUTH_USER_IS_NOT_ACTIVE));

      request.user = await createUserToken(user);
      done(null);
    }
  );

  fastify.decorate(
    "registerUser",
    async (
      request: FastifyRequest,
      reply: FastifyReply<ServerResponse>,
      done: Function
    ) => {
      const {
        [loginField]: login,
        password,
      }: { [loginField]: string; password: string } = request.body.input;

      const lowerLogin = login.toLowerCase();

      let user = await User.query()
        .where({ [loginField]: lowerLogin })
        .first();

      if (user) {
        reply.status(409);
        return done(new Error(errorTexts.AUTH_EMAIL_IS_ALREADY_IN_USE));
      }

      try {
        user = await User.query()
          .insertGraphAndFetch({
            [loginField]: lowerLogin,
            password: password,
            roles: [{ "#dbRef": "user" }],
          })
          .eager("roles");

        request.user = await createUserToken(user);
        done(null);
      } catch (err) {
        reply.status(500);
        return done(err);
      }
    }
  );

  fastify.decorate(
    "verifyJwtToken",
    async (
      request: FastifyRequest,
      reply: FastifyReply<ServerResponse>,
      done: Function
    ) => {
      const { authorization } = request.headers;
      if (!authorization) return done(new Error(errorTexts.AUTH_INVALID_TOKEN));

      const token = (authorization as string).split(" ")[1];
      if (!token) return done(new Error(errorTexts.AUTH_INVALID_TOKEN));

      // token expired or not found
      if (!(await fastify.redis.get(`tokens:${token}`)))
        return done(new Error(errorTexts.AUTH_INVALID_TOKEN));

      const userToken = fastify.jwt.decode(token) as UserToken;

      // update token expire
      if (userToken) {
        const user = await User.query()
          .findOne("id", userToken.id)
          .eager("roles");
        request.user = await createUserToken(user);
      }

      done(null);
    }
  );

  next();
});
