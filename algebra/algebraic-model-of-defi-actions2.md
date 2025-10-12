# Algebraic model of decentralized finance actions for agnostic usage


- Generally, there are only a small finite set of primitive operation types for DeFi interactions amongst different protocols (swapping, bridging, transfering, staking, lending, borrowing, etc) 

- But because they're parameterized by protocol, network, token, chain, amounts, signers, & more, there is an infinite amount of combinations

- DeFi actions (trade, swaps, onchain activity, signatures) is composed like a monoid, as associativity, identity element (no-op transaction), closure (gives output of tx), non-invertability

- Only with idealizations, or specific exceptions functions can form groupoids, or more rarely groups (more in a theoretical sense)




# Contextual Definition – Algebraic Model of DeFi Actions
*Oct 10, 2025*

---

## Global Action Model

We define a **global action monoid**:

$$
M = \langle G \rangle
$$

where \( G = \{ \text{swap}, \text{bridge}, \text{transfer}, \dots \} \).

Each generator represents a **command operation**,  
and \( M \) represents the **monoid of all possible composed actions**.

---

## Example: Swap Operation

Let:

$$
\text{swap} \in G
$$

represent the abstract **swap** generator.

A concrete instantiation exists within a **protocol fiber** \( M_P \):

$$
\text{swap}_{\text{uniswap-v4}} \in M_{\text{uniswap-v4}}
$$

So if:

```bash
swap 100 usdc eth --protocol uniswap-v4