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
CREATE TABLE public.users (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    email text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    password text NOT NULL,
);

CREATE TABLE public.roles (
    name text NOT NULL,
    description text
);

CREATE TABLE public.users_roles (
    user_id uuid NOT NULL,
    role_name text NOT NULL
);
```

### add authorization actions using Hasura console

![add actions](hasura-add-actions.png)

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
```

### set permisions

![set permisions](hasura-set-permisions.png)

### test your api in console

![graphql console](hasura-example.png)

## Enjoy!
