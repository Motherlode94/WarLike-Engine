"""WarLike Python/C++ local runner smoke checks (stdlib unittest)."""
import shutil
import os
import functools
import tempfile
import time
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))
from script_runner import check_payload, execute, command_for


@functools.lru_cache(maxsize=1)
def isolation_probe():
    return execute("python", "print(42)")


class RunnerTests(unittest.TestCase):
    def setUp(self):
        if self._testMethodName == 'test_rejects_invalid_sources':
            return
        probe = isolation_probe()
        if not probe["ok"]:
            diagnostic = str(probe)
            if os.environ.get("WARLIKE_REQUIRE_SANDBOX") == "1":
                self.fail("OS sandbox must function in CI: " + diagnostic)
            self.skipTest("OS sandbox refused by this host (no unrestricted fallback): " + diagnostic)

    def test_rejects_invalid_sources(self):
        for data in ({}, {"language": "bash", "source": "echo hi"},
                     {"language": "python", "source": ""},
                     {"language": "python", "source": "x" * (65 * 1024)}):
            with self.assertRaises(ValueError):
                check_payload(data)

    def test_python_output_is_real(self):
        result = execute("python", "print(6 * 7)")
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["stage"], "run")
        self.assertEqual(result["run"]["stdout"].strip(), "42")

    @unittest.skipUnless(shutil.which("g++") or shutil.which("clang++"), "Compilateur C++ absent")
    def test_cpp_compiles_and_runs(self):
        result = execute("cpp", '#include <iostream>\nint main(){std::cout << 42 << "\\n"; return 0;}')
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["run"]["stdout"].strip(), "42")

    @unittest.skipUnless(shutil.which("g++") or shutil.which("clang++"), "Compilateur C++ absent")
    def test_cpp_compilation_diagnostics(self):
        result = execute("cpp", "int main( {")
        self.assertFalse(result["ok"])
        self.assertEqual(result["stage"], "compile")
        self.assertTrue(result["compile"]["stderr"])

    def test_secrets_host_files_and_network_are_unavailable(self):
        os.environ["WARLIKE_TEST_SECRET"] = "parent-secret"
        with tempfile.NamedTemporaryFile() as secret:
            source = "import os,socket\n" + "assert os.environ.get('WARLIKE_TEST_SECRET') is None\n" + "assert not os.path.exists("+repr(secret.name)+")\n" + "s=socket.socket()\n" + "try:\n s.connect(('127.0.0.1',8891))\n raise AssertionError('host network reachable')\nexcept OSError:\n print('blocked')\n"
            result = execute("python", source)
            self.assertTrue(result["ok"], result)
            self.assertEqual(result["run"]["stdout"].strip(), "blocked")
        del os.environ["WARLIKE_TEST_SECRET"]

    def test_output_and_cpu_are_bounded(self):
        start = time.monotonic()
        result = execute("python", "while True: print('x'*8192)")
        self.assertFalse(result["ok"])
        self.assertTrue(result["run"]["truncated"])
        self.assertLessEqual(len(result["run"]["stdout"]), 48*1024)
        result = execute("python", "while True: pass")
        self.assertFalse(result["ok"])
        self.assertIn("Délai", result["run"]["stderr"])
        self.assertLess(time.monotonic()-start, 8)

    def test_memory_limit_and_readonly_source(self):
        result = execute("python", "try:\n x=bytearray(1024**3)\nexcept MemoryError:\n print('bounded')")
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["run"]["stdout"].strip(), "bounded")
        result = execute("python", "from pathlib import Path\ntry:\n Path(__file__).write_text('modified')\nexcept OSError:\n print('readonly')")
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["run"]["stdout"].strip(), "readonly")


if __name__ == "__main__":
    unittest.main()
