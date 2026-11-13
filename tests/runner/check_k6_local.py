"""End-to-end harness smoke against an in-memory loopback HTTP stub, never AWS."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import tempfile
import threading
from unittest.mock import patch
import os

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "load"))
from config import Settings
from engine import Engine


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args): pass

    def do_GET(self):
        body = {"status": "ok", "database": {"status": "ready", "table": "fcaj-event-workshop-local-test-smoke"},
                "apiContractVersion": "4.1", "serverTime": "2026-11-13T00:00:00Z"} if self.path == "/health" else {"events": []}
        raw = json.dumps(body).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
    with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {"LAB_ENV": "local"}):
        settings = Settings(api_url=f"http://127.0.0.1:{server.server_port}", results=folder)
        engine = Engine(settings)
        run = engine.start({"users": 2, "rampUp": 1, "hold": 2, "rampDown": 1,
                            "maxRequests": 4, "intervalMs": 200, "timeout": 5})
        engine.workers[run["runId"]].join(30)
        result = engine.get(run["runId"])
        assert result["state"] == "completed", result.get("issues")
        assert result["metrics"]["requests"] == 4, result["metrics"]
        assert result["metrics"]["counts"]["readOk"] == 4
        assert result["metrics"]["latency"]["p95"] is not None
        assert any(issue["code"] == "REQUEST_CAP_REACHED" for issue in result["issues"])
        print(json.dumps({"realK6": True, "loopbackStub": True, "requests": 4, "verdict": result["verdict"], "awsRequests": 0}))
finally:
    server.shutdown(); server.server_close(); thread.join(5)
