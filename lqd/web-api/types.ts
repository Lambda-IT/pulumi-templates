/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface Environments {
  $schema?: string;
  /**
   * A one password object.
   */
  onePassword?: OnePasswordItem[];
  /**
   * A normal list of name: value entries for the environment.
   */
  envs: EnvsItem[];
}
export interface OnePasswordItem {
  /**
   * Specify the URL to the onePassItem, eg: https://start.1password.com/open/i?a=xyz...&v={VAULT_ID}&i={ITEM_ID}&h=...
   */
  itemUrl: string;
  /**
   * The mapping of the onePassItem fields to environment
   */
  mapping: Mapping[];
}
export interface Mapping {
  /**
   * The name of the onePassItem field
   */
  field: string;
  /**
   * The name of the environment variable name to create, will be title cased
   */
  env: string;
}
export interface EnvsItem {
  /**
   * The name of the environment variable
   */
  name: string;
  /**
   * The value of the environment variable, can reference other environment variables (also the ones created by onePassItem)
   */
  value: string;
}
