---
name: add-command
description: Add a new command to an existing CLI tool.
---

## Steps

### 1. Read Existing Structure

Examine the CLI entry point to understand:
- Which tier it uses (process.argv vs Commander.js vs oclif)
- How commands are registered
- What patterns existing commands follow
- What types are defined

### 2. Define New Command

Determine:
- Command name (verb, lowercase, e.g., `sync`, `export`, `check`)
- Arguments it accepts
- Options/flags it supports
- What it returns (for `--json` output)

### 3. Implement Handler

Follow the same pattern as existing commands:

**Basic tier:**
```typescript
async function cmdNewCommand() {
  const target = args[1];
  if (!target) {
    console.error('Error: target required. Usage: cli-name new-command <target>');
    process.exit(1);
  }

  try {
    const result = await doNewThing(target);
    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Done: ${result.summary}`);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
```

**Standard tier:**
```typescript
program.command('new-command')
  .description('What this command does')
  .argument('<target>', 'The target to operate on')
  .option('--json', 'Output as JSON')
  .option('--dry-run', 'Preview without executing')
  .action(async (target, opts) => { /* handler */ });
```

### 4. Register Command

**Basic tier** — add to the COMMANDS object:
```typescript
const COMMANDS: Record<string, () => Promise<void>> = {
  // ... existing commands
  'new-command': cmdNewCommand,
};
```

**Standard tier** — Commander auto-registers via `.command()`.

### 5. Update Help Text

Add the new command to the help output:
```
Commands:
  list         List all items
  get          Get a specific item
  new-command  What this command does    <-- add this line
```

### 6. Add Tests

```typescript
test('new-command works', async () => {
  const result = await $`bun ./cli-name.ts new-command test-target --json`.json();
  expect(result).toHaveProperty('summary');
});

test('new-command fails without target', async () => {
  const proc = Bun.spawn(['bun', './cli-name.ts', 'new-command']);
  const code = await proc.exited;
  expect(code).toBe(1);
});
```
