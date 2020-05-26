import fp = require("fastify-plugin");
import auth = require("fastify-auth");
import jwt = require("fastify-jwt");

import { FastifyRequest, FastifyReply } from "fastify";
import { ServerResponse } from "http";
import { User } from "../models";
import { SignOptions } from "jsonwebtoken";
import errors from "../errors";
import { checkForExists } from "../utils";
import { IUserToken } from "../interfaces";

interface IAuthOptions {
  [key: string]: any;
  claimsNamespace: string;
  privateKey: string;
  publicKey: string;
  usernameField: string;
  usernameTransformer?: (username: string) => string;
}

export default fp((fastify, options: IAuthOptions, next) => {
  checkForExists(
    options,
    ["claimsNamespace", "privateKey", "publicKey"],
    (key) => {
      throw new Error(`Auth option ${key} must be defined`);
    }
  );

  const { usernameField } = options;
  type usernamePassword = { [usernameField: string]: string; password: string };

  fastify.register(auth);
  fastify.register(jwt, {
    secret: {
      private: options.privateKey,
      public: options.publicKey,
    },
  });

  const getJwt = (user: IUserToken) => {
    const signOptions: SignOptions = {
      subject: user.id,
      expiresIn: "30d", // 30 days validity
      algorithm: "RS256",
    };

    const claim = {
      ...user,
      iat: Math.floor(Date.now() / 1000),
      [options.claimsNamespace]: {
        "x-hasura-allowed-roles": user.roles,
        "x-hasura-default-role": "user",
        "x-hasura-user-id": user.id,
        // 'x-hasura-org-id': '123',
        // 'x-hasura-custom': 'custom-value'
      },
    };
    return fastify.jwt.sign(claim, signOptions);
  };

  const createUserToken = async (user: User): Promise<IUserToken> => {
    const userToken: IUserToken = {
      id: user.id,
      [usernameField]: user[usernameField],
      active: user.active,
      roles: user.getRoles(),
    };
    userToken.token = getJwt(userToken);

    const redisKey = `tokens:${user.id}:${userToken.token}`;
    const error = await fastify.redis.set(
      redisKey,
      "",
      "EX",
      options.tokenExpire
    );
    if (error) fastify.log.error(error);

    return userToken;
  };

  fastify.decorate(
    "verifyUsernameAndPassword",
    async (
      request: FastifyRequest,
      reply: FastifyReply<ServerResponse>,
      done: Function
    ) => {
      const {
        [usernameField]: username,
        password,
      }: usernamePassword = request.body.input;

      const transformedUsername = options.usernameTransformer
        ? options.usernameTransformer(username)
        : username;

      const user = await User.query()
        .where({ [usernameField]: transformedUsername })
        .first()
        .eager("roles");

      if (!user || !(await user.verifyPassword(password)))
        return done(new Error(errors.USER_NOT_FOUND));

      if (!user.active) return done(new Error(errors.USER_IS_NOT_ACTIVE));

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
        [usernameField]: username,
        password,
      }: usernamePassword = request.body.input;

      const transformedUsername = options.usernameTransformer
        ? options.usernameTransformer(username)
        : username;

      let user = await User.query()
        .where({ [usernameField]: transformedUsername })
        .first();

      if (user) {
        reply.status(409);
        return done(new Error(errors.EMAIL_IS_ALREADY_IN_USE));
      }

      try {
        user = await User.query()
          .insertGraphAndFetch({
            [usernameField]: transformedUsername,
            password: password,
            roles: [{ "#dbRef": "user" }],
          })
          .withGraphFetched("roles");

        if (request.body.input.photographer)
          await user.$relatedQuery("photographer").insert({});

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
      if (!authorization) return done(new Error(errors.INVALID_TOKEN));

      const token = (authorization as string).split(" ")[1];
      if (!token) return done(new Error(errors.INVALID_TOKEN));

      const userToken = fastify.jwt.decode(token) as IUserToken;
      if (userToken) {
        // token expired or not found
        if (!(await fastify.redis.get(`tokens:${userToken.id}:${token}`)))
          return done(new Error(errors.INVALID_TOKEN));

        // update token
        const user = await User.query()
          .findOne("id", userToken.id)
          .eager("roles");

        request.user = await createUserToken(user);
      } else {
        return done(new Error(errors.INVALID_TOKEN));
      }

      done(null);
    }
  );

  next();
});
