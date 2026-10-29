import pytest
from backend.app.services.score import (
    SCORE_METHOD,
    calculate_night_honor_score,
)


def test_score_method_string() -> None:
    expected = (
        "v1: 0.6*clear_sky + 0.2*dryness + 0.2*visibility(capped 20 km); "
        "weights 0.75/0.25 if visibility is null; ignores moon and light pollution"
    )
    assert SCORE_METHOD == expected


def test_score_all_clear() -> None:
    # 0 cloud, 0 humidity, full visibility >= 20km -> 100
    score = calculate_night_honor_score(cloud_cover=0.0, humidity=0.0, visibility_km=25.0)
    assert score == 100


def test_score_fully_overcast() -> None:
    # 100 cloud, 100 humidity, 0 visibility -> 0
    score = calculate_night_honor_score(cloud_cover=100.0, humidity=100.0, visibility_km=0.0)
    assert score == 0


def test_score_null_visibility() -> None:
    # Null visibility uses 0.75 clear_sky + 0.25 dryness
    # 0 cloud, 0 humidity -> 100
    assert calculate_night_honor_score(cloud_cover=0.0, humidity=0.0, visibility_km=None) == 100

    # 100 cloud, 100 humidity -> 0
    assert calculate_night_honor_score(cloud_cover=100.0, humidity=100.0, visibility_km=None) == 0

    # 20 cloud, 40 humidity: 0.75*80 + 0.25*60 = 60 + 15 = 75
    assert calculate_night_honor_score(cloud_cover=20.0, humidity=40.0, visibility_km=None) == 75


def test_score_contract_sample() -> None:
    # cloud=23, humidity=55, vis=24.1 -> 75
    # 0.6*(100-23) + 0.2*(100-55) + 0.2*100 = 46.2 + 9 + 20 = 75.2 -> 75
    score = calculate_night_honor_score(cloud_cover=23.0, humidity=55.0, visibility_km=24.1)
    assert score == 75


def test_score_clamping() -> None:
    # Values outside standard ranges are safely clamped
    score_low = calculate_night_honor_score(cloud_cover=150.0, humidity=120.0, visibility_km=-5.0)
    assert score_low == 0

    score_high = calculate_night_honor_score(cloud_cover=-20.0, humidity=-30.0, visibility_km=50.0)
    assert score_high == 100
