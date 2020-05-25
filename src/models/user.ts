import { Model } from "objection";
import bcrypt from "bcryptjs";
import Role from "./role";

export default class User extends Model {
  id!: string;
  email!: string;
  password!: string;
  active!: boolean;
  roles!: Role[];

  static get tableName() {
    return "users";
  }

  static get idColumn() {
    return "id";
  }

  static get relationMappings() {
    return {
      roles: {
        relation: Model.ManyToManyRelation,
        modelClass: Role,
        join: {
          from: "users.id",
          to: "roles.name",
          through: {
            from: "users_roles.user_id",
            to: "users_roles.role_name",
          },
        },
      },
    };
  }

  getRoles(): string[] {
    const roles = new Set(this.roles.map((el) => el.name));
    return [...roles];
  }

  async $beforeInsert() {
    const salt = bcrypt.genSaltSync();
    this.password = await bcrypt.hash(this.password, salt);
  }

  async $beforeUpdate() {
    await this.$beforeInsert();
  }

  async verifyPassword(password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, this.password, (err, success) => {
        if (err) reject(err);
        else resolve(success);
      });
    });
  }
}
