/**
 * Configuration fusionnée : .env (priorité) + Config DB.
 * Best practice : secrets dans .env, config non sensible dans DB.
 */

import { getCachedConfigMap } from "./config-cache";

export async function getSetting(key: string): Promise<string> {
  const envValue = process.env[key];
  if (envValue !== undefined && envValue !== "") {
    return envValue;
  }
  const dbConfig = await getCachedConfigMap();
  return dbConfig[key] ?? "";
}

export async function getSettingOr(key: string, defaultValue: string): Promise<string> {
  const v = await getSetting(key);
  return v || defaultValue;
}
