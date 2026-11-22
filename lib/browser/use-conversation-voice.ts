"use client";

import { useEffect, useRef, useState } from "react";
import { getSpeechRecognitionCtor, type SpeechRecognitionLike } from "@/lib/browser/speech-recognition";
import { microphoneIssue, type OralSetupIssue } from "@/components/oral-setup-dialog";

type SpeechConfig = { serverStt: boolean; serverTts: boolean };
type VoiceState = "idle" | "speaking" | "listening" | "transcribing";
const SILENCE_MS = 3000;
const NO_SPEECH_MS = 30000;
const MAX_TURN_MS = 90000;

function wav(parts: Float32Array[], sampleRate: number): Blob {
  const length = parts.reduce((n, part) => n + part.length, 0);
  const samples = new Float32Array(length);
  let cursor = 0;
  for (const part of parts) { samples.set(part, cursor); cursor += part.length; }
  const ratio = sampleRate / 16000;
  const count = Math.ceil(samples.length / ratio);
  const data = new DataView(new ArrayBuffer(44 + count * 2));
  const label = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) data.setUint8(offset + i, value.charCodeAt(i));
  };
  label(0, "RIFF"); data.setUint32(4, 36 + count * 2, true); label(8, "WAVE");
  label(12, "fmt "); data.setUint32(16, 16, true); data.setUint16(20, 1, true);
  data.setUint16(22, 1, true); data.setUint32(24, 16000, true);
  data.setUint32(28, 32000, true); data.setUint16(32, 2, true);
  data.setUint16(34, 16, true); label(36, "data"); data.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    const first = Math.floor(i * ratio);
    const last = Math.min(samples.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = first; j < last; j++) sum += samples[j];
    const v = Math.max(-1, Math.min(1, sum / Math.max(1, last - first)));
    data.setInt16(44 + i * 2, v < 0 ? v * 32768 : v * 32767, true);
  }
  return new Blob([data.buffer], { type: "audio/wav" });
}

/**
 * Shared hands-free speech turn controller for PSLE picture discussion and
 * free-form role-play. Only one microphone or AI speaker is active at a time.
 * Audio is never uploaded unless tenant server STT is enabled.
 */
export function useConversationVoice(args: {
  config: SpeechConfig | null;
  onAutoSubmit: (transcript: string) => Promise<void>;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [handsFree, setHandsFreeState] = useState(true);
  const [transcript, setTranscriptState] = useState("");
  const [interim, setInterim] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [micIssue, setMicIssue] = useState<OralSetupIssue|null>(null);
  const configRef = useRef(args.config);
  const submitRef = useRef(args.onAutoSubmit);
  const handsFreeRef = useRef(true);
  const textRef = useRef("");
  const activeRef = useRef(false);
  const startingRef = useRef(false);
  const processingRef = useRef(false);
  const generationRef = useRef(0);
  const speakGenerationRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const committedRef = useRef(new Set<number>());
  const samplesRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef(48000);
  const startedAtRef = useRef(0);
  const lastVoiceRef = useRef(0);
  const voiceDetectedRef = useRef(false);
  const loudFramesRef = useRef(0);
  const noiseRef = useRef(0.005);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const finishPlaybackRef = useRef<(() => void) | null>(null);

  configRef.current = args.config;
  submitRef.current = args.onAutoSubmit;

  function setHandsFree(enabled: boolean) {
    handsFreeRef.current = enabled;
    setHandsFreeState(enabled);
  }

  function setTranscript(next: string) {
    textRef.current = next;
    setTranscriptState(next);
  }
  function clearTranscript() {
    setTranscript("");
    setInterim("");
  }
  function getTranscript() { return textRef.current; }

  function stopPlayback() {
    speakGenerationRef.current += 1;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = "";
      audioElementRef.current = null;
    }
    utteranceRef.current = null;
    finishPlaybackRef.current?.();
    finishPlaybackRef.current = null;
  }

  function releaseMicrophone() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onend = null;
      recognition.onerror = null;
      try { recognition.stop(); } catch {}
    }
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    const ctx = contextRef.current;
    contextRef.current = null;
    if (ctx) void ctx.close().catch(() => undefined);
  }

  function reset() {
    generationRef.current += 1;
    activeRef.current = false;
    startingRef.current = false;
    processingRef.current = false;
    stopPlayback();
    releaseMicrophone();
    clearTranscript();
    setState("idle");
    setSeconds(0);
    setError("");
    setMicIssue(null);
  }

  async function stopRecording(autoSubmit = false): Promise<string> {
    if (!activeRef.current || processingRef.current) return "";
    activeRef.current = false;
    processingRef.current = true;
    const generation = generationRef.current;
    setState("transcribing");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    // Native recognition can emit its last final result after stop().
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      await new Promise<void>(resolve => setTimeout(resolve, 400));
    }
    const recording = wav(samplesRef.current, sampleRateRef.current);
    releaseMicrophone();
    let message = textRef.current.trim();
    if (configRef.current?.serverStt && recording.size > 44) {
      try {
        const form = new FormData();
        form.append("audio", recording, "conversation.wav");
        const response = await fetch("/api/student/speaking/transcribe", { method: "POST", body: form });
        const body = await response.json() as { text?: string; error?: string };
        if (response.ok && body.text?.trim()) message = body.text.trim();
        else if (!message) throw new Error(body.error || "Speech recognition did not return text.");
      } catch (reason) {
        if (!message) setError(reason instanceof Error ? reason.message : "Speech transcription failed.");
      }
    }
    if (generation !== generationRef.current) return "";
    processingRef.current = false;
    setState("idle");
    setInterim("");
    setTranscript(message);
    if (!message) {
      setError("No speech was recognised. Try again or type your reply.");
      return "";
    }
    if (autoSubmit && handsFreeRef.current) {
      try { await submitRef.current(message); }
      catch (reason) { setError(reason instanceof Error ? reason.message : "Could not send spoken reply."); }
    }
    return message;
  }

  async function startRecording(): Promise<void> {
    if (activeRef.current || startingRef.current || processingRef.current) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicIssue("unsupported");
      setError("This browser cannot record microphone audio.");
      return;
    }
    if (!configRef.current?.serverStt && !getSpeechRecognitionCtor()) {
      setMicIssue("speech");
      setError("Speech recognition is unavailable in this browser and server STT is not configured.");
      return;
    }
    startingRef.current = true;
    const generation = generationRef.current;
    try {
      stopPlayback();
      setError("");
      setMicIssue(null);
      clearTranscript();
      setSeconds(0);
      samplesRef.current = [];
      committedRef.current = new Set();
      voiceDetectedRef.current = false;
      loudFramesRef.current = 0;
      noiseRef.current = 0.005;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      const ctx = new AudioContext();
      contextRef.current = ctx;
      await ctx.resume();
      sampleRateRef.current = ctx.sampleRate;
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      sourceRef.current = source;
      processorRef.current = processor;
      processor.onaudioprocess = event => {
        if (!activeRef.current) return;
        const samples = new Float32Array(event.inputBuffer.getChannelData(0));
        samplesRef.current.push(samples);
        let power = 0;
        for (const sample of samples) power += sample * sample;
        const rms = Math.sqrt(power / Math.max(1, samples.length));
        const threshold = Math.max(0.014, noiseRef.current * 2.8);
        if (rms >= threshold) {
          loudFramesRef.current += 1;
          if (loudFramesRef.current >= 2) {
            voiceDetectedRef.current = true;
            lastVoiceRef.current = Date.now();
          }
        } else {
          loudFramesRef.current = 0;
          if (!voiceDetectedRef.current) noiseRef.current = noiseRef.current * .95 + rms * .05;
        }
      };
      source.connect(processor);
      processor.connect(ctx.destination);
      const Ctor = getSpeechRecognitionCtor();
      if (Ctor) {
        try {
          const recognition = new Ctor();
          recognition.lang = "en-SG";
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = event => {
            if (!activeRef.current && !processingRef.current) return;
            let latest = "";
            let temporary = "";
            for (let i = 0; i < event.results.length; i++) {
              const phrase = (event.results[i][0]?.transcript || "").trim();
              if (!phrase) continue;
              if (event.results[i].isFinal) {
                if (!committedRef.current.has(i)) {
                  committedRef.current.add(i);
                  latest += " " + phrase;
                }
              } else temporary += " " + phrase;
            }
            if (latest) setTranscript((textRef.current + " " + latest).trim());
            setInterim(temporary.trim());
            if (latest || temporary) {
              voiceDetectedRef.current = true;
              lastVoiceRef.current = Date.now();
            }
          };
          recognition.onerror = event => {
            const code=(event as {error?:string}|null)?.error||"";
            if(code==="not-allowed"||code==="audio-capture")setMicIssue(code==="audio-capture"?"device":"permission");
            else if(code==="service-not-allowed"&&!configRef.current?.serverStt)setMicIssue("speech");
            if (!configRef.current?.serverStt && activeRef.current)
              setError("Browser speech recognition stopped ("+(code||"unknown")+"). Check permissions or configure server STT.");
          };
          recognition.start();
          recognitionRef.current = recognition;
        } catch { /* Server STT can still transcribe the captured WAV. */ }
      }
      startedAtRef.current = Date.now();
      lastVoiceRef.current = startedAtRef.current;
      activeRef.current = true;
      setState("listening");
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        setSeconds(Math.floor(elapsed / 1000));
        if (voiceDetectedRef.current && Date.now() - lastVoiceRef.current >= SILENCE_MS) {
          void stopRecording(handsFreeRef.current);
        } else if (elapsed >= MAX_TURN_MS) {
          void stopRecording(handsFreeRef.current && voiceDetectedRef.current);
        } else if (!voiceDetectedRef.current && elapsed >= NO_SPEECH_MS) {
          void stopRecording(false);
        }
      }, 250);
    } catch (reason) {
      releaseMicrophone();
      setState("idle");
      setMicIssue(microphoneIssue(reason));
      setError(reason instanceof Error ? reason.message : "Microphone could not start.");
    } finally {
      startingRef.current = false;
    }
  }

  async function browserSpeech(text: string): Promise<void> {
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined")
      throw new Error("Audio playback is not supported by this browser.");
    await new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      utterance.lang = "en-SG";
      utterance.rate = .93;
      const voices = window.speechSynthesis.getVoices();
      utterance.voice = voices.find(v => v.lang.toLowerCase() === "en-sg") ||
        voices.find(v => v.lang.toLowerCase().startsWith("en")) || null;
      const finish = () => { finishPlaybackRef.current = null; utteranceRef.current = null; resolve(); };
      finishPlaybackRef.current = finish;
      utterance.onend = finish;
      utterance.onerror = event => { finishPlaybackRef.current = null; utteranceRef.current = null; reject(new Error("Browser speech playback failed: " + event.error)); };
      window.speechSynthesis.speak(utterance);
    });
  }

  async function serverSpeech(text: string): Promise<void> {
    const response = await fetch("/api/student/speaking/tts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error("Server speech playback is not available");
    const url = URL.createObjectURL(await response.blob());
    try {
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(url);
        audioElementRef.current = audio;
        const complete = () => { finishPlaybackRef.current = null; audioElementRef.current = null; resolve(); };
        finishPlaybackRef.current = complete;
        audio.onended = complete;
        audio.onerror = () => { finishPlaybackRef.current = null; audioElementRef.current = null; reject(new Error("Audio playback failed")); };
        void audio.play().catch(reject);
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function play(text: string, listenAfter = false): Promise<void> {
    if (!text.trim() || activeRef.current || processingRef.current) return;
    stopPlayback();
    const current = speakGenerationRef.current;
    setError("");
    setState("speaking");
    // Listening to the AI's spoken turn is active study, not idle time.
    // The microphone remains stopped until playback has finished.
    const studyWindow=window as Window & {__emActiveVoiceCount?:number};
    studyWindow.__emActiveVoiceCount=(studyWindow.__emActiveVoiceCount||0)+1;
    let didPlay = false;
    if (configRef.current?.serverTts) {
      try { await serverSpeech(text); didPlay = true; }
      catch { /* Fallback to browser speech when server TTS is unavailable. */ }
    }
    if (!didPlay && current === speakGenerationRef.current) {
      try { await browserSpeech(text); didPlay = true; }
      catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not play AI speech.");
      }
    }
    studyWindow.__emActiveVoiceCount=Math.max(0,(studyWindow.__emActiveVoiceCount||0)-1);
    if (current !== speakGenerationRef.current) return;
    setState("idle");
    if (didPlay && listenAfter && handsFreeRef.current) await startRecording();
  }

  // A navigation change or unmount must not leave the microphone or voice running.
  useEffect(() => () => {
    generationRef.current += 1;
    activeRef.current = false;
    stopPlayback();
    releaseMicrophone();
  }, []);

  return { state, handsFree, setHandsFree, micIssue, setMicIssue, transcript, setTranscript, getTranscript,
    clearTranscript, interim, seconds, error, setError, startRecording, stopRecording,
    play, reset, stopPlayback };
}
