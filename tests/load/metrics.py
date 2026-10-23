"""Aggregate k6 points, not fabricated values or response bodies."""
from collections import Counter, defaultdict
from datetime import datetime
import math

OUTCOMES = ("new", "replay", "full", "duplicate", "timeout", "busy", "server",
            "auth", "rateLimited", "notOpen", "closed", "other", "readOk")
TECHNICAL = ("timeout", "busy", "server", "auth", "rateLimited", "other")


def percentile(values, fraction):
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    left, right = math.floor(position), math.ceil(position)
    return round(ordered[left] + (ordered[right] - ordered[left]) * (position - left), 2)


class Metrics:
    def __init__(self):
        self.counts = Counter()
        self.requests = self.retries = self.purchase_attempts = 0
        self.latencies, self.purchase_latencies = [], []
        self.receipts = set()
        self.first = self.last = None
        self.buckets = defaultdict(lambda: {"requests": 0, "new": 0, "errors": 0, "latencies": []})

    def consume(self, point):
        if point.get("type") != "Point":
            return
        metric, data = point.get("metric"), point.get("data", {})
        if not str(metric).startswith("lab_"):
            return
        value, tags = data.get("value", 0), data.get("tags", {})
        timestamp = datetime.fromisoformat(data["time"].replace("Z", "+00:00")).timestamp()
        if metric == "lab_latency":
            self.first = timestamp if self.first is None else min(self.first, timestamp)
            self.last = timestamp if self.last is None else max(self.last, timestamp)
            self.requests += 1
            self.latencies.append(value)
            bucket = self.buckets[int(timestamp)]
            bucket["requests"] += 1
            bucket["latencies"].append(value)
            outcome = tags.get("outcome", "other")
            self.counts[outcome] += 1
            if outcome == "new": bucket["new"] += 1
            if outcome in TECHNICAL: bucket["errors"] += 1
            if tags.get("kind") == "purchase":
                self.purchase_attempts += 1
                self.purchase_latencies.append(value)
        elif metric == "lab_retries":
            self.retries += int(value)
        elif metric == "lab_receipts":
            self.receipts.add(tags.get("registrationId"))

    def snapshot(self):
        series = [{"time": second, "requests": row["requests"], "new": row["new"],
                   "errors": row["errors"], "p95": percentile(row["latencies"], .95)}
                  for second, row in sorted(self.buckets.items())]
        elapsed = None if self.first is None else max((self.last or self.first) - self.first, 1)
        return {"requests": self.requests, "purchaseAttempts": self.purchase_attempts, "retries": self.retries,
                "counts": {key: self.counts[key] for key in OUTCOMES},
                "latency": {"p50": percentile(self.latencies, .5), "p95": percentile(self.latencies, .95),
                            "max": round(max(self.latencies), 2) if self.latencies else None},
                "purchaseP95": percentile(self.purchase_latencies, .95),
                "throughput": round(self.requests / elapsed, 2) if elapsed else None,
                "uniqueReceipts": len(self.receipts - {None}), "series": series}
