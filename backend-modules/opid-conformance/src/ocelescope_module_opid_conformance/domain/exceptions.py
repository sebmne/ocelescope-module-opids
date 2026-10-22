class ConformanceError(Exception):
    """Something the user asked for cannot be done. The message says why."""


class InvalidOPID(ConformanceError):
    """A net is no object-centric Petri net with identifiers as oCoCoMoT reads them."""


class UnknownOPID(ConformanceError):
    def __init__(self, opid_id: str) -> None:
        super().__init__(f"There is no OPID {opid_id!r}.")


class UnknownLog(ConformanceError):
    def __init__(self, ocel_id: str) -> None:
        super().__init__(f"There is no event log {ocel_id!r}.")


class UnknownRun(ConformanceError):
    def __init__(self, run_id: str) -> None:
        super().__init__(f"There is no alignment run {run_id!r}.")


class UnknownTraceGraph(ConformanceError):
    def __init__(self, run_id: str, index: int) -> None:
        super().__init__(f"The run {run_id!r} has no trace graph {index}.")


class AlignerUnavailable(ConformanceError):
    """oCoCoMoT is not installed where the module looks for it."""


class UnknownPetriNet(ConformanceError):
    def __init__(self, net_id: str) -> None:
        super().__init__(f"There is no object-centric Petri net {net_id!r}.")
