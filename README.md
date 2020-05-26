# fastify-hasura-auth

This project is the starting point for authorization in Hasura GraphQL, and he is also ready to add the necessary routes to your API

```sh
# generate keys
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout > public.pem
```

```sh
# show keys
awk -v ORS='\\n' '1' private.pem
awk -v ORS='\\n' '1' public.pem
```

copy `.env.example` to `.env`

```json
AUTH_PRIVATE_KEY=="-----BEGIN RSA PRIVATE KEY-----\nypPTIfSzZ399o........"
AUTH_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nV02/4RJi........"
HASURA_GRAPHQL_JWT_SECRET={ "claims_namespace": "https://hasura.io/jwt/claims", "type": "RS256", "key": "<AUTH_PUBLIC_KEY>" }
```

## develop

### hasura engine

```sh
hasura init
docker-compose -f docker-compose.dev.yaml up -d
hasura console --admin-secret "adminsecret"
```

### api

```sh
yarn
yarn dev
```

### schema

```sql
CREATE TABLE "public"."roles" (
    "name" text NOT NULL,
    "description" text,
    CONSTRAINT "role_name_key" UNIQUE ("name"),
    CONSTRAINT "role_pkey" PRIMARY KEY ("name")
) WITH (oids = false);

CREATE TABLE "public"."users" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "email" text NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "password" text NOT NULL,
    CONSTRAINT "user_email_key" UNIQUE ("email"),
    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE TABLE "public"."users_roles" (
    "user_id" uuid NOT NULL,
    "role_name" text NOT NULL,
    CONSTRAINT "user_role_pkey" PRIMARY KEY ("user_id", "role_name"),
    CONSTRAINT "users_roles_role_name_fkey" FOREIGN KEY (role_name) REFERENCES roles(name) ON DELETE CASCADE NOT DEFERRABLE,
    CONSTRAINT "users_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE
) WITH (oids = false);

/*  optional: plugins/config */
CREATE TABLE "public"."config" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "key" text NOT NULL,
    "value" text,
    CONSTRAINT "config_key_key" UNIQUE ("key"),
    CONSTRAINT "config_pkey" PRIMARY KEY ("id")
) WITH (oids = false);
```

### add authorization actions using Hasura console

![add actions](docs/hasura-add-actions.png)

```gql
type authOutput {
  token: String!
  id: String!
  email: String!
  active: Boolean!
  roles: [String!]
}

# login
type Mutation {
  login(email: String!, password: String!): authOutput
}

# register
type Mutation {
  register(email: String!, password: String!): authOutput
}

# token
type Query {
  token: authOutput
}

# password recover
type Mutation {
  password_recovery(email: String!): statusOutput
}

# password reset
type Mutation {
  password_reset(token: String!): statusOutput
}

# status
type statusOutput {
  status: Boolean!
}
```

### set permisions

![set permisions](docs/hasura-set-permisions.png)

### test your api in console

![graphql console](docs/hasura-example.png)

## Enjoy!
