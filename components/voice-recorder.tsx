"use client";
import { useRef, useState } from "react";

export function VoiceRecorder() {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks.current = [];
    recorder.current = new MediaRecorder(stream);
    recorder.current.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    recorder.current.onstop = () => { stream.getTracks().forEach((t) => t.stop()); setState("done"); };
    recorder.current.start(); setSeconds(0); setState("recording");
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }
  function stop() { recorder.current?.stop(); if (timer.current) clearInterval(timer.current); }

  return <div className="recorder">
    <div className={`recordOrb ${state === "recording" ? "recording" : ""}`}>{state === "recording" ? "●" : "MIC"}</div>
    <strong>{state === "recording" ? `Listening · ${seconds}s` : state === "done" ? "Recording ready" : "Speak when you're ready"}</strong>
    <p>{state === "done" ? "V0.3 captures audio locally. STT upload is wired through the provider abstraction in the next integration step." : "Your answer should be clear, relevant and developed with reasons."}</p>
    {state === "recording" ? <button className="button danger" onClick={stop}>Stop recording</button> : <button className="button primary" onClick={start}>{state === "done" ? "Try again" : "Start speaking"}</button>}
  </div>;
}
