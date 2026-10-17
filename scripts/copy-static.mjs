import { cpSync, mkdirSync } from "node:fs";

cpSync("public", "dist", { recursive: true });
mkdirSync("dist/licenses", { recursive: true });
cpSync("node_modules/yaml/LICENSE", "dist/licenses/yaml.txt");
