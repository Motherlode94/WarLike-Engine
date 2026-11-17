#!/usr/bin/env python3
"""Audit local .glb assets without external dependencies or executing content.

Outputs JSON describing glTF 2.0 mesh/material/skin/animation presence.
No modifications to assets; intended for WarLike Editor/Library build pipeline.
"""
import argparse
import json
import struct
import sys
from pathlib import Path

GLB_MAGIC = b"glTF"
JSON_CHUNK = 0x4E4F534A
MAX_FILE = 64 * 1024 * 1024


def inspect_glb(path: Path):
    result = {"path": str(path), "ok": False, "errors": [], "warnings": []}
    try:
        size = path.stat().st_size
        if size > MAX_FILE:
            raise ValueError(f"GLB larger than {MAX_FILE} bytes")
        with path.open("rb") as stream:
            header = stream.read(12)
            if len(header) != 12:
                raise ValueError("Incomplete GLB header")
            magic, version, declared_length = struct.unpack("<4sII", header)
            if magic != GLB_MAGIC or version != 2 or declared_length != size:
                raise ValueError("Invalid GLB 2.0 header or declared length")
            chunk_header = stream.read(8)
            if len(chunk_header) != 8:
                raise ValueError("Missing JSON chunk")
            chunk_length, chunk_type = struct.unpack("<II", chunk_header)
            if chunk_type != JSON_CHUNK or chunk_length % 4 or chunk_length > size - 20:
                raise ValueError("Invalid GLB JSON chunk")
            data = json.loads(stream.read(chunk_length).decode("utf-8").rstrip(" \x00"))
        if data.get("asset", {}).get("version") != "2.0":
            raise ValueError("Unsupported glTF asset version")
        counts = {}
        for key in ("nodes", "meshes", "materials", "textures", "images", "skins", "animations", "cameras"):
            value = data.get(key, [])
            if not isinstance(value, list):
                raise ValueError(f"{key} must be an array")
            counts[key] = len(value)
        result["counts"] = counts
        result["extensionsRequired"] = data.get("extensionsRequired", [])
        if not counts["meshes"]:
            result["warnings"].append("No mesh present")
        if not counts["skins"]:
            result["warnings"].append("No skin: not proven rigged")
        if not counts["animations"]:
            result["warnings"].append("No animation clips")
        if not counts["materials"]:
            result["warnings"].append("No materials")
        result["ok"] = True
    except (OSError, ValueError, UnicodeError, json.JSONDecodeError, struct.error) as exc:
        result["errors"].append(str(exc))
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description="Inspect WarLike GLB assets offline.")
    parser.add_argument("files", nargs="+", type=Path)
    parser.add_argument("--output", type=Path, help="Optional report file")
    args = parser.parse_args(argv)
    reports = [inspect_glb(path) for path in args.files]
    report = {"ok": all(item["ok"] for item in reports), "assets": reports}
    payload = json.dumps(report, indent=2, ensure_ascii=False)
    if args.output:
        args.output.write_text(payload + "\n", encoding="utf-8")
    print(payload)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
