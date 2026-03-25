# Trait Guide: Designing Effective Agent Personas

## Why Traits Matter

Research shows that LLMs with expert personas produce outputs preferred 2x more
often than generic responses for domain-specific tasks. A well-composed agent
persona focuses the model's attention on relevant knowledge and reasoning patterns.

## When to Use Personas

**Good fit:**
- Open-ended analysis where perspective matters
- Code review from a specific angle (security, performance, UX)
- Debate and multi-perspective exploration
- Creative brainstorming with constraints

**Poor fit:**
- Factual lookups (what is the capital of France)
- Simple code generation with clear specs
- Mechanical tasks (formatting, renaming, migration)

## The Three-Dimension Model

Agents are composed from three independent dimensions:

**Personality** controls behavioral style -- how the agent approaches problems.
**Expertise** controls domain knowledge -- what the agent knows deeply.
**Approach** controls working method -- how the agent structures its process.

These are multiplicative: personality x expertise x approach = unique perspective.

## Combining Traits Effectively

**Complementary combinations** (recommended):
- analytical + security + adversarial = thorough threat modeler
- creative + product + exploratory = divergent product thinker
- pragmatic + backend + focused = practical performance optimizer

**Intentional tension** (advanced, use deliberately):
- analytical + creative = rigorous innovation (structured brainstorming)
- empathetic + adversarial = constructive criticism (challenges with care)

**Anti-patterns** (avoid):
- More than 3 personality traits = diluted, unfocused persona
- Irrelevant expertise for the task = accuracy drops, hallucination risk
- Conflicting approach + personality without intention = incoherent output

## Examples

| Agent | Personality | Expertise | Approach | Use Case |
|---|---|---|---|---|
| Security Architect | analytical | security, software_architecture | systematic | Threat modeling, secure design |
| Product Challenger | provocative | product | adversarial | Stress-testing product ideas |
| Data Explorer | creative | data_engineering, research | exploratory | Finding insights in datasets |
| Pragmatic Lead | pragmatic, empathetic | backend | collaborative | Team decision-making |

## Tips

1. Start with one trait per dimension -- add complexity only if needed
2. Write a communication style line that captures the agent's voice
3. Test the agent on a real task before committing to the persona
4. Use project scoping to keep specialized agents out of unrelated contexts
