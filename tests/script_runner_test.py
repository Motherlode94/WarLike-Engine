"""WarLike Python/C++ local runner smoke checks (stdlib unittest)."""
import shutil
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))
from script_runner import check_payload, execute, command_for


class RunnerTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
