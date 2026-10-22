from ocelescope_module_opid_conformance.domain.models.base import Model


class AlignerStatus(Model):
    """Whether alignments can be computed, and where the aligner is looked for."""

    available: bool
    location: str
