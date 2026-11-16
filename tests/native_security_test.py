"""Authentication/deny-by-default checks runnable without .NET or namespaces."""
import http.client
import json
import os
from pathlib import Path
import re
import selectors
import subprocess
import sys
import tempfile
import threading
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))
from native_sandbox import sandbox_command, SandboxUnavailable
from native_bridge import NativeWorld
ROOT = Path(__file__).resolve().parents[1]


class SecurityTests(unittest.TestCase):
    def test_launcher_requires_isolation_and_cleans_environment(self):
        with tempfile.TemporaryDirectory() as folder:
            try:
                command = sandbox_command([sys.executable, "hello.py"], folder)
            except SandboxUnavailable:
                self.skipTest("OS isolation backend absent; execution is refused")
            self.assertIn("--unshare-all", command)
            self.assertIn("--disable-userns", command)
            self.assertIn("--clearenv", command)
            self.assertIn("--ro-bind", command)
            self.assertNotIn("--share-net", command)
            self.assertNotIn(str(Path.home()), command)
            self.assertIn("--as=536870912", command)

    def test_native_worker_has_a_persistent_owner_across_http_threads(self):
        world = NativeWorld('/missing/bridge.dll', sys.executable)
        owner_ids, caller_ids = [], []
        world.perform = lambda *_: (owner_ids.append(threading.get_ident()) or 200, {})
        def client():
            caller_ids.append(threading.get_ident())
            self.assertEqual(world.request('/scene', '{}')[0], 200)
        try:
            for _ in range(2):
                thread = threading.Thread(target=client)
                thread.start()
                thread.join(timeout=2)
                self.assertFalse(thread.is_alive())
            self.assertEqual(owner_ids, [world.owner.ident, world.owner.ident])
            self.assertTrue(all(value != world.owner.ident for value in caller_ids))
            self.assertTrue(world.owner.is_alive())
        finally:
            world.close()
        self.assertFalse(world.owner.is_alive())

    def test_csharp_http_mutations_require_launch_token_before_reading_body(self):
        process = subprocess.Popen([sys.executable, str(ROOT / "python/native_bridge.py"), "--assembly", "/missing/WarLike.Bridge.dll", "--dotnet", sys.executable], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            output = b""
            with selectors.DefaultSelector() as selector:
                selector.register(process.stdout, selectors.EVENT_READ)
                for _ in range(100):
                    if selector.select(.1):
                        output += os.read(process.stdout.fileno(), 4096)
                    if b"listening on" in output:
                        break
            self.assertIn(b"listening on", output)
            token = re.search(rb"SESSION C# : ([A-Za-z0-9_-]+)", output).group(1).decode()
            def request(path, *, supplied=None, origin=None, method="POST", body="{}"):
                conn = http.client.HTTPConnection("127.0.0.1", 8765, timeout=3)
                headers = {"Content-Type": "application/json"}
                if supplied is not None:
                    headers["X-WarLike-Token"] = supplied
                if origin is not None:
                    headers["Origin"] = origin
                conn.request(method, path, body, headers)
                response = conn.getresponse()
                data = response.read()
                status = response.status
                conn.close()
                return status, data
            for path in ("/scene", "/scripts/compile", "/frame", "/stop", "/tick", "/components/set", "/squad/command", "/genre/action", "/vehicle/input"):
                self.assertEqual(request(path, body="invalid JSON")[0], 401)
                self.assertEqual(request(path, supplied="wrong")[0], 401)
                self.assertEqual(request(path, supplied=token, origin="null")[0], 403)
            status, health = request("/health", method="GET")
            self.assertEqual(status, 200)
            self.assertTrue(json.loads(health)["authenticationRequired"])
            self.assertNotIn(token.encode(), health)
            self.assertEqual(request("/scene", supplied=token)[0], 503, "unavailable worker must never fall back to unrestricted execution")
        finally:
            process.terminate()
            process.wait(timeout=5)
            process.stdout.close()
            process.stderr.close()


if __name__ == "__main__":
    unittest.main()
