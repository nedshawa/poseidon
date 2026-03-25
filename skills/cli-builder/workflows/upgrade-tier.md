---
name: upgrade-tier
description: Upgrade a CLI from one sophistication tier to the next.
---

## Tiers

| Tier     | Parsing          | Features                                  |
|----------|------------------|-------------------------------------------|
| Basic    | `process.argv`   | Simple routing, no deps                    |
| Standard | Commander.js     | Subcommands, auto-help, typed options      |
| Advanced | oclif            | Config files, plugins, shell completions   |

## Basic to Standard

Upgrade when: 4+ commands, need nested subcommands, or need typed option parsing.

### Steps

1. Install Commander: `bun add commander`

2. Convert command registry:
```typescript
// Before (Basic):
const COMMANDS = { list: cmdList, get: cmdGet };
const handler = COMMANDS[args[0]] ?? cmdHelp;

// After (Standard):
import { Command } from 'commander';
const program = new Command().name('cli-name').version('1.0.0');
program.command('list').description('List items').action(cmdList);
program.command('get').argument('<id>').action(cmdGet);
program.parse();
```

3. Move flag parsing into Commander options:
```typescript
// Before: const flags = { json: args.includes('--json') };
// After:
program.command('list')
  .option('--json', 'Output as JSON')
  .option('--limit <n>', 'Max results', parseInt)
  .action((opts) => { /* opts.json, opts.limit */ });
```

4. Remove manual help function (Commander generates it).
5. Run existing tests to verify nothing broke.

## Standard to Advanced

Upgrade when: need config files, plugin system, or shell completions.

### Steps

1. Scaffold: `npx oclif generate cli-name`
2. Convert each command to an oclif Command class:
```typescript
import { Command, Flags } from '@oclif/core';
export class ListCommand extends Command {
  static description = 'List all items';
  static flags = { json: Flags.boolean(), limit: Flags.integer({ default: 50 }) };
  async run() {
    const { flags } = await this.parse(ListCommand);
  }
}
```
3. Migrate config and run all tests.

## Checklist

- [ ] All existing commands work identically
- [ ] `--help` and `--json` output unchanged
- [ ] Tests pass
- [ ] README updated
