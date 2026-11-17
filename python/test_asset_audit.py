"""Standard-library tests for GLB metadata validation."""
import json
import struct
import tempfile
import unittest
from pathlib import Path

from asset_audit import inspect_glb


def glb(payload):
    data = json.dumps(payload, separators=(",", ":")).encode()
    data += b" " * ((4 - len(data) % 4) % 4)
    return struct.pack("<4sII", b"glTF", 2, 20 + len(data)) + struct.pack("<II", len(data), 0x4E4F534A) + data


class AssetAuditTests(unittest.TestCase):
    def test_valid_glb_metadata(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "mesh.glb"
            path.write_bytes(glb({"asset": {"version": "2.0"}, "meshes": [{}], "skins": [], "animations": []}))
            result = inspect_glb(path)
            self.assertTrue(result["ok"])
            self.assertEqual(result["counts"]["meshes"], 1)
            self.assertIn("No skin: not proven rigged", result["warnings"])

    def test_rejects_invalid_length(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "broken.glb"
            path.write_bytes(glb({"asset": {"version": "2.0"}}) + b"extra")
            self.assertFalse(inspect_glb(path)["ok"])


if __name__ == "__main__":
    unittest.main()
