---
name: create-cli
description: Generate a complete TypeScript CLI tool from a specification.
---

## Steps

### 1. Define Purpose

Clarify with the user:
- What does this CLI do? (one sentence)
- What commands does it need?
- What external services or APIs does it call?
- Where should it live? (project directory)

### 2. Choose Tier

| Criteria               | Basic             | Standard           |
|------------------------|-------------------|--------------------|
| Commands               | 1-3               | 4-10               |
| Arguments              | Simple flags      | Nested options     |
| Dependencies           | None or minimal   | Framework OK       |
| Subcommands            | No                | Yes                |

Default to Basic unless the requirements clearly need Standard.

### 3. Generate Entry Point

**Basic tier (process.argv):**
```typescript
#!/usr/bin/env bun

const args = process.argv.slice(2);
const command = args[0];
const flags = Object.fromEntries(
  args.filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.slice(2).split('=');
    return [k, v ?? true];
  })
);

const COMMANDS: Record<string, () => Promise<void>> = {
  list: cmdList,
  get: cmdGet,
  help: cmdHelp,
};

async function main() {
  const handler = COMMANDS[command] ?? cmdHelp;
  await handler();
}

async function cmdHelp() {
  console.log(`Usage: cli-name <command> [options]

Commands:
  list    List all items
  get     Get a specific item

Options:
  --json  Output as JSON
  --help  Show this help`);
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
```

**Standard tier (Commander.js):**
```typescript
#!/usr/bin/env bun
import { Command } from 'commander';

const program = new Command()
  .name('cli-name')
  .description('What this CLI does')
  .version('1.0.0');

program.command('list')
  .description('List all items')
  .option('--json', 'Output as JSON')
  .action(async (opts) => { /* handler */ });

program.parse();
```

### 4. Add Error Handling

Every command follows this pattern:
```typescript
try {
  const result = await doWork();
  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatHuman(result));
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  console.error(`Try: cli-name --help`);
  process.exit(1);
}
```

### 5. Generate Supporting Files

**package.json:**
```json
{
  "name": "cli-name",
  "version": "1.0.0",
  "type": "module",
  "bin": { "cli-name": "./cli-name.ts" },
  "devDependencies": { "typescript": "^5.0.0" }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true, "target": "ESNext",
    "module": "ESNext", "moduleResolution": "bundler"
  }
}
```

### 6. Write Tests

```typescript
import { describe, test, expect } from 'bun:test';
import { $ } from 'bun';

describe('cli-name', () => {
  test('--help shows usage', async () => {
    const result = await $`bun ./cli-name.ts --help`.text();
    expect(result).toContain('Usage:');
  });

  test('list returns data', async () => {
    const result = await $`bun ./cli-name.ts list --json`.json();
    expect(Array.isArray(result)).toBe(true);
  });
});
```

### 7. Make Executable

```bash
chmod +x cli-name.ts
bun install
bun test
```
