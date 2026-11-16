#!/usr/bin/env python3
"""Authenticated HTTP supervisor for an isolated .NET stdio world.

No session token or HTTP socket enters the executable-code process.
"""
import argparse
import hmac
import json
import os
import queue
from pathlib import Path
import secrets
import selectors
import shutil
import subprocess
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from native_sandbox import sandbox_command, kill_tree, SandboxUnavailable, LimitedHTTPServer

ORIGINS = {"http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:8765", "http://127.0.0.1:8765", "https://warlike-engine.pages.dev"}
LIMIT = 2*1024*1024


class NativeWorld:
    def __init__(self, assembly, dotnet):
        self.assembly, self.dotnet = Path(assembly).resolve(), Path(dotnet).resolve()
        self.process = None
        self.folder = tempfile.TemporaryDirectory(prefix="warlike-dotnet-")
        self.lock = threading.Lock()
        self.broken = False
        self.jobs = queue.Queue(maxsize=1)
        # bwrap's parent-death signal follows the creating THREAD on Linux.
        # A short-lived HTTP handler must never own a persistent worker.
        self.owner = threading.Thread(target=self.own_process, daemon=True)
        self.owner.start()

    def close(self):
        if self.process:
            kill_tree(self.process)
        self.jobs.put(None)
        self.owner.join(timeout=3)
        if self.process:
            kill_tree(self.process)
            for stream in (self.process.stdin, self.process.stdout, self.process.stderr):
                stream.close()
            self.process = None
        self.folder.cleanup()

    def own_process(self):
        while (job := self.jobs.get()) is not None:
            path, body, response = job
            try:
                response.put(self.perform(path, body))
            except Exception as error:
                self.broken = True
                if self.process:
                    kill_tree(self.process)
                response.put((503, {"error": "Runtime isolé interrompu : "+str(error)[:1000]}))

    def request(self, path, body):
        if not self.lock.acquire(blocking=False):
            return 429, {"error": "Une requête C# est déjà en cours."}
        try:
            response = queue.Queue(maxsize=1)
            self.jobs.put((path, body, response))
            return response.get(timeout=35)
        except queue.Empty:
            self.broken = True
            if self.process:
                kill_tree(self.process)
            return 503, {"error": "Superviseur C# expiré ; redémarre le pont."}
        finally:
            self.lock.release()

    def perform(self, path, body):
        if self.broken:
            return 503, {"error": "Runtime isolé interrompu. Redémarre le pont ; la scène du navigateur est conservée."}
        try:
            if not self.process:
                runtime = self.dotnet.parent
                command = sandbox_command(["/runtime/dotnet", "/app/"+self.assembly.name, "--isolated-worker"], self.folder.name,
                                          mounts=[(self.assembly.parent, "/app"), (self.dotnet, "/runtime/dotnet"),
                                                  (runtime / "host", "/runtime/host"),
                                                  (runtime / "shared/Microsoft.NETCore.App", "/runtime/shared/Microsoft.NETCore.App")], managed=True)
                self.process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                                env={}, start_new_session=True, bufsize=0)
            deadline = time.monotonic() + (30 if path == "/scripts/compile" else 3)
            # Nonblocking write/read: a wedged worker cannot block the supervisor.
            encoded = (json.dumps({"path": path, "body": body}, separators=(",", ":"))+"\n").encode()
            os.set_blocking(self.process.stdin.fileno(), False)
            response, diagnostic = bytearray(), bytearray()
            with selectors.DefaultSelector() as selector:
                selector.register(self.process.stdin, selectors.EVENT_WRITE, "write")
                selector.register(self.process.stdout, selectors.EVENT_READ, "out")
                selector.register(self.process.stderr, selectors.EVENT_READ, "err")
                while time.monotonic() < deadline:
                    if not selector.get_map():
                        self.process.wait(timeout=.2)
                        detail = (diagnostic + response).decode("utf8", errors="replace")[:1500]
                        raise ValueError("Worker C# arrêté ("+str(self.process.returncode)+") : "+detail)
                    for key, _ in selector.select(min(.1, max(0, deadline-time.monotonic()))):
                        if key.data == "write":
                            size = os.write(key.fileobj.fileno(), encoded[:8192])
                            encoded = encoded[size:]
                            if not encoded:
                                selector.unregister(key.fileobj)
                        else:
                            chunk = os.read(key.fileobj.fileno(), 8192)
                            if not chunk:
                                selector.unregister(key.fileobj)
                                # Drain both output streams before reporting startup errors;
                                # stdout can reach EOF before stderr has been read.
                                if self.process.poll() is not None and not selector.get_map():
                                    detail = (diagnostic + response).decode("utf8", errors="replace")[:1500]
                                    raise ValueError("Worker C# arrêté ("+str(self.process.returncode)+") : "+detail)
                                continue
                            target = response if key.data == "out" else diagnostic
                            target.extend(chunk)
                            if len(response) > 4*LIMIT or len(diagnostic) > 48*1024:
                                raise ValueError("Limite de sortie du runtime C# dépassée.")
                            if key.data == "out" and b"\n" in response:
                                result = json.loads(response)
                                return int(result["status"]), result["data"]
                if self.process.poll() is not None:
                    detail = (diagnostic + response).decode("utf8", errors="replace")[:1500]
                    raise ValueError("Worker C# arrêté ("+str(self.process.returncode)+") : "+detail)
                raise ValueError("Délai C# dépassé : processus isolé arrêté.")
        except (OSError, ValueError, SandboxUnavailable, subprocess.TimeoutExpired) as error:
            self.broken = True
            if self.process:
                kill_tree(self.process)
            return 503, {"error": str(error)}


def serve(assembly, dotnet):
    token, world = secrets.token_urlsafe(32), NativeWorld(assembly, dotnet)
    parent = os.getppid()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def reply(self, status, payload):
            data = json.dumps(payload).encode()
            self.send_response(status)
            origin = self.headers.get("Origin")
            if origin in ORIGINS:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-WarLike-Token")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if status != 204:
                self.wfile.write(data)

        def allowed(self):
            self.connection.settimeout(5)
            return (self.headers.get("Origin") is None or self.headers.get("Origin") in ORIGINS) and self.headers.get("Host") in ("127.0.0.1:8765", "localhost:8765")

        def do_OPTIONS(self):
            self.reply(204 if self.allowed() else 403, {})

        def do_GET(self):
            if not self.allowed():
                return self.reply(403, {"error": "Origin ou hôte interdit."})
            if self.path != "/health":
                return self.reply(404, {"error": "Not found"})
            self.reply(200, {"ready": True, "engine": "WarLike C# .NET 8", "protocol": 3, "authenticationRequired": True,
                             "sandboxed": self.server.native_world.process is not None and not self.server.native_world.broken, "isolationRequired": True, "isolation": "linux-bubblewrap-required", "capabilities": ["component-inspector", "tactical-squads", "component-lifecycle", "shared-play-frame", "native-script-compiler", "mono-behaviour", "animator-commands"]})

        def do_POST(self):
            if not self.allowed():
                return self.reply(403, {"error": "Origin ou hôte interdit."})
            if not hmac.compare_digest(self.headers.get("X-WarLike-Token", "").encode("utf8"), token.encode("ascii")):
                return self.reply(401, {"error": "Clé de session C# absente ou invalide. Colle la clé affichée au démarrage du pont."})
            if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
                return self.reply(415, {"error": "application/json requis."})
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if size < 1 or size > LIMIT:
                    return self.reply(413, {"error": "Request too large."})
                data = self.rfile.read(size)
                if len(data) != size:
                    raise ValueError("Requête incomplète.")
                body = data.decode("utf8")
                json.loads(body)
                status, result = world.request(self.path, body)
                self.reply(status, result)
            except (ValueError, UnicodeError):
                self.reply(400, {"error": "Corps JSON invalide."})

    print("CLÉ DE SESSION C# : " + token, flush=True)
    with LimitedHTTPServer(("127.0.0.1", 8765), Handler) as server:
        print("WarLike C# bridge listening on http://127.0.0.1:8765/ (authenticated supervisor)", flush=True)
        server.native_world = world
        def monitor_parent():
            while os.getppid() == parent:
                time.sleep(.2)
            server.shutdown()
        threading.Thread(target=monitor_parent, daemon=True).start()
        try:
            server.serve_forever()
        finally:
            world.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--assembly", required=True)
    parser.add_argument("--dotnet", default=shutil.which("dotnet"))
    args = parser.parse_args()
    if not args.dotnet:
        parser.error(".NET 8 introuvable.")
    serve(args.assembly, args.dotnet)
