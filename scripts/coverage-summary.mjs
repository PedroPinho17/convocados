// Junta a cobertura de cada pacote numa tabela. No CI, escreve-a no resumo do job
// (GITHUB_STEP_SUMMARY); em casa, mostra-a no terminal.
// Serve para ver onde faltam testes, não para perseguir um número: não falha o CI.
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const reports = [
  ["shared (unitários)", "packages/shared/coverage/coverage-summary.json"],
  ["API (e2e com Postgres)", "apps/api/coverage/e2e/coverage-summary.json"],
  ["web (componentes)", "apps/web/coverage/coverage-summary.json"],
  ["mobile (componentes)", "apps/mobile/coverage/coverage-summary.json"],
];

const pct = (m) => `${m.pct.toFixed(1)}%`;
const rows = [];
for (const [name, path] of reports) {
  if (!existsSync(path)) {
    rows.push(`| ${name} | — | — | — | — |`);
    continue;
  }
  const { total } = JSON.parse(readFileSync(path, "utf8"));
  rows.push(
    `| ${name} | ${pct(total.lines)} | ${pct(total.branches)} | ${pct(total.functions)} | ${pct(total.statements)} |`,
  );
}

const table = [
  "### Cobertura de testes",
  "",
  "| Pacote | Linhas | Ramos | Funções | Instruções |",
  "| --- | ---: | ---: | ---: | ---: |",
  ...rows,
  "",
].join("\n");

console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`);
