---
name: upgrade-tier
description: Upgrade a CLI from one sophistication tier to the next.
---

## Tiers

| Tier     | Parsing          | Features                                 |
|----------|------------------|------------------------------------------|
| Basic    | `process.argv`   | Single command or simple routing, no deps |
| Standard | Commander.js     | Subcommands, auto-help, typed options     |
| Advanced | oclif            | Config files, plugins, shell completions  |

## Basic to Standard

Upgrade when:
- CLI has 4+ commands and help text is getting unwieldy
- Need nested subcommands (e.g., `cli user list`, `cli user create`)
- Need typed option parsing beyond simple `--key=value`

### Steps

1. Install Commander:
```bash
bun add commander
```

2. Convert command registry to Commander programs:
```typescript
// Before (Basic):
const COMMANDS = { list: cmdList, get: cmdGet };
const handler = COMMANDS[args[0]] ?? cmdHelp;

// After (Standard):
import { Command } from 'commander';
const program = new Command().name('cli-name').version('1.0.0');
program.command('list').description('List items').action(cmdList);
program.command('get').argument('<id>').description('Get item').action(cmdGet);
program.parse();
```

3. Move flag parsing into Commander options:
```typescript
// Before:
const flags = { json: args.includes('--json') };

// After:
program.command('list')
  .option('--json', 'Output as JSON')
  .option('--limit <n>', 'Max results', parseInt)
  .action((opts) => { /* opts.json, opts.limit */ });
```

4. Remove manual help function (Commander generates it).

5. Run existing tests to verify nothing broke.

## Standard to Advanced

Upgrade when:
- Need persistent configuration files
- Need a plugin system for extensibility
- Need shell completions (bash, zsh, fish)
- CLI is becoming a product used by a team

### Steps

1. Scaffold oclif project:
```bash
npx oclif generate cli-name
```

2. Convert each Commander command to an oclif Command class:
```typescript
import { Command, Flags } from '@oclif/core';

export class ListCommand extends Command {
  static description = 'List all items';
  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    limit: Flags.integer({ default: 50 }),
  };

  async run() {
    const { flags } = await this.parse(ListCommand);
    // ... implementation
  }
}
```

3. Move configuration to oclif config system.

4. Add shell completions if needed.

5. Run all tests against the new structure.

## Checklist

Before completing an upgrade:
- [ ] All existing commands work identically
- [ ] `--help` output is correct
- [ ] `--json` output unchanged
- [ ] Tests pass
- [ ] README updated with new capabilities
