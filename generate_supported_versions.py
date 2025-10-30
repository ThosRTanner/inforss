import json
from pathlib import Path
from win32api import GetFileVersionInfo, LOWORD, HIWORD

def get_version_number(filename):
    """Get the version number of the specified file as a string."""
    info = GetFileVersionInfo(filename, "\\")
    ms = info['ProductVersionMS']
    ls = info['ProductVersionLS']
    return ".".join(map(str, (HIWORD(ms), LOWORD(ms), HIWORD(ls), LOWORD(ls))))

def generate_supported_versions(mappings: list[dict[str: str]]):
    """Update supported_versions.json with current version as minimum."""
    for prog in mappings:
        print("Getting version for " + prog["program"])
        prog["min"] = get_version_number(prog["program"])
    with Path.open("supported_versions.json", "w") as output:
        json.dump(mappings, output)


if __name__ == '__main__':
    mappings = [
            {
                "program": "c:\\Program Files\\Pale Moon\\palemoon.exe",
                "id": "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}",
                "max": "33.*",
            },
            # Note: This is the same uuid as firefox, and does for waterfox as
            # well.
            {
                "program": "C:\\Program Files\\Basilisk\\basilisk.exe",
                "id": "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}",
                "max": "56.*",
            },
            {
                "program": "C:\\Program Files\\SeaMonkey\\seamonkey.exe",
                "id": "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}",
                "max": "2.59.*",
            },
    ]
    generate_supported_versions(mappings)
