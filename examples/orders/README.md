# Example: orders and products

The running example of Gianola, Montali, Winkler: *Object-Centric Conformance
Alignments with Synchronization* (CAiSE 2024).

| File | What it is |
| --- | --- |
| [`orders-opid.pnml`](orders-opid.pnml) | The OPID of Fig. 3 in oCoCoMoT's PNML format. |
| [`orders-log.jsonocel`](orders-log.jsonocel) | The log of Example 1 (with `pick item` naming the order, as in Example 2), as OCEL 2.0 JSON. |

## The net (Fig. 3)

- **Creating objects:** two silent transitions create orders and products (ν-inscriptions).
- **place order** binds one order `o` and a list of products `P`. It produces the order and
  one token (o, p) per product, so every product from then on remembers its order.
- **payment** moves the order.
- **pick item** moves one (o, p).
- **ship** takes the order together with its products (o, P). Because the tokens carry the
  order, `ship` can only take the products of the order it ships.
- **Final marking:** the places `shipped` and `shipped item` each hold some token.

## The log (Example 1)

| Event | Activity | Objects | Time |
| --- | --- | --- | --- |
| #0 | place order | o1, p1 | 1 |
| #1 | payment | o1 | 3 |
| #2 | pick item | o1, p1 | 2 |
| #3 | place order | o2, p2 | 3 |
| #4 | payment | o2 | 4 |
| #5 | pick item | o2, p2 | 5 |
| #6 | ship | o1, **p2** | 6 |
| #7 | ship | o2, **p1** | 9 |

Times are minutes after 09:00 on 2024-06-03. `pick item` names the order, as in the paper's
Example 2, because the net's `pick item` binds (o, p).

The log is one trace graph: o1, o2, p1, p2. Its alignment costs 8, as in Fig. 4:
- The products are shipped with the wrong order. The object-centric Petri nets of Liss et al.
  align this with cost 0.
- The OPID cannot ship p2 with o1, because p2 is bound to o2. So both `ship` events become log
  moves (2 + 2), and `ship o1, p1` and `ship o2, p2` become model moves (2 + 2).

## Using it

In Ocelescope:
1. Import the default log **Orders (Gianola et al., Example 1)**, or upload `orders-log.jsonocel`.
2. In **OPID Conformance → OPIDs**, open `orders-opid.pnml` (.pnml) and save it.
3. Press Align, then ▶ Align.

`data/event_logs/orders.db` is built from `orders-log.jsonocel` by
`uv run python scripts/build-example-logs.py`.
