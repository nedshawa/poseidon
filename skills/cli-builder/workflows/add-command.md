---
name: add-command
description: Add a new command to an existing CLI tool.
---

## Steps

### 1. Read Existing Structure

Examine the CLI to understand: tier (process.argv vs Commander), command registry pattern, existing types.

### 2. Define New Command

Determine: name (verb, lowercase), arguments, options/flags, return type for `--json`.

### 3. Implement Handler

**Basic tier:**
```typescript
async function cmdSync() {
  const target = args[1];
  if (!target) {
    console.error('Error: target required. Usage: cli-name sync <target>');
    process.exit(1);
  }
  try {
    const result = await doSync(target);
    if (flags.json) console.log(JSON.stringify(result, null, 2));
    else console.log(`Synced: ${result.summary}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
```

**Standard tier:**
```typescript
program.command('sync')
  .description('Sync target data')
  .argument('<target>', 'Target to sync')
  .option('--json', 'Output as JSON')
  .option('--dry-run', 'Preview without executing')
  .action(async (target, opts) => { /* handler */ });
```

### 4. Register Command

**Basic:** Add to COMMANDS object and update help text.
**Standard:** Commander auto-registers via `.command()`.

### 5. Add Tests

```typescript
test('sync works', async () => {
  const r = await $`bun ./cli-name.ts sync test-target --json`.json();
  expect(r).toHaveProperty('summary');
});
test('sync fails without target', async () => {
  const proc = Bun.spawn(['bun', './cli-name.ts', 'sync']);
  expect(await proc.exited).toBe(1);
});
```
