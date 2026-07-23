"""Weather fetching.

Same seam pattern as analyzer.py/body_analyzer.py: a single function the API
calls to get current-conditions data. Today it's Open-Meteo (free, no API
key); swappable for a different/paid provider later without touching
callers, since callers only depend on this dict shape.
"""

import httpx

from config import settings

_WMO_CONDITIONS: dict[int, str] = {
    0: "clear",
    1: "partly_cloudy",
    2: "partly_cloudy",
    3: "cloudy",
    45: "fog",
    48: "fog",
    51: "drizzle",
    53: "drizzle",
    55: "drizzle",
    56: "drizzle",
    57: "drizzle",
    61: "rain",
    63: "rain",
    65: "rain",
    66: "rain",
    67: "rain",
    80: "rain",
    81: "rain",
    82: "rain",
    71: "snow",
    73: "snow",
    75: "snow",
    77: "snow",
    85: "snow",
    86: "snow",
    95: "storm",
    96: "storm",
    99: "storm",
}


class WeatherFetchError(Exception):
    pass


def _wmo_to_condition(code: int | None) -> str:
    if code is None:
        return "unknown"
    return _WMO_CONDITIONS.get(code, "unknown")


def fetch_weather(lat: float, lon: float) -> dict:
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
        "timezone": "auto",
    }
    try:
        response = httpx.get(settings.open_meteo_base_url, params=params, timeout=5.0)
        response.raise_for_status()
        current = response.json()["current"]
    except (httpx.HTTPError, KeyError, ValueError) as e:
        raise WeatherFetchError(str(e)) from e

    return {
        "temperature": current["temperature_2m"],
        "condition": _wmo_to_condition(current.get("weather_code")),
        "humidity": current["relative_humidity_2m"],
        "wind_speed": current["wind_speed_10m"],
        "timestamp": current["time"],
    }
