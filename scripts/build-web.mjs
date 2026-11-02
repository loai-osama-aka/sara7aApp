import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendRoot = path.resolve(serverRoot, "..", "frontend");
const distDir = path.join(frontendRoot, "dist");
const publicDir = path.join(serverRoot, "public");

if (!existsSync(frontendRoot)) {
  console.error(
    "frontend/ was not found next to the server folder.\n" +
      "Deployments only need the committed ./public folder, so there is nothing to build here.",
  );
  process.exit(1);
}

console.log("building the frontend...");
execSync("npm run build", { cwd: frontendRoot, stdio: "inherit" });

if (!existsSync(distDir)) {
  console.error("the frontend build produced no dist/ folder");
  process.exit(1);
}

rmSync(publicDir, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });
cpSync(distDir, publicDir, { recursive: true });

console.log(`copied the frontend build to ${publicDir}`);
