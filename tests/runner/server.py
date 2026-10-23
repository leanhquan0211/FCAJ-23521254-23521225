"""Loopback-only HTTP control surface. Start: python -B tests/runner/server.py"""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import socket
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "load"))
from config import LabError, Settings
from engine import Engine

ORIGINS = {"http://127.0.0.1:5174", "http://localhost:5174", "http://127.0.0.1:3100", "http://localhost:3100"}


class LocalServer(ThreadingHTTPServer):
    allow_reuse_address = False

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def handler_for(engine):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass  # Request headers/bodies can include browser cookies; do not log them.

        def send(self, status, body):
            raw = json.dumps(body, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def dispatch(self, mutation=False):
            if self.headers.get("Host") not in {"127.0.0.1:3100", "localhost:3100"}:
                return self.send(403, {"error": "FORBIDDEN_HOST"})
            origin = self.headers.get("Origin")
            if (origin and origin not in ORIGINS) or (mutation and origin not in ORIGINS):
                return self.send(403, {"error": "FORBIDDEN_ORIGIN"})
            path = self.path
            try:
                if not mutation:
                    if path == "/meta": return self.send(200, engine.metadata())
                    if path == "/runs": return self.send(200, {"runs": engine.list_runs()})
                    match = re.fullmatch(r"/runs/([a-f0-9]{24})", path)
                    if match: return self.send(200, engine.get(match[1]))
                else:
                    if self.headers.get("Transfer-Encoding") or self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                        return self.send(415, {"error": "JSON_REQUIRED"})
                    try: length = int(self.headers.get("Content-Length", "0"))
                    except ValueError: return self.send(400, {"error": "INVALID_LENGTH"})
                    if not 0 < length <= 8192: return self.send(413, {"error": "BODY_LIMIT"})
                    try: body = json.loads(self.rfile.read(length))
                    except (ValueError, UnicodeError): return self.send(400, {"error": "INVALID_JSON"})
                    if path == "/runs": return self.send(202, engine.start(body))
                    match = re.fullmatch(r"/runs/([a-f0-9]{24})/stop", path)
                    if match and body == {}: return self.send(200, engine.stop(match[1]))
                self.send(404, {"error": "ROUTE_NOT_FOUND"})
            except LabError as exc:
                self.send(404 if exc.code == "RUN_NOT_FOUND" else 409 if exc.code == "RUN_ACTIVE" else 400,
                          {"error": exc.code, "message": exc.message})

        def do_GET(self): self.dispatch()
        def do_POST(self): self.dispatch(mutation=True)

        def setup(self):
            super().setup()
            self.connection.settimeout(10)
    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url")
    parser.add_argument("--app-root")
    parser.add_argument("--k6")
    args = parser.parse_args()
    # Acquire the one controller port before touching/recovering report state.
    server = LocalServer(("127.0.0.1", 3100), BaseHTTPRequestHandler)
    engine = Engine(Settings(api_url=args.api_url, app_root=args.app_root, k6=args.k6))
    server.RequestHandlerClass = handler_for(engine)
    server.daemon_threads = True
    print("Test runner: http://127.0.0.1:3100 - dashboard 5174; Ctrl+C to stop", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        for run in engine.list_runs():
            if run["state"] not in FINAL_STATES: engine.stop(run["runId"])
        for worker in list(engine.workers.values()): worker.join(timeout=10)
        server.server_close()


FINAL_STATES = {"completed", "failed", "blocked", "stopped", "interrupted"}
if __name__ == "__main__": main()
