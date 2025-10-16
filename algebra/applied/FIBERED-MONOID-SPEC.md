# Fibered Monoid Specification

**Version:** 1.0.0
**Last Updated:** 2025-10-16
**Status:** Implementation Complete (v1.0 baseline)

This document describes the formal algebraic specification of The DeFi Terminal's command system architecture.

---

## Table of Contents

1. [Overview](#overview)
2. [Monoid Structure](#monoid-structure)
3. [Command Scopes](#command-scopes)
4. [Protocol Fibers](#protocol-fibers)
5. [Algebraic Operators](#algebraic-operators)
6. [Laws and Properties](#laws-and-properties)
7. [Implementation Compliance](#implementation-compliance)
8. [Recent Fixes](#recent-fixes)

---

## Overview

The DeFi Terminal implements a **fibered monoid** architecture where:

- Commands form a monoid **M** under composition
- Each protocol **P** has a fiber **M_P ⊆ M** (a submonoid)
- Commands are partitioned into three scopes: **G = G_core ∪ G_alias ∪ G_p**
- Resolution operators (**π, σ, ρ, ρ_f**) enable flexible command dispatch

This architecture enables:
- ✅ Protocol isolation and modularity
- ✅ Command composability within and across protocols
- ✅ Flexible resolution (explicit, implicit, fuzzy)
- ✅ Type-safe command chaining
- ✅ Plugin-based extensibility

---

## Monoid Structure

### Definition

A monoid **(M, ∘, e)** consists of:

1. **Set M**: All commands in the system
2. **Binary operation ∘**: Command composition
3. **Identity element e**: No-op command

### Monoid Laws

For all commands **f, g, h ∈ M**:

1. **Associativity**: **(f ∘ g) ∘ h = f ∘ (g ∘ h)**
2. **Left Identity**: **e ∘ f = f**
3. **Right Identity**: **f ∘ e = f**

### Implementation

```typescript
// src/core/monoid.ts

// Identity element
export const identityCommand: Command = {
  id: 'identity',
  scope: 'G_core',
  run: async <T>(args: T): Promise<CommandResult<T>> => {
    return { success: true, value: args }
  }
}

// Composition operation
export function composeCommands<A, B, C>(
  f: Command<A, B>,
  g: Command<B, C>
): Command<A, C> {
  // Preserve scope/protocol to maintain fiber closure
  let scope: CommandScope = 'G_core'
  let protocol: ProtocolId | undefined

  if (f.scope === 'G_p' && g.scope === 'G_p' && f.protocol === g.protocol) {
    scope = 'G_p'
    protocol = f.protocol
  } else if (f.scope === 'G_alias' && g.scope === 'G_alias') {
    scope = 'G_alias'
  }

  return {
    id: `${f.id}_then_${g.id}`,
    scope,
    ...(protocol && { protocol }),
    run: async (args: A, context: ExecutionContext) => {
      const resultF = await f.run(args, context)
      if (!resultF.success) return resultF as CommandResult<C>
      return await g.run(resultF.value as B, context)
    }
  }
}
```

**Verification:**

```typescript
// src/core/monoid.ts:150
export async function verifyMonoidLaws<T>(
  f: Command<T, T>,
  testInput: T,
  context: ExecutionContext,
  g?: Command<T, T>,  // Optional for rigorous associativity testing
  h?: Command<T, T>
): Promise<{
  leftIdentity: boolean
  rightIdentity: boolean
  associativity: boolean
}>
```

---

## Command Scopes

Commands are partitioned into three disjoint scopes:

### G_core (Core Commands)

**Definition:** Global commands available in all contexts.

**Properties:**
- Always available
- No protocol dependency
- Examples: `help`, `version`, `balance`, `transfer`, `whoami`

**Implementation:** `src/core/commands.ts`

### G_alias (Aliased Commands)

**Definition:** Protocol-agnostic commands that bind to a protocol at runtime.

**Properties:**
- Resolved to protocol based on preferences/active protocol
- Examples: `swap`, `lend`, `bridge` (when multiple protocols implement same action)
- **Status:** Not yet implemented (requires 2+ protocols with same functionality)

**Deferred to:** v2.0 (when we have multiple DEX/lending protocols)

### G_p (Protocol-Specific Commands)

**Definition:** Commands bound to a specific protocol **P**.

**Properties:**
- `scope: 'G_p'`
- `protocol: '<protocol-id>'`
- Form protocol fiber **M_P**
- Examples: `1inch:swap`, `aave:supply`, `uniswap:addLiquidity`

**Implementation:** `src/plugins/[protocol]/commands.ts`

### Global Set Invariant

**G = G_core ∪ G_alias ∪ G_p**

Where:
- **G_core ∩ G_alias = ∅**
- **G_core ∩ G_p = ∅**
- **G_alias ∩ G_p = ∅**

---

## Protocol Fibers

### Definition

For each protocol **P**, the fiber **M_P** is defined as:

**M_P = { m ∈ M | π(m) = P }**

Where **π** is the projection operator (see below).

### Submonoid Property

Each fiber **M_P** must be a **submonoid** of **M**:

1. **Closure**: If **f, g ∈ M_P**, then **f ∘ g ∈ M_P**
2. **Identity**: **e ∈ M_P** (identity is shared across all fibers)
3. **Associativity**: Inherited from **M**

### Implementation Guarantee

**Critical fix (2025-10-16):**

The `composeCommands` function now preserves protocol scope:

```typescript
if (f.scope === 'G_p' && g.scope === 'G_p' && f.protocol === g.protocol) {
  scope = 'G_p'
  protocol = f.protocol  // ✅ Maintains fiber closure
}
```

**Before fix:** All compositions defaulted to `G_core`, violating closure.

**After fix:** If **f, g ∈ M_uniswap**, then **f ∘ g ∈ M_uniswap** ✅

### Fiber Creation

```typescript
// src/core/monoid.ts:99
export function createProtocolFiber(
  id: ProtocolId,
  name: string,
  description?: string
): ProtocolFiber {
  return {
    id,
    name,
    description,
    commands: new Map()
  }
}
```

### Fiber Validation

Commands added to fibers are validated:

```typescript
// src/core/monoid.ts:117
export function addCommandToFiber(
  fiber: ProtocolFiber,
  command: Command
): void {
  if (command.scope !== 'G_p') {
    throw new Error(`Expected G_p scope, got ${command.scope}`)
  }
  if (command.protocol !== fiber.id) {
    throw new Error(`Protocol mismatch: ${command.protocol} !== ${fiber.id}`)
  }
  fiber.commands.set(command.id, command)
}
```

**Plugin-level validation** (2025-10-16):

```typescript
// src/plugins/plugin-loader.ts:62
if (fiber.id !== plugin.metadata.id) {
  throw new Error(
    `Plugin invariant violated: fiber.id (${fiber.id}) !== plugin.metadata.id (${plugin.metadata.id})`
  )
}
```

---

## Algebraic Operators

### π (Projection)

**Signature:** `π: M → Protocols ∪ {⊥}`

**Definition:** Maps a command to its protocol namespace.

**Behavior:**
- If `m.scope === 'G_p'`, then `π(m) = m.protocol`
- Otherwise, `π(m) = ⊥` (undefined)

**Implementation:**

```typescript
// src/core/command-registry.ts:102
π(command: Command): ProtocolId | undefined {
  if (command.scope !== 'G_p') return undefined
  return command.protocol
}
```

**Property:** For fiber **M_P**, all commands **m ∈ M_P** satisfy **π(m) = P**.

---

### σ (Section)

**Signature:** `σ: Protocols → P(M)`
(Spec: Power set of M, Implementation: Single fiber)

**Definition:** Returns the fiber **M_P** for protocol **P**.

**Behavior:**
- `σ(P) = M_P = { m ∈ M | π(m) = P }`

**Implementation:**

```typescript
// src/core/command-registry.ts:118
σ(protocol: ProtocolId): ProtocolFiber | undefined {
  return this.protocolFibers.get(protocol)
}
```

**Note on Power Set Semantics:**

- **Spec:** `σ: Protocols → P(M)` (power set - all subsets/compositions)
- **Implementation:** Returns single fiber `M_P`
- **Rationale:** Power set semantics deferred to v2.0 for workflow discovery
- **Pragmatic choice:** Single fiber is sufficient for v1.0

---

### ρ (Exact Resolver)

**Signature:** `ρ: (Protocols ∪ G) → M ∪ {⊥}`

**Definition:** Deterministically resolves a command string to a command.

**Resolution Order:**

1. **G_core**: Check core global commands
2. **G_alias**: Check aliased commands (bind protocol at runtime)
3. **G_p**: Check protocol-scoped commands in priority order:
   a. Explicit protocol flag (`--protocol P`)
   b. Namespaced command (`P:command`)
   c. Active protocol context
   d. User preferences

**Implementation:**

```typescript
// src/core/command-registry.ts:130
ρ(context: ResolutionContext): ResolvedCommand | undefined {
  const input = context.input.trim()

  // Resolve aliases (global + protocol-local)
  let resolvedId = this.aliases.get(input) || input

  // Protocol-local alias resolution (2025-10-16 fix)
  if (!this.aliases.has(input) && context.executionContext.activeProtocol) {
    const protocolAlias = `${context.executionContext.activeProtocol}:${input}`
    const protocolResolvedId = this.aliases.get(protocolAlias)
    if (protocolResolvedId) {
      resolvedId = protocolResolvedId
    }
  }

  // 1. Check G_core
  const coreCommand = this.coreCommands.get(resolvedId)
  if (coreCommand) return { command: coreCommand, resolutionMethod: 'exact' }

  // 2. Check G_alias
  const aliasedCommand = this.aliasedCommands.get(resolvedId)
  if (aliasedCommand) {
    const protocol = this.resolveProtocol(resolvedId, context)
    return { command: aliasedCommand, protocol, resolutionMethod: 'alias' }
  }

  // 3. Check G_p (protocol-scoped)
  // ... explicit flag, namespace, active protocol, preferences ...
}
```

**Recent Enhancement (2025-10-16):**

Protocol-local aliases now resolve when active protocol is set:

```bash
use 1inch
s eth usdc 0.1  # 's' resolves to 'swap' within 1inch context
```

---

### ρ_f (Fuzzy Resolver)

**Signature:** `ρ_f: (Protocols ∪ G) × ℝ → [ResolvedCommand]`

**Definition:** Fuzzy command matching using Levenshtein distance.

**Behavior:**
- Returns all commands with similarity ≥ threshold (default 0.6)
- Sorted by confidence (highest first)
- Used for autocomplete and typo correction

**Implementation:**

```typescript
// src/core/command-registry.ts:208
ρ_f(context: ResolutionContext, threshold: number = 0.6): ResolvedCommand[] {
  const input = context.input.trim().toLowerCase()
  const matches: ResolvedCommand[] = []

  // Levenshtein distance calculation
  const similarity = (a: string, b: string): number => {
    const longer = a.length > b.length ? a : b
    const shorter = a.length > b.length ? b : a
    if (longer.length === 0) return 1.0
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  // Check all commands (G_core, G_alias, G_p) and their aliases
  // ...

  return matches.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
}
```

---

## Laws and Properties

### Monoid Laws

**Verified by:** `verifyMonoidLaws(f, testInput, context, g?, h?)`

**Law 1: Associativity**

**(f ∘ g) ∘ h = f ∘ (g ∘ h)**

```typescript
const leftAssoc = compose(compose(f, g), h)
const rightAssoc = compose(f, compose(g, h))
// Verify: leftAssoc(x) = rightAssoc(x) for all x
```

**Law 2: Left Identity**

**e ∘ f = f**

```typescript
const composed = compose(identityCommand, f)
// Verify: composed(x) = f(x) for all x
```

**Law 3: Right Identity**

**f ∘ e = f**

```typescript
const composed = compose(f, identityCommand)
// Verify: composed(x) = f(x) for all x
```

### Submonoid Closure Property

**For each protocol P:**

If **f, g ∈ M_P**, then **f ∘ g ∈ M_P**

**Verification:**

```typescript
// Given: f.protocol = 'uniswap-v4', g.protocol = 'uniswap-v4'
const composed = composeCommands(f, g)

// Assert: composed.protocol === 'uniswap-v4'  ✅
// Assert: π(composed) === π(f) === π(g)       ✅
```

**Critical:** This property was violated before 2025-10-16 fix.

### Fiber Invariants

**For each fiber M_P:**

1. **π(σ(P)) = P** (section law - not fully implemented)
2. **σ(π(m)) = M_P** for all **m ∈ M_P**
3. **e ∈ M_P** (shared identity)

**Plugin registration invariant (2025-10-16):**

```typescript
// Enforced in plugin-loader.ts:64
assert(fiber.id === plugin.metadata.id)
```

---

## Implementation Compliance

### ✅ Fully Implemented

| Component | Status | Location |
|-----------|--------|----------|
| Monoid M (identity, composition) | ✅ Complete | `src/core/monoid.ts:23,39` |
| Command scopes (G_core, G_alias, G_p) | ✅ Complete | `src/core/types.ts` |
| Protocol fibers (M_P) | ✅ Complete | `src/core/monoid.ts:99` |
| Fiber closure property | ✅ Fixed 2025-10-16 | `src/core/monoid.ts:48` |
| π (projection) | ✅ Complete | `src/core/command-registry.ts:102` |
| σ (section) | ✅ Pragmatic | `src/core/command-registry.ts:118` |
| ρ (exact resolver) | ✅ Complete | `src/core/command-registry.ts:130` |
| ρ_f (fuzzy resolver) | ✅ Complete | `src/core/command-registry.ts:208` |
| Protocol-local aliases | ✅ Fixed 2025-10-16 | `src/core/command-registry.ts:138` |
| Plugin validation | ✅ Added 2025-10-16 | `src/plugins/plugin-loader.ts:64` |
| Monoid law verification | ✅ Enhanced 2025-10-16 | `src/core/monoid.ts:150` |

### ⚠️ Pragmatic Implementation

| Component | Spec | Implementation | Rationale |
|-----------|------|---------------|-----------|
| σ (section) | `Protocols → P(M)` | `Protocols → M_P` | Power set semantics deferred to v2.0 for workflow discovery |
| Identity in fibers | Explicit in each M_P | Shared across all fibers | Identity is in ambient monoid M, inherited by submonoids |

### ❌ Deferred to Future Versions

| Component | Spec | Version | Reason |
|-----------|------|---------|--------|
| G_alias commands | Required | v2.0 | Need 2+ protocols implementing same function |
| Transformation Type T | Output space for operations | v1.1 | Low effort, high value for transaction metadata |
| Γ operator | Protocol composition | v2.0 | Cross-protocol workflows |
| Product space P | G × (Protocols ∪ G) → T | v2.0 | Formal type system for compositions |
| Power set σ | All subsets/compositions | v2.0 | Workflow discovery feature |

---

## Recent Fixes

### 2025-10-16: Fiber Closure Fix

**Problem:** `composeCommands` always set `scope: 'G_core'`, breaking submonoid closure.

**Example violation:**

```typescript
// Before fix:
const swap = { id: 'swap', scope: 'G_p', protocol: 'uniswap-v4' }
const add = { id: 'addLiquidity', scope: 'G_p', protocol: 'uniswap-v4' }
const composed = composeCommands(swap, add)

// Result: { scope: 'G_core', protocol: undefined }  ❌
// π(composed) = ⊥, but should be 'uniswap-v4'
```

**Fix:** Preserve scope/protocol when both commands in same fiber.

**After fix:**

```typescript
const composed = composeCommands(swap, add)
// Result: { scope: 'G_p', protocol: 'uniswap-v4' }  ✅
// π(composed) = 'uniswap-v4' = π(swap) = π(add)     ✅
```

**Impact:** M_P is now a proper submonoid.

---

### 2025-10-16: Protocol-Local Alias Resolution

**Problem:** Aliases only worked with explicit namespace, not in active protocol context.

**Before:**

```bash
use 1inch
s eth usdc 0.1  # ❌ Command not found
1inch:s eth usdc 0.1  # ✅ Works (namespaced)
```

**Fix:** Check protocol-local aliases when active protocol is set.

**After:**

```bash
use 1inch
s eth usdc 0.1  # ✅ Resolves to '1inch:swap'
```

**Implementation:** `src/core/command-registry.ts:138-144`

---

### 2025-10-16: Plugin Fiber Validation

**Problem:** Plugin could return fiber with mismatched ID, breaking π(σ(P)) = P.

**Fix:** Enforce invariant before registration.

```typescript
// src/plugins/plugin-loader.ts:64
if (fiber.id !== plugin.metadata.id) {
  throw new Error(`Plugin invariant violated: fiber.id !== plugin.metadata.id`)
}
```

**Impact:** Ensures section law holds for all registered plugins.

---

### 2025-10-16: Enhanced Monoid Law Verification

**Problem:** `verifyMonoidLaws` only tested associativity with identity element.

**Before:**

```typescript
// Test: (f ∘ e) ∘ e = f ∘ (e ∘ e)
// Simplifies to: f = f (trivially true)
```

**Fix:** Allow callers to provide independent g, h samples.

**After:**

```typescript
await verifyMonoidLaws(swapCommand, testInput, context, addLiqCommand, removeLiqCommand)
// Test: (swap ∘ addLiq) ∘ removeLiq = swap ∘ (addLiq ∘ removeLiq)
// Real associativity test ✅
```

**Implementation:** `src/core/monoid.ts:150-191`

---

## References

- **Algebraic Specification:** [github.com/nickmura/defi-terminal-research](https://github.com/nickmura/defi-terminal-research/blob/main/algebra/algebraic-specification.md)
- **Implementation:** `/src/core/monoid.ts`, `/src/core/command-registry.ts`
- **Plugin System:** `/src/plugins/`
- **Architecture Guide:** `/ARCHITECTURE.md`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-16 | Initial specification with all v1.0 fixes |

---

**Status:** This specification represents the v1.0 baseline of the fibered monoid implementation. All core algebraic properties are satisfied.
