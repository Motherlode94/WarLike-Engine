"""Fail-closed Linux native execution. No network, home, host /tmp or credentials.

The HTTP services run outside the sandbox; executable user code receives only pipes.
Windows/macOS require an OS isolation backend and are deliberately refused.
"""
import os
from pathlib import Path
import selectors
import shutil
import signal
import subprocess
import sys
import time
import threading
from http.server import ThreadingHTTPServer


class SandboxUnavailable(ValueError):
    pass


def sandbox_command(command, folder, *, mounts=(), managed=False, writable=False):
    bwrap, prlimit = shutil.which("bwrap"), shutil.which("prlimit")
    if not sys.platform.startswith("linux") or not bwrap or not prlimit:
        raise SandboxUnavailable("Isolation native indisponible : Linux, bubblewrap et prlimit requis. Aucun code exécuté.")
    folder = str(Path(folder).resolve())
    options = [bwrap, "--unshare-all", "--unshare-user", "--disable-userns", "--new-session", "--die-with-parent", "--cap-drop", "ALL"]
    for name in ("/usr", "/bin", "/lib", "/lib64", "/sbin"):
        if os.path.exists(name):
            options += ["--ro-bind", name, name]
    for source, target in mounts:
        options += ["--ro-bind", str(source), str(target)]
    options += ["--proc", "/proc", "--dev", "/dev", "--size", str(64*1024*1024), "--tmpfs", "/tmp",
                ("--bind" if writable else "--ro-bind"), folder, "/work", "--chdir", "/tmp", "--clearenv", "--setenv", "PATH", "/usr/bin:/bin",
                "--setenv", "HOME", "/tmp", "--setenv", "TMPDIR", "/tmp", "--setenv", "PYTHONUNBUFFERED", "1",
                "--setenv", "DOTNET_SYSTEM_GLOBALIZATION_INVARIANT", "1", "--setenv", "DOTNET_GCHeapHardLimit", "10000000",
                "--setenv", "DOTNET_EnableDiagnostics", "0", "--setenv", "DOTNET_PROCESSOR_COUNT", "2"]
    translated = [str(arg).replace(folder + "/", "/work/") for arg in command]
    memory = 4*1024**3 if managed else 512*1024**2
    # Limits also apply to compilers and descendants. The PID namespace is killed
    # when its bwrap init dies, including children that detach their session.
    # Apply RLIMIT_NPROC AFTER entering the user namespace. Applying it to
    # bwrap itself incorrectly counts unrelated host-user build-server threads.
    return options + ["--", prlimit, "--as=" + str(memory), "--cpu=" + ("300" if managed else "15"),
                      "--nproc=64", "--nofile=128", "--fsize=" + (str(2*1024**4) if managed else "16777216"), "--core=0", "--"] + translated


def kill_tree(process):
    if process.poll() is None:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    try:
        process.wait(timeout=2)
    except subprocess.TimeoutExpired:
        process.kill()


def invoke(command, cwd, seconds, output_limit=48*1024, *, writable=False):
    process = subprocess.Popen(sandbox_command(command, cwd, writable=writable), cwd=str(cwd), stdin=subprocess.DEVNULL,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, env={}, start_new_session=True)
    output = {"stdout": bytearray(), "stderr": bytearray()}
    truncated, timed_out = False, False
    try:
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout, selectors.EVENT_READ, "stdout")
            selector.register(process.stderr, selectors.EVENT_READ, "stderr")
            deadline = time.monotonic() + seconds
            while selector.get_map():
                if time.monotonic() >= deadline:
                    timed_out = True
                    break
                for key, _ in selector.select(min(.1, max(0, deadline-time.monotonic()))):
                    chunk = os.read(key.fileobj.fileno(), 8192)
                    if not chunk:
                        selector.unregister(key.fileobj)
                        continue
                    target = output[key.data]
                    target.extend(chunk[:max(0, output_limit-len(target))])
                    if len(target) >= output_limit:
                        truncated = True
                        break
                if truncated:
                    break
        if not truncated and not timed_out:
            process.wait(timeout=max(.01, deadline-time.monotonic()))
    finally:
        kill_tree(process)
        process.stdout.close()
        process.stderr.close()
    stderr = output["stderr"].decode("utf8", errors="replace")
    if timed_out:
        stderr += "\nDélai d'exécution dépassé."
    if truncated:
        stderr += "\nLimite de sortie dépassée : processus arrêté."
    return {"ok": process.returncode == 0 and not timed_out and not truncated,
            "exitCode": None if timed_out else process.returncode,
            "stdout": output["stdout"].decode("utf8", errors="replace"),
            "stderr": stderr, "truncated": truncated}


class LimitedHTTPServer(ThreadingHTTPServer):
    """Bound idle/slow clients as well as actual native execution."""
    daemon_threads = True

    def __init__(self, *args, **kwargs):
        self.slots = threading.BoundedSemaphore(16)
        super().__init__(*args, **kwargs)

    def get_request(self):
        connection, address = super().get_request()
        connection.settimeout(5)
        return connection, address

    def process_request(self, request, address):
        if not self.slots.acquire(blocking=False):
            request.close()
            return
        try:
            super().process_request(request, address)
        except BaseException:
            self.slots.release()
            raise

    def process_request_thread(self, request, address):
        try:
            super().process_request_thread(request, address)
        finally:
            self.slots.release()
