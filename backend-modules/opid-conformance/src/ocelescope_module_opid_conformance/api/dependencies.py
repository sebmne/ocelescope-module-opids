"""Composition root: the only place that knows which adapter implements which port."""

from typing import Annotated

from fastapi import Depends
from ocelescope_backend.app.dependencies import ApiSession

from ocelescope_module_opid_conformance.application.ports.aligner import Aligner
from ocelescope_module_opid_conformance.application.ports.job_registry import JobRegistry
from ocelescope_module_opid_conformance.application.ports.opid_repository import OPIDRepository
from ocelescope_module_opid_conformance.application.ports.run_repository import RunRepository
from ocelescope_module_opid_conformance.application.use_cases.cancel_run import CancelRun
from ocelescope_module_opid_conformance.application.use_cases.convert_petri_net import ConvertPetriNet
from ocelescope_module_opid_conformance.application.use_cases.delete_run import DeleteRun
from ocelescope_module_opid_conformance.application.use_cases.get_aligner_status import GetAlignerStatus
from ocelescope_module_opid_conformance.application.use_cases.get_opid import GetOPID
from ocelescope_module_opid_conformance.application.use_cases.get_run import GetRun
from ocelescope_module_opid_conformance.application.use_cases.get_trace_graph import GetTraceGraph
from ocelescope_module_opid_conformance.application.use_cases.list_opids import ListOPIDs
from ocelescope_module_opid_conformance.application.use_cases.list_petri_nets import ListPetriNets
from ocelescope_module_opid_conformance.application.use_cases.list_runs import ListRuns
from ocelescope_module_opid_conformance.application.use_cases.read_pnml import ReadPNML
from ocelescope_module_opid_conformance.application.use_cases.save_opid import SaveOPID
from ocelescope_module_opid_conformance.application.use_cases.start_run import StartRun
from ocelescope_module_opid_conformance.infrastructure.adapters.cocomot_aligner import CocomotAligner
from ocelescope_module_opid_conformance.infrastructure.adapters.ocelescope_event_log_source import (
    OcelescopeEventLogSource,
)
from ocelescope_module_opid_conformance.infrastructure.adapters.ocelescope_opid_repository import (
    OcelescopeOPIDRepository,
)
from ocelescope_module_opid_conformance.infrastructure.adapters.ocelescope_petri_net_source import (
    OcelescopePetriNetSource,
)
from ocelescope_module_opid_conformance.infrastructure.adapters.pnml_opid_reader import PnmlOPIDReader
from ocelescope_module_opid_conformance.infrastructure.adapters.session_job_registry import SessionJobRegistry
from ocelescope_module_opid_conformance.infrastructure.adapters.session_run_repository import SessionRunRepository
from ocelescope_module_opid_conformance.infrastructure.adapters.sse_run_notifier import SseRunNotifier


def get_aligner() -> Aligner:
    return CocomotAligner()


def get_opid_repository(session: ApiSession) -> OPIDRepository:
    return OcelescopeOPIDRepository(session)


def get_run_repository(session: ApiSession) -> RunRepository:
    return SessionRunRepository(session)


def get_job_registry(session: ApiSession) -> JobRegistry:
    return SessionJobRegistry(session)


Opids = Annotated[OPIDRepository, Depends(get_opid_repository)]
Runs = Annotated[RunRepository, Depends(get_run_repository)]
Jobs = Annotated[JobRegistry, Depends(get_job_registry)]


def get_aligner_status(aligner: Annotated[Aligner, Depends(get_aligner)]) -> GetAlignerStatus:
    return GetAlignerStatus(aligner=aligner)


def get_read_pnml() -> ReadPNML:
    return ReadPNML(reader=PnmlOPIDReader())


def get_convert_petri_net(session: ApiSession) -> ConvertPetriNet:
    return ConvertPetriNet(nets=OcelescopePetriNetSource(session))


def get_list_petri_nets(session: ApiSession) -> ListPetriNets:
    return ListPetriNets(nets=OcelescopePetriNetSource(session))


def get_save_opid(opids: Opids) -> SaveOPID:
    return SaveOPID(opids=opids)


def get_list_opids(opids: Opids) -> ListOPIDs:
    return ListOPIDs(opids=opids)


def get_get_opid(opids: Opids) -> GetOPID:
    return GetOPID(opids=opids)


def get_start_run(
    session: ApiSession,
    opids: Opids,
    runs: Runs,
    jobs: Jobs,
    aligner: Annotated[Aligner, Depends(get_aligner)],
) -> StartRun:
    return StartRun(
        opids=opids,
        logs=OcelescopeEventLogSource(session),
        aligner=aligner,
        runs=runs,
        jobs=jobs,
        notifier=SseRunNotifier(session.id),
    )


def get_list_runs(runs: Runs) -> ListRuns:
    return ListRuns(runs=runs)


def get_get_run(runs: Runs) -> GetRun:
    return GetRun(runs=runs)


def get_get_trace_graph(runs: Runs) -> GetTraceGraph:
    return GetTraceGraph(runs=runs)


def get_cancel_run(runs: Runs, jobs: Jobs) -> CancelRun:
    return CancelRun(runs=runs, jobs=jobs)


def get_delete_run(runs: Runs, jobs: Jobs) -> DeleteRun:
    return DeleteRun(runs=runs, jobs=jobs)
