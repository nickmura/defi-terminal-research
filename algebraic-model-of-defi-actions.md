# Algebraic model of decentralized finance actions for agnostic usage


- Generally, there are only a small finite set of primitive operation types for DeFi interactions amongst different protocols (swapping, bridging, transfering, staking, lending, borrowing, etc) 

- But because they're parameterized by protocol, network, token, chain, amounts, signers, & more, there is an infinite amount of combinations

- DeFi actions (trade, swaps, onchain activity, signatures) is composed like a monoid, as associativity, identity element (no-op transaction), closure (gives output of tx), non-invertability

- Only with idealizations, or specific exceptions functions can form groupoids, or more rarely groups (more in a theoretical sense)




