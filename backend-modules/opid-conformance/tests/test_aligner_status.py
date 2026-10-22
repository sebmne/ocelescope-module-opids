from api import Api
from conftest import needs_cocomot


@needs_cocomot
def test_the_aligner_is_available(api: Api) -> None:
    status = api.get_aligner_status().json()
    assert status["available"] is True
    assert status["location"].endswith("vendor/cocomot")
