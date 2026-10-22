# Example: a perfect alignment the solver misses

A net and a log for which a perfect (cost 0) alignment exists in the sense of Def. 10 of
Gianola et al., while oCoCoMoT returns cost 2. The reason is that the solver orders the events
by timestamp, whereas an alignment only has to respect the trace graph, a partial order.

| File | What it is |
| --- | --- |
| [`opid.pnml`](opid.pnml) | The OPID, in oCoCoMoT's PNML format |
| [`log.jsonocel`](log.jsonocel) | One case, as OCEL 2.0 JSON |

## The reading of Def. 10

Def. 10 is read as the proof of the optimality theorem builds alignments (extended version,
Appendix B, Def. 14). An alignment is a graph of moves with two kinds of edges:

- **Log edges** connect moves whose events are linked in the trace graph T_X. The log projection
  uses only these, and it must be isomorphic to T_X.
- **Model edges** connect moves whose firings are consecutive in the run ρ. The model projection
  uses only these, and it is the chain of ρ.

Together the two kinds of edges must be acyclic.

Equivalently, an alignment is an interleaving of moves whose log side is *some* topological order
of T_X and whose model side is ρ. The encoding, by contrast, only considers the timestamp order
of the events (Section 5: e₁, …, e_m with πtime(e₁) ≤ … ≤ πtime(e_m)). Alignments that need two
unrelated events in the other order are never compared.

## The net

```text
new order ──place order──▶ placed ─┐                     ┌─▶ assigned order ─┐
                                   ├──assign (silent)──┤                     ├──ship──▶ shipped, delivered
new product ───────────────────────┘                     └─▶ assigned product ──pick item──▶ picked ─┘
```

The silent `assign` binds the order and the product: it reserves the product for the order. So
the net puts `place order` before `assign`, and `assign` before `pick item`. In every run,
`place order` fires before `pick item`, although the two share no object.

## The log

| Event | Activity | Objects | Time |
| --- | --- | --- | --- |
| e1 | pick item | p1 | 09:01 |
| e2 | place order | o1 | 09:02 |
| e3 | ship | o1, p1 | 09:03 |

The trace graph orders only the events of each object:
- `pick item → ship` (p1);
- `place order → ship` (o1).

`pick item` and `place order` share no object and stay unordered.

## The perfect alignment

The run `create order, create product, place order, assign, pick item, ship` fires each event's
transition with exactly its objects. Interleave the moves as

| | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| log | ≫ | ≫ | place order | ≫ | pick item | ship |
| model | τ create order | τ create product | place order | τ assign | pick item | ship |

- **The log side** is `place order, pick item, ship`, a topological order of T_X. So the log
  edges `pick item → ship` and `place order → ship` point forward.
- **The model side** is ρ, so the model edges (the chain of ρ) point forward.

The graph is acyclic, every event is a synchronous move, and silent firings cost nothing: **cost 0**.

## What oCoCoMoT returns

The encoding aligns the events in timestamp order: `pick item, place order, ship`. No run fires
`pick item` first: it needs the token that `assign` produces, and `assign` needs `place order`.
The best edit script makes one of the two events a log move and a model move (1 + 1), for
**cost 2**. Which of the two it picks varies; the cost does not.

## Results

| Log | Def. 10, as in the proof | oCoCoMoT |
| --- | --- | --- |
| `pick item` at 09:01, `place order` at 09:02 (this log) | 0 | **2** |
| `place order` at 09:01, `pick item` at 09:02 | 0 | 0 |

The backend test `test_the_solver_misses_alignments_against_the_timestamp_order` pins oCoCoMoT's
column for both logs.

## Using it

In Ocelescope:
1. Import the default log **Order before pick (partial order)**.
2. In **OPID Conformance → OPIDs**, open `opid.pnml` (.pnml) and save it.
3. Press Align, then ▶ Align.

`data/event_logs/partial-order.db` is built from `log.jsonocel` by
`uv run python scripts/build-example-logs.py`.
