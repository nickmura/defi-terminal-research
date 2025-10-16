# The DeFi Terminal - Fibered Monoid Architecture

## Overview

The DeFi Terminal is built on a **fibered monoid** architecture where different DeFi protocols are organized as separate algebraic structures (fibers) that can be composed together.

## Core Concepts

### Command Scopes

Commands are organized into three scopes:

1. **G_core** - Core global commands (help, version, wallet, balance, etc.)
2. **G_alias** - Protocol-agnostic aliases (swap, lend, bridge) - bound at runtime
3. **G_p** - Protocol-specific commands within protocol fibers

### Algebraic Operators

The command registry implements four key operators:

- **π (projection)**: Maps commands to their protocol namespace
- **σ (section)**: Returns the protocol fiber M_P = π⁻¹(P)
- **ρ (exact resolver)**: Resolves commands through G_core → G_alias → G_p
- **ρ_f (fuzzy resolver)**: Fuzzy command matching using Levenshtein distance

## Directory Structure

```
src/
├── core/                           # Core monoid system
│   ├── types.ts                    # Type definitions for monoid architecture
│   ├── monoid.ts                   # Base monoid operations
│   ├── command-registry.ts         # π, σ, ρ, ρ_f operators
│   ├── commands.ts                 # G_core commands
│   └── index.ts                    # Exports
│
├── plugins/                        # Protocol plugins (fibers)
│   ├── _template/                  # Template for new protocols
│   │   ├── index.ts               # Plugin entry point
│   │   ├── commands.ts            # G_p commands for this protocol
│   │   ├── types.ts               # Protocol-specific types
│   │   └── README.md              # Documentation
│   │
│   ├── uniswap-v4/                # Example: Uniswap v4 plugin
│   ├── aave-v3/                   # Example: Aave v3 plugin
│   ├── wormhole/                  # Example: Wormhole bridge plugin
│   │
│   ├── types.ts                   # Plugin interface definitions
│   ├── plugin-loader.ts           # Dynamic plugin loading
│   └── index.ts                   # Plugin exports
│
├── app/                           # Next.js app directory
│   ├── api/                       # API routes for protocols
│   │   ├── _template/             # API route templates
│   │   │   ├── quote/route.ts    # Example: read-only endpoint
│   │   │   ├── swap/route.ts     # Example: write endpoint
│   │   │   └── action/route.ts   # Generic template
│   │   │
│   │   ├── [protocol]/            # Protocol-specific API routes
│   │   │   └── [action]/
│   │   │       └── route.ts       # Next.js route handler
│   │   │
│   │   └── README.md              # API architecture docs
│   │
│   ├── layout.tsx                 # Root layout with providers
│   ├── providers.tsx              # Wagmi & RainbowKit providers
│   ├── page.tsx                   # Main page
│   └── globals.css                # Global styles
│
├── components/
│   └── terminal.tsx               # Terminal UI component
│
└── lib/
    ├── wagmi-config.ts            # Wagmi/RainbowKit configuration
    └── api-client.ts              # API client utilities
```

## Protocol Plugin Architecture

### Plugin Structure

Each protocol plugin follows this structure:

```typescript
// src/plugins/[protocol-id]/index.ts
export const protocolPlugin: Plugin = {
  metadata: {
    id: 'protocol-id',
    name: 'Protocol Name',
    version: '1.0.0',
    // ...
  },

  async initialize(context): Promise<ProtocolFiber> {
    const fiber = createProtocolFiber(...)
    addCommandToFiber(fiber, command1)
    addCommandToFiber(fiber, command2)
    return fiber
  },

  // cleanup, validateConfig, healthCheck...
}
```

### Commands (G_p scope)

```typescript
// src/plugins/[protocol-id]/commands.ts
import { callProtocolApi } from '@/lib/api-client'

export const swapCommand: Command = {
  id: 'swap',
  scope: 'G_p',
  protocol: 'protocol-id',

  async run(args, context) {
    // Call backend API
    const response = await callProtocolApi('protocol-id', 'swap', {
      body: { /* params */ }
    })

    return apiToCommandResult(response)
  }
}
```

### API Routes

```typescript
// src/app/api/[protocol-id]/[action]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Protocol logic here
  const result = await performAction(body)

  return NextResponse.json({
    success: true,
    data: result
  })
}
```

## Command Resolution Flow

1. User types command: `swap USDC ETH 100`
2. Terminal calls `registry.ρ()` to resolve command
3. Resolution order:
   - Check G_core (core commands)
   - Check G_alias (aliases bound to active protocol)
   - Check G_p (current protocol's fiber)
   - Check G_p with explicit protocol flag: `swap --protocol uniswap-v4`
4. Command executes → calls API endpoint → returns result
5. Terminal formats and displays result

## API Integration Pattern

```
┌─────────────┐
│   Command   │  (G_p scope in plugin)
│  (Client)   │
└──────┬──────┘
       │ callProtocolApi()
       ↓
┌─────────────┐
│ API Client  │  (src/lib/api-client.ts)
│   Helper    │
└──────┬──────┘
       │ fetch('/api/[protocol]/[action]')
       ↓
┌─────────────┐
│  API Route  │  (src/app/api/[protocol]/[action]/route.ts)
│  (Server)   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Protocol   │  (External RPC, SDK, Smart Contracts)
│   Backend   │
└─────────────┘
```

## Creating a New Protocol Plugin

1. **Copy Template**
   ```bash
   cp -r src/plugins/_template src/plugins/your-protocol
   cp -r src/app/api/_template src/app/api/your-protocol
   ```

2. **Update Plugin Metadata** (`src/plugins/your-protocol/index.ts`)
   - Set protocol ID, name, version
   - Add configuration defaults

3. **Implement Commands** (`src/plugins/your-protocol/commands.ts`)
   - Define G_p commands
   - Each command calls corresponding API endpoint

4. **Create API Routes** (`src/app/api/your-protocol/`)
   - Implement route handlers for each action
   - Follow standard response format: `{ success, data/error }`

5. **Load Plugin**
   ```typescript
   import { yourProtocolPlugin } from '@/plugins/your-protocol'
   await pluginLoader.loadPlugin(yourProtocolPlugin, config, context)
   ```

## Command Usage Examples

```bash
# Core commands (G_core)
help
version
balance
whoami

# With active protocol set
use uniswap-v4
swap USDC ETH 100          # Resolves to uniswap-v4:swap

# Explicit protocol
swap USDC ETH 100 --protocol aave-v3

# Namespaced (explicit)
uniswap-v4:swap USDC ETH 100

# Fuzzy autocomplete (Tab key)
sw<Tab>  → suggests: swap, swapCommand, etc.
```

## Wallet Integration

- **RainbowKit** for wallet connection UI
- **Wagmi** for blockchain interactions
- **viem** for utilities (formatUnits, etc.)
- ENS resolution via `useEnsName` hook
- Wallet state synced to ExecutionContext

## Transaction Signing Flow

Commands that require wallet signatures follow an asynchronous pattern with state updates.

### Pattern Overview

```
┌──────────┐
│ Command  │  Returns { success: true, value: { signRequest: true, ... } }
│  Run     │
└────┬─────┘
     │
     ↓
┌──────────┐
│ Terminal │  Detects signRequest → creates temp history item
│ Intercept│
└────┬─────┘
     │
     ↓
┌──────────┐
│  Wallet  │  User signs transaction
│  Sign    │
└────┬─────┘
     │
     ↓
┌──────────┐
│ Terminal │  Updates history item with tx hash/result
│  Update  │
└──────────┘
```

### Example: Transfer Command

```typescript
// src/core/commands.ts
export const transferCommand: Command = {
  id: 'transfer',
  scope: 'G_core',

  async run(args: unknown, context: ExecutionContext): Promise<CommandResult> {
    // Validate wallet connection
    if (!context.wallet.isConnected || !context.wallet.address) {
      return {
        success: false,
        error: new Error('No wallet connected')
      }
    }

    // Parse and validate arguments
    const { amount, toAddress } = parseTransferArgs(args)

    // Return signature request (doesn't sign yet)
    return {
      success: true,
      value: {
        transferRequest: true,  // Flag for terminal to intercept
        amount,
        toAddress,
        fromAddress: context.wallet.address,
        chainId: context.wallet.chainId
      }
    }
  }
}
```

### Terminal Handling

```typescript
// src/components/terminal.tsx
if ('transferRequest' in result.value) {
  // Create temporary history item with "Waiting for signature..."
  const transferTimestamp = new Date()
  setTabs(prev => prev.map(tab => {
    if (tab.id === activeTabId) {
      return {
        ...tab,
        history: [...tab.history, {
          command: inputValue,
          output: ['Waiting for wallet signature...'],
          timestamp: transferTimestamp
        }]
      }
    }
    return tab
  }))

  // Sign transaction
  const hash = await sendTransaction(config, {
    to: valueData.toAddress,
    value: parseEther(valueData.amount)
  })

  // Update history item with result using timestamp
  setTabs(prev => prev.map(tab => {
    if (tab.id === activeTabId) {
      const updatedHistory = tab.history.map(item =>
        item.timestamp === transferTimestamp
          ? { ...item, output: [
              'Transaction sent successfully!',
              `Tx Hash: ${hash}`
            ]}
          : item
      )
      return { ...tab, history: updatedHistory }
    }
    return tab
  }))
}
```

### Key Patterns

1. **Timestamp-based tracking**: Use `timestamp` to identify and update correct history item
2. **Two-phase execution**: Command prepares request → Terminal executes with wallet
3. **Progressive UI updates**: Show "Waiting..." → Update with result
4. **Error handling**: Catch signature rejection and update history accordingly

### Implementing in Plugins

For protocol-specific transactions (swaps, supplies, etc.):

```typescript
export const swapCommand: Command = {
  id: 'swap',
  scope: 'G_p',
  protocol: 'uniswap-v4',

  async run(args, context) {
    // 1. Get quote from API
    const quote = await callProtocolApi('uniswap-v4', 'quote', { body: args })

    // 2. Return transaction request
    return {
      success: true,
      value: {
        transactionRequest: true,  // Generic flag
        tx: quote.data.tx,         // Transaction data
        description: `Swap ${args.amountIn} ${args.tokenIn} → ${args.tokenOut}`
      }
    }
  }
}
```

Terminal checks for `transactionRequest` flag and handles signing flow.

---

## Testing

### Unit Testing Commands

Test commands independently with mock contexts:

```typescript
import { swapCommand } from '@/plugins/uniswap-v4/commands'
import { createExecutionContext } from '@/core/monoid'

describe('swapCommand', () => {
  it('should return error if wallet not connected', async () => {
    const context = createExecutionContext()
    context.wallet.isConnected = false

    const result = await swapCommand.run(
      { from: 'ETH', to: 'USDC', amount: '1' },
      context
    )

    expect(result.success).toBe(false)
    expect(result.error?.message).toContain('wallet')
  })

  it('should call API and return quote', async () => {
    const context = createExecutionContext()
    context.wallet.isConnected = true
    context.wallet.address = '0x1234...'

    const result = await swapCommand.run(
      { from: 'ETH', to: 'USDC', amount: '1' },
      context
    )

    expect(result.success).toBe(true)
    expect(result.value).toHaveProperty('transactionRequest')
  })
})
```

### Testing Monoid Laws

Verify commands satisfy algebraic properties:

```typescript
import { verifyMonoidLaws } from '@/core/monoid'
import { createExecutionContext } from '@/core/monoid'

describe('Monoid laws', () => {
  it('should satisfy associativity', async () => {
    const context = createExecutionContext()
    const testInput = { amount: '1', token: 'ETH' }

    const result = await verifyMonoidLaws(
      swapCommand,
      testInput,
      context,
      addLiquidityCommand,   // g
      removeLiquidityCommand // h
    )

    expect(result.leftIdentity).toBe(true)
    expect(result.rightIdentity).toBe(true)
    expect(result.associativity).toBe(true)
  })
})
```

### Testing Protocol Fibers

Verify submonoid closure:

```typescript
import { composeCommands } from '@/core/monoid'

describe('Protocol fiber closure', () => {
  it('should preserve protocol when composing same-fiber commands', () => {
    const swap = { id: 'swap', scope: 'G_p', protocol: 'uniswap-v4', run: async () => ({}) }
    const addLiq = { id: 'addLiquidity', scope: 'G_p', protocol: 'uniswap-v4', run: async () => ({}) }

    const composed = composeCommands(swap, addLiq)

    expect(composed.scope).toBe('G_p')
    expect(composed.protocol).toBe('uniswap-v4')
  })

  it('should default to G_core for cross-fiber composition', () => {
    const uniswap = { id: 'swap', scope: 'G_p', protocol: 'uniswap-v4', run: async () => ({}) }
    const aave = { id: 'supply', scope: 'G_p', protocol: 'aave-v3', run: async () => ({}) }

    const composed = composeCommands(uniswap, aave)

    expect(composed.scope).toBe('G_core')
    expect(composed.protocol).toBeUndefined()
  })
})
```

### Integration Testing

Test full command resolution flow:

```typescript
import { registry } from '@/core/command-registry'
import { createExecutionContext } from '@/core/monoid'

describe('Command resolution', () => {
  it('should resolve protocol-local alias with active protocol', () => {
    const context = createExecutionContext()
    context.activeProtocol = 'uniswap-v4'

    const resolved = registry.ρ({
      input: 's',  // Alias for 'swap'
      executionContext: context,
      preferences: { defaults: {}, priority: [] }
    })

    expect(resolved).toBeDefined()
    expect(resolved?.command.id).toBe('swap')
    expect(resolved?.protocol).toBe('uniswap-v4')
  })
})
```

### Test Setup

Create `/src/core/__tests__/setup.ts`:

```typescript
import { beforeAll } from '@jest/globals'
import { registerCoreCommands } from '@/core'

beforeAll(() => {
  // Register core commands
  registerCoreCommands()

  // Load test plugins
  // ...
})
```

---

## Formal Specification

For detailed mathematical foundation and algebraic compliance, see:

**[FIBERED-MONOID-SPEC.md](./FIBERED-MONOID-SPEC.md)**

Covers:
- Monoid structure and laws
- Protocol fibers as submonoids
- Algebraic operators (π, σ, ρ, ρ_f)
- Implementation compliance matrix
- Recent fixes and enhancements

---

## Next Steps

1. **Implement first protocol plugin** - 1inch aggregator (migrate from `.draft-plugin-system/`)
2. **Add G_alias commands** - Defer until 2+ protocols implement same function
3. **Enhanced testing** - Set up Jest/Vitest for unit and integration tests
4. **Transaction batching** - Compose multiple operations in single tx
5. **Cross-chain support** - Extend protocol fibers to support multi-chain operations
