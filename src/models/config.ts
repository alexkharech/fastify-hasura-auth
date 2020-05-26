import { Model } from "objection";

export default class Config extends Model {
  key!: string;
  value!: string;

  static get tableName() {
    return "config";
  }

  static get idColumn() {
    return "id";
  }
}
