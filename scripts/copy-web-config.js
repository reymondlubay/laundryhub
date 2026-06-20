import { copyFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "web.config");
const target = resolve(root, "public", "web.config");

if (!existsSync(source)) {
  console.error("Missing web.config at project root.");
  process.exit(1);
}

copyFileSync(source, target);
console.log("Copied web.config -> public/web.config");
