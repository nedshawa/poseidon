---
name: prompt-injection
description: >-
  LLM security testing and prompt injection analysis. Taxonomy of attack types,
  structured testing methodology for AI applications, and defense evaluation.
  For testing systems the operator owns.
---

# Prompt Injection Sub-Skill

Security testing focused on Large Language Model applications. Evaluates
resistance to prompt injection, jailbreaking, and data extraction attacks.

## Workflows

| Workflow | File | Use When |
|---|---|---|
| Attack Taxonomy | `workflows/attack-taxonomy.md` | Understanding attack categories |
| Testing Methodology | `workflows/testing-methodology.md` | Testing an LLM application |

## Scope

This sub-skill tests LLM-powered applications for injection vulnerabilities.
It covers:

- Direct prompt injection (user input manipulates system behavior)
- Indirect prompt injection (external data contains malicious prompts)
- Jailbreak techniques (bypassing safety guidelines)
- Data extraction (leaking system prompts or training data)

## Ethical Boundaries

- Test only systems the operator owns or has authorization to test
- Do not use techniques to cause harm to real users or systems
- Report findings responsibly
- Attacks are documented for defensive purposes

## Key Concepts

- **System prompt**: instructions the developer provides to the LLM
- **User prompt**: input from the end user
- **Injection boundary**: where user input meets system instructions
- **Defense layers**: input filtering, output filtering, instruction hierarchy
