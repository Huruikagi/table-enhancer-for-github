import { cpSync } from "node:fs";

cpSync("public", "dist", { recursive: true });
