type Command = any

const UniswapV4Commands:Command[] = ['v4_swap', 'v4_add_liquidity']
const AaveV3Commands:Command[] = ['v3_lend', 'v3_borrow']

export const π = (command: Command) => command.protocol ?? "core"


export const σ = (protocol: string): Record<string, Command> => {
  switch (protocol) {
    case "uniswap-v4": return UniswapV4Commands
    case "aave-v3": return AaveV3Commands
    default: return {}
  }
}