#!/usr/bin/env bun
/**
 * SystemEvaluator.ts - Evaluate AI system architecture quality
 *
 * Usage:
 *   bun ~/.claude/skills/AGI/Tools/SystemEvaluator.ts <command> [options]
 *
 * Commands:
 *   audit <path>      Audit an AI system's file structure and configuration
 *   classify <text>   Classify task complexity using multi-signal scoring
 *   compare <a> <b>   Compare two system directories
 *
 * Options:
 *   --format json|text   Output format (default: text)
 *   --verbose            Show detailed scoring breakdown
 *   --help               Show this help
 *
 * @author PAI System
 * @version 1.0.0
 */

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

// --- Classification Signals ---

interface Signal {
  name: string;
  weight: number;
  detect: (text: string) => boolean;
}

const SIGNALS: Signal[] = [
  {
    name: 'thinking_question',
    weight: 25,
    detect: (t) => /how should (we|i|you)|why does|what'?s the best way|figure out|think about/i.test(t),
  },
  {
    name: 'investigation_question',
    weight: 20,
    detect: (t) => /investigate|research|deep dive|map the .* landscape|explore/i.test(t),
  },
  {
    name: 'word_count',
    weight: 15,
    detect: (t) => t.split(/\s+/).length > 100,
  },
  {
    name: 'enumeration',
    weight: 15,
    detect: (t) => /^[\s]*[-*•]\s/m.test(t) || /^[\s]*\d+[.)]\s/m.test(t),
  },
  {
    name: 'scope_words',
    weight: 10,
    detect: (t) => /\b(comprehensive|complete|full|entire|all|every)\b/i.test(t),
  },
  {
    name: 'file_references',
    weight: 10,
    detect: (t) => {
      const fileRefs = t.match(/[\w/.-]+\.(ts|js|md|json|yaml|yml|py|sh)/gi);
      return (fileRefs?.length ?? 0) > 1;
    },
  },
  {
    name: 'multi_sentence',
    weight: 10,
    detect: (t) => (t.match(/[.!?]\s+[A-Z]/g)?.length ?? 0) >= 3,
  },
  {
    name: 'uncertainty',
    weight: 5,
    detect: (t) => /i'?m not sure|maybe|could you help|not certain/i.test(t),
  },
  {
    name: 'time_pressure',
    weight: -10,
    detect: (t) => /\b(quickly|fast|just|simple|quick)\b/i.test(t),
  },
];

function classifyTask(text: string, verbose: boolean = false): {
  score: number;
  mode: string;
  effort: string;
  signals: { name: string; weight: number; triggered: boolean }[];
} {
  let score = 0;
  const signalResults = SIGNALS.map((s) => {
    const triggered = s.detect(text);
    if (triggered) score += s.weight;
    return { name: s.name, weight: s.weight, triggered };
  });

  let mode: string;
  let effort: string;

  if (score <= 15) {
    mode = 'MINIMAL';
    effort = 'N/A';
  } else if (score <= 55) {
    mode = 'NATIVE';
    effort = 'N/A';
  } else {
    mode = 'ALGORITHM';
    if (score <= 75) effort = 'Standard (<2min)';
    else if (score <= 100) effort = 'Extended (<8min)';
    else if (score <= 130) effort = 'Advanced (<16min)';
    else if (score <= 160) effort = 'Deep (<32min)';
    else effort = 'Comprehensive (<120min)';
  }

  return { score, mode, effort, signals: signalResults };
}

// --- Audit ---

async function auditSystem(path: string, verbose: boolean): Promise<void> {
  const fs = await import('fs');
  const p = await import('path');

  console.log(`\n${BOLD}${CYAN}═══ AI System Audit ═══${RESET}`);
  console.log(`${DIM}Target: ${path}${RESET}\n`);

  const checks = [
    { name: 'CLAUDE.md exists', test: () => fs.existsSync(p.join(path, 'CLAUDE.md')) },
    { name: 'Skills directory exists', test: () => fs.existsSync(p.join(path, 'skills')) },
    { name: 'Hooks directory exists', test: () => fs.existsSync(p.join(path, 'hooks')) },
    { name: 'Memory directory exists', test: () => {
      return fs.existsSync(p.join(path, 'MEMORY')) || fs.existsSync(p.join(path, 'memory'));
    }},
    { name: 'Algorithm defined', test: () => {
      return fs.existsSync(p.join(path, 'PAI', 'Algorithm')) || fs.existsSync(p.join(path, 'algorithm'));
    }},
    { name: 'Settings configured', test: () => fs.existsSync(p.join(path, 'settings.json')) },
    { name: 'Security rules exist', test: () => {
      return fs.existsSync(p.join(path, 'PAI', 'AISTEERINGRULES.md')) ||
             fs.existsSync(p.join(path, 'rules')) ||
             fs.existsSync(p.join(path, 'security'));
    }},
  ];

  let passed = 0;
  for (const check of checks) {
    const result = check.test();
    if (result) passed++;
    const icon = result ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    console.log(`  ${icon} ${check.name}`);
  }

  // Count skills
  const skillsDir = fs.existsSync(p.join(path, 'skills')) ? p.join(path, 'skills') : null;
  if (skillsDir) {
    const skills = fs.readdirSync(skillsDir).filter(
      (d: string) => fs.statSync(p.join(skillsDir, d)).isDirectory()
    );
    console.log(`\n  ${CYAN}Skills found:${RESET} ${skills.length}`);
    if (verbose) {
      for (const s of skills) {
        const hasSkillMd = fs.existsSync(p.join(skillsDir, s, 'SKILL.md'));
        const icon = hasSkillMd ? `${GREEN}✓${RESET}` : `${YELLOW}?${RESET}`;
        console.log(`    ${icon} ${s}`);
      }
    }
  }

  console.log(`\n${BOLD}Score: ${passed}/${checks.length} checks passed${RESET}`);

  if (passed === checks.length) {
    console.log(`${GREEN}System appears well-structured.${RESET}`);
  } else {
    console.log(`${YELLOW}System has gaps — see failed checks above.${RESET}`);
  }
}

// --- Main ---

const args = process.argv.slice(2);
const command = args[0];
const verbose = args.includes('--verbose');
const formatJson = args.includes('--format') && args[args.indexOf('--format') + 1] === 'json';

if (!command || command === '--help') {
  console.log(`
${BOLD}SystemEvaluator${RESET} — AI system architecture evaluation tool

${BOLD}Usage:${RESET}
  bun SystemEvaluator.ts audit <path>       Audit system structure
  bun SystemEvaluator.ts classify "<text>"   Classify task complexity
  bun SystemEvaluator.ts --help              Show this help

${BOLD}Options:${RESET}
  --format json    Output as JSON
  --verbose        Show detailed breakdown
`);
  process.exit(0);
}

if (command === 'classify') {
  const text = args.slice(1).filter((a) => !a.startsWith('--')).join(' ');
  if (!text) {
    console.error(`${RED}Error: provide text to classify${RESET}`);
    process.exit(1);
  }

  const result = classifyTask(text, verbose);

  if (formatJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n${BOLD}${CYAN}═══ Task Classification ═══${RESET}`);
    console.log(`${DIM}Input: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"${RESET}\n`);
    console.log(`  ${BOLD}Score:${RESET}  ${result.score}`);
    console.log(`  ${BOLD}Mode:${RESET}   ${result.mode}`);
    console.log(`  ${BOLD}Effort:${RESET} ${result.effort}`);

    if (verbose) {
      console.log(`\n  ${BOLD}Signal Breakdown:${RESET}`);
      for (const s of result.signals) {
        const icon = s.triggered ? `${GREEN}✓${RESET}` : `${DIM}·${RESET}`;
        const weight = s.triggered ? `${GREEN}+${s.weight}${RESET}` : `${DIM}+${s.weight}${RESET}`;
        console.log(`    ${icon} ${s.name.padEnd(25)} ${weight}`);
      }
    }
  }
} else if (command === 'audit') {
  const path = args[1] || process.env.HOME + '/.claude';
  await auditSystem(path, verbose);
} else {
  console.error(`${RED}Unknown command: ${command}${RESET}`);
  process.exit(1);
}
