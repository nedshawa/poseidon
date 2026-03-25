---
name: create-cli
description: Generate a complete TypeScript CLI tool from a specification.
---

## Steps

### 1. Define Purpose

Clarify: What does this CLI do? What commands? What APIs or services? Where does it live?

### 2. Choose Tier

Default to Basic unless requirements clearly need Standard (4+ commands with subcommands).

### 3. Generate Entry Point

**Basic tier (process.argv):**
```typescript
#!/usr/bin/env bun
const args = process.argv.slice(2);
const command = args[0];
const flags = Object.fromEntries(
  args.filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.slice(2).split('='); return [k, v ?? true];
  })
);
const COMMANDS: Record<string, () => Promise<void>> = {
  list: cmdList, get: cmdGet, help: cmdHelp,
};
async function cmdHelp() {
  console.log(`Usage: cli-name <command> [options]\nCommands: list, get\nOptions: --json, --help`);
}
async function main() { await (COMMANDS[command] ?? cmdHelp)(); }
main().catch(err => { console.error(`Error: ${err.message}`); process.exit(1); });
```

**Standard tier (Commander.js):**
```typescript
#!/usr/bin/env bun
import { Command } from 'commander';
const program = new Command().name('cli-name').description('Purpose').version('1.0.0');
program.command('list').description('List items').option('--json').action(async (opts) => {});
program.parse();
```

### 4. Add Error Handling

Every command: try/catch, `--json` branch, exit code 1 on error with actionable message.

### 5. Generate Supporting Files

Generate `package.json` (name, version, type: module, bin entry) and `tsconfig.json` (strict, ESNext, bundler resolution).

### 6. Write Tests

```typescript
import { describe, test, expect } from 'bun:test';
import { $ } from 'bun';
describe('cli-name', () => {
  test('--help shows usage', async () => {
    const r = await $`bun ./cli-name.ts --help`.text();
    expect(r).toContain('Usage:');
  });
  test('list returns data', async () => {
    const r = await $`bun ./cli-name.ts list --json`.json();
    expect(Array.isArray(r)).toBe(true);
  });
});
```

### 7. Finalize

```bash
chmod +x cli-name.ts && bun install && bun test
```
