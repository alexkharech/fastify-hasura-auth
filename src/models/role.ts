import { Model } from "objection";
import User from "./user";

export default class Role extends Model {
  name!: string;

  static get tableName() {
    return "roles";
  }

  static get idColumn() {
    return "name";
  }

  static get relationMappings() {
    return {
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: "roles.name",
          to: "users.id",
          through: {
            from: "users_roles.user_id",
            to: "users_roles.role_name",
          },
        },
      },
    };
  }
}
