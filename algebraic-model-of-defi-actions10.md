# Fibered Monoid of Generators  
*Notes – Oct 10, 2025*

---

## Definition

A **fibered monoid** \( M \) structured over a **base set** of protocols is a surjecture projection

Formally, a **surjective projection** is defined as:

$$
\pi : M \to \mathsf{Protocols}
$$


Such that each**fiber** is given by:

$$
M_P = \pi^{-1}(P)
$$

Example:
- $M_{\text{uniswap-v4}}$
- $M_{\text{aave-v3}}$
- $M_{\text{hyperlane}}$

Each $M_P$ forms a **submonoid** of $M$, and for every submonoid exists a section

$$
\sigma : \mathsf{Protocols} \to M
$$

which is equivalent or satisfies 

$$
\pi(\sigma(P)) = P
$$

This expresses the **section property**, ensuring structural consistency between protocol namespaces and their corresponding command fibers.

---


If you **pick something** with $\sigma$ (chosen or relayed protocol from a specified protocol (chosen protocol)),
and then **throw it back** with $\pi$ (ex. `cd ../` or `exit`),
you end up exactly where you started — in $P$.

### Analogy

| Operation | CLI equivalent | Meaning |
|------------|----------------|----------|
| $\sigma(P)$ | `cd uniswap-v4/` | Enter the fiber for a specific protocol |
| $\pi(m)$ | `cd ../` | Return to the global base (protocol list) |

Thus:
$$
\pi(\sigma(P)) = P
$$
behaves like:
```bash
cd uniswap-v4/
cd ../
# You're back where you started