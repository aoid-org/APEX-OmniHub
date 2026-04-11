from reliability.cache_hydration import (
    build_replacement_pairs,
    inject_parameters,
    parameterize_steps,
    transform_nested_values,
)


def test_build_replacement_pairs_prefers_longer_matches_first() -> None:
    pairs = build_replacement_pairs({"Paris": "{LOCATION}", "Par": "{PREFIX}"})
    assert pairs[0][0] == "Paris"
    assert pairs[1][0] == "Par"


def test_transform_nested_values_recurses_dicts_and_lists() -> None:
    original = {
        "title": "Flight to {LOCATION}",
        "input": {
            "segments": [
                {"to": "{LOCATION}"},
                "{DATE}",
            ],
            "metadata": {"notes": "Leave on {DATE}"},
        },
        "preserve_number": 5,
    }
    transformed = transform_nested_values(
        original,
        [("{LOCATION}", "Paris"), ("{DATE}", "2026-04-11")],
    )

    assert transformed["title"] == "Flight to Paris"
    assert transformed["input"]["segments"][0]["to"] == "Paris"
    assert transformed["input"]["segments"][1] == "2026-04-11"
    assert transformed["input"]["metadata"]["notes"] == "Leave on 2026-04-11"
    assert transformed["preserve_number"] == 5


def test_inject_parameters_handles_nested_payloads() -> None:
    plan_steps = [
        {
            "id": "step1",
            "input": {
                "destination": "{LOCATION}",
                "itinerary": ["{DATE}", {"city": "{LOCATION}"}],
            },
        }
    ]
    hydrated = inject_parameters(
        plan_steps,
        {"LOCATION": "Tokyo", "DATE": "2026-06-01"},
    )

    assert hydrated[0]["input"]["destination"] == "Tokyo"
    assert hydrated[0]["input"]["itinerary"][0] == "2026-06-01"
    assert hydrated[0]["input"]["itinerary"][1]["city"] == "Tokyo"


def test_parameterize_steps_reverses_injection() -> None:
    plan_steps = [
        {
            "id": "step1",
            "input": {
                "destination": "Paris",
                "notes": "Paris itinerary for Paris",
            },
        }
    ]
    parameterized = parameterize_steps(plan_steps, {"LOCATION": "Paris"})

    assert parameterized[0]["input"]["destination"] == "{LOCATION}"
    assert parameterized[0]["input"]["notes"] == "{LOCATION} itinerary for {LOCATION}"
