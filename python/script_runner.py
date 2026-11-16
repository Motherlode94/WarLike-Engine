#!/usr/bin/env python3
"""Authenticated loopback runner. User code requires the Linux OS sandbox.
Unsupported or restricted hosts fail closed, with project sources preserved.
"""
import argparse
import hmac
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import tempfile
import threading
from native_sandbox import invoke, SandboxUnavailable, LimitedHTTPServer
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_REQUEST = 128 * 1024
MAX_OUTPUT = 48 * 1024
PORT = 8891
ALLOWED_ORIGINS = {
    "https://warlike-engine.pages.dev",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://127.0.0.1:8765",
    "http://localhost:8765",
    "http://127.0.0.1:8891",
    "http://localhost:8891",
}


def check_payload(data):
    if not isinstance(data, dict):
        raise ValueError("Corps JSON invalide.")
    language = data.get("language")
    if language not in ("python", "cpp"):
        raise ValueError("Langage non pris en charge.")
    source = data.get("source")
    if not isinstance(source, str) or not source.strip() or len(source.encode("utf8")) > 64 * 1024:
        raise ValueError("Source vide ou supérieure à 64 Ko.")
    return language, source


def command_for(language, folder):
    if language == "python":
        return [sys.executable, "-I", "-B", str(folder / "main.py")], None
    compiler = shutil.which("g++") or shutil.which("clang++")
    if not compiler:
        raise ValueError("Compilateur C++17 absent : installe g++ ou clang++ sur ton PC.")
    executable = folder / ("main.exe" if os.name == "nt" else "main")
    return [str(executable)], [compiler, "-std=c++17", "-O0", "-Wall", "-Wextra", str(folder / "main.cpp"), "-o", str(executable)]


def execute(language, source):
    with tempfile.TemporaryDirectory(prefix="warlike-script-") as directory:
        folder = Path(directory)
        (folder / ("main.py" if language == "python" else "main.cpp")).write_text(source, encoding="utf8")
        run_command, compile_command = command_for(language, folder)
        compile_result = None
        if compile_command:
            compile_result = invoke(compile_command, folder, 12, writable=True)
            if not compile_result["ok"]:
                return {"ok": False, "stage": "compile", "compile": compile_result, "run": None}
        run_result = invoke(run_command, folder, 4)
        return {"ok": run_result["ok"], "stage": "run", "compile": compile_result, "run": run_result}


def serve(port=PORT):
    token = secrets.token_urlsafe(32)
    execution_gate = threading.BoundedSemaphore(1)

    class Handler(BaseHTTPRequestHandler):
        def cors(self):
            origin = self.headers.get("Origin")
            if origin in ALLOWED_ORIGINS:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-WarLike-Token")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Cache-Control", "no-store")

        def reply(self, code, body):
            encoded = json.dumps(body, ensure_ascii=False).encode("utf8")
            self.send_response(code)
            self.cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        def allowed(self):
            port = self.server.server_port
            return self.headers.get("Host") in ("127.0.0.1:"+str(port), "localhost:"+str(port)) and (
                self.headers.get("Origin") in ALLOWED_ORIGINS or (
                    self.headers.get("Origin") is None and self.client_address[0] == "127.0.0.1"))

        def do_OPTIONS(self):
            if not self.allowed():
                return self.reply(403, {"ok": False, "error": "Origin interdit."})
            self.send_response(204)
            self.cors()
            self.send_header("Content-Length", "0")
            self.end_headers()

        def do_GET(self):
            if not self.allowed():
                return self.reply(403, {"ok": False, "error": "Origin interdit."})
            if self.path != "/health":
                return self.reply(404, {"ok": False, "error": "Route inconnue."})
            self.reply(200, {"ok": True, "service": "WarLike local script runner", "languages": ["python", "cpp"],
                             "sandboxed": None, "isolationRequired": True, "isolation": "linux-bubblewrap-required", "authenticationRequired": True})

        def do_POST(self):
            if not self.allowed():
                return self.reply(403, {"ok": False, "error": "Origin interdit."})
            if self.path != "/run":
                return self.reply(404, {"ok": False, "error": "Route inconnue."})
            self.connection.settimeout(5)
            supplied = self.headers.get("X-WarLike-Token", "")
            if not hmac.compare_digest(supplied.encode("utf8"), token.encode("ascii")):
                return self.reply(401, {"ok": False, "error": "Clé locale invalide."})
            if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
                return self.reply(415, {"ok": False, "error": "application/json requis."})
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if size <= 0 or size > MAX_REQUEST:
                    raise ValueError("Requête trop volumineuse.")
                language, source = check_payload(json.loads(self.rfile.read(size).decode("utf8")))
                if not execution_gate.acquire(blocking=False):
                    return self.reply(429, {"ok": False, "error": "Une exécution native est déjà en cours."})
                try:
                    result = execute(language, source)
                    self.reply(200, result)
                finally:
                    execution_gate.release()
            except (ValueError, UnicodeError, json.JSONDecodeError) as error:
                self.reply(400, {"ok": False, "error": str(error)})
            except OSError as error:
                self.reply(500, {"ok": False, "error": "Impossible de lancer l'outil : " + str(error)})

        def log_message(self, message, *args):
            print("[WarLike runner] " + message % args, file=sys.stderr)

    print("WarLike Python/C++ local runner : http://127.0.0.1:" + str(port), flush=True)
    print("CLÉ DE SESSION (à coller dans Script Studio) : " + token, flush=True)
    print("Isolation Linux obligatoire : sans bubblewrap/prlimit fonctionnels, aucun script ne sera exécuté.", flush=True)
    with LimitedHTTPServer(("127.0.0.1", port), Handler) as server:
        server.serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=PORT)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("Port invalide.")
    serve(args.port)
