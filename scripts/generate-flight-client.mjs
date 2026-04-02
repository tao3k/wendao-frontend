import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendRoot = resolve(__dirname, "..");
const outputDir = resolve(frontendRoot, "src/api/flight/generated");
const protoPath = resolve(frontendRoot, "../arrow-julia/src/flight/proto");
const protoFile = resolve(protoPath, "Flight.proto");
const protocGenEs = resolve(frontendRoot, "node_modules/.bin/protoc-gen-es");
mkdirSync(outputDir, { recursive: true });

execFileSync(
  "protoc",
  [
    `--plugin=protoc-gen-es=${protocGenEs}`,
    `--proto_path=${protoPath}`,
    `--es_out=${outputDir}`,
    "--es_opt",
    "target=ts",
    protoFile,
  ],
  {
    cwd: frontendRoot,
    stdio: "inherit",
  },
);

for (const entry of readdirSync(outputDir)) {
  if (!entry.endsWith(".ts")) {
    continue;
  }
  const path = resolve(outputDir, entry);
  const source = readFileSync(path, "utf8");
  const rewritten = source.replaceAll('.js";', '";').replaceAll(".js';", "';");
  if (rewritten !== source) {
    writeFileSync(path, rewritten);
  }
}
