#!/usr/bin/env bun
/**
 * regime-check.ts — CLI tool for on-demand regime compliance checking.
 *
 * Usage:
 *   bun tools/regime-check.ts                      # Check all regimes, all projects
 *   bun tools/regime-check.ts --regime documentation  # Check one regime
 *   bun tools/regime-check.ts --project hunter-dalio  # Check one project
 *   bun tools/regime-check.ts --regime secrets --project my-app
 *   bun tools/regime-check.ts --help
 */

import { runRegimes } from "../hooks/handlers/regime-runner";

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function printHelp(): void {
  console.log(`
${BOLD}regime-check${RESET} — Poseidon regime compliance checker

${BOLD}USAGE${RESET}
  bun tools/regime-check.ts [OPTIONS]

${BOLD}OPTIONS${RESET}
  --regime <name>     Check only this regime (documentation, secrets, skill-hygiene)
  --project <id>      Check only this project
  --json              Output raw JSON results
  --help              Show this help

${BOLD}EXAMPLES${RESET}
  bun tools/regime-check.ts                           # Full compliance audit
  bun tools/regime-check.ts --regime documentation     # Documentation only
  bun tools/regime-check.ts --project _poseidon        # Poseidon self-check
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const jsonMode = args.includes("--json");
  const regimeIdx = args.indexOf("--regime");
  const projectIdx = args.indexOf("--project");

  const regimeFilter = regimeIdx !== -1 ? args[regimeIdx + 1] : undefined;
  const projectFilter = projectIdx !== -1 ? args[projectIdx + 1] : undefined;

  if (!jsonMode) {
    console.log(`\n${BOLD}${CYAN}⚖️  Poseidon Regime Compliance Check${RESET}\n`);
    if (regimeFilter) console.log(`  Regime: ${regimeFilter}`);
    if (projectFilter) console.log(`  Project: ${projectFilter}`);
    console.log();
  }

  const results = await runRegimes({
    trigger: "manual",
    regimeFilter,
    projectFilter,
  });

  if (jsonMode) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (results.length === 0) {
    console.log(`${DIM}  No regimes matched the filter criteria.${RESET}\n`);
    return;
  }

  // Group results by regime
  const byRegime = new Map<string, typeof results>();
  for (const r of results) {
    if (!byRegime.has(r.regime)) byRegime.set(r.regime, []);
    byRegime.get(r.regime)!.push(r);
  }

  let totalCompliant = 0;
  let totalNonCompliant = 0;
  let totalIssues = 0;

  for (const [regime, regimeResults] of byRegime) {
    console.log(`${BOLD}  ━━━ ${regime.toUpperCase()} ━━━${RESET}`);

    for (const r of regimeResults) {
      const status = r.validation.compliant
        ? `${GREEN}✓ COMPLIANT${RESET}`
        : `${RED}✗ NON-COMPLIANT${RESET}`;

      console.log(`    ${status}  ${CYAN}${r.project}${RESET}`);

      if (r.validation.compliant) {
        totalCompliant++;
      } else {
        totalNonCompliant++;
      }

      for (const issue of r.validation.issues) {
        totalIssues++;
        const icon = issue.severity === "critical" ? `${RED}●${RESET}`
          : issue.severity === "warning" ? `${YELLOW}●${RESET}`
          : `${DIM}●${RESET}`;
        console.log(`      ${icon} ${issue.message}`);
        if (issue.file) console.log(`        ${DIM}file: ${issue.file}${RESET}`);
        if (issue.fix) console.log(`        ${DIM}fix:  ${issue.fix}${RESET}`);
      }

      if (r.validation.issues.length > 0) console.log();
    }
    console.log();
  }

  // Summary
  console.log(`${BOLD}  ━━━ SUMMARY ━━━${RESET}`);
  console.log(`    ${GREEN}Compliant:${RESET}     ${totalCompliant}`);
  console.log(`    ${RED}Non-compliant:${RESET} ${totalNonCompliant}`);
  console.log(`    Total issues:    ${totalIssues}`);
  console.log();

  // Exit with non-zero if any non-compliant
  if (totalNonCompliant > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message || err}`);
  process.exit(2);
});
