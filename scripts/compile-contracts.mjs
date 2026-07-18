import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import solc from "solc";

const root = process.cwd();
const sources = {};
for (const filename of ["FounderPass.sol", "BuilderPass.sol"]) {
  sources[filename] = { content: await readFile(path.join(root, "contracts", filename), "utf8") };
}

const output = JSON.parse(solc.compile(JSON.stringify({
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } },
  },
})));

const diagnostics = output.errors ?? [];
for (const diagnostic of diagnostics) {
  const target = diagnostic.severity === "error" ? console.error : console.warn;
  target(diagnostic.formattedMessage ?? diagnostic.message);
}
if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) process.exit(1);

for (const [filename, contracts] of Object.entries(output.contracts ?? {})) {
  for (const [name, artifact] of Object.entries(contracts)) {
    if (!artifact.evm?.bytecode?.object) throw new Error(`${filename}:${name} did not produce bytecode`);
    console.log(`${filename}:${name} compiled (${artifact.evm.bytecode.object.length / 2} bytes)`);
  }
}
