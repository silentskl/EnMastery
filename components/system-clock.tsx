"use client";
import { useEffect, useState } from "react";

const TIME_ZONE = "Asia/Singapore";

function format(now: Date) {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(now);
}

export function SystemClock() {
  const [value, setValue] = useState("");
  useEffect(() => {
    const tick = () => setValue(format(new Date()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <span className="systemClock" title={`System timezone: ${TIME_ZONE}`}>{value || `${TIME_ZONE} · --:--:--`}</span>;
}
