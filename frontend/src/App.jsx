import { useState, useRef, useEffect } from 'react';
import { Mic, ArrowUp, StopCircle, Loader2, Globe, Instagram, Youtube, Square, Volume2, VolumeX, Bot, MessageSquare, MapPin, Menu, X, Leaf, FileText, Scale, HelpCircle, Sun, Moon, Palette } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Avatar from './components/Avatar';
import NierVisualizer from './components/NierVisualizer';
import MessageBubble from './components/MessageBubble';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || "/api";

const STATUS_TEXT = {
  idle: "FAOL",
  listening: "ESHITMOQDA...",
  thinking: "TAHLIL QILMOQDA...",
  speaking: "JAVOB BERMOQDA"
};

const SOCIAL_LINKS = {
  phone: "tel:+998712030022",
  email: "mailto:info@ecoekspertiza.uz",
  telegram: "https://t.me/ecoekspertiza",
  youtube: "https://www.youtube.com/channel/UCk1-8z1uI0fWDQRniifg6xw",
  instagram: "https://www.instagram.com/ecoekspertiza_uz/",
  location: "https://www.google.com/maps/search/Toshkent+sh.,+Mirzo+Ulug'bek+t.,+Sayram+5-tor+k.,+15-uy"
};

const QUICK_ACTIONS = [
  { label: 'Ekspertiza', query: "Ekologik ekspertiza nima va u qanday amalga oshiriladi?", icon: Leaf },
  { label: "Qonunlar", query: "Ekologiya bo'yicha asosiy qonunlar va me'yorlar", icon: Scale },
  { label: 'Hujjatlar', query: "Ekologik ekspertiza uchun qanday hujjatlar kerak?", icon: FileText },
  { label: 'Yordam', query: "Markazga qanday murojaat qilsa bo'ladi?", icon: HelpCircle },
];


const LOTTIE_URLS = {
  style1: "https://lottie.host/0641a64a-425c-406a-9e27-acb7871aad4f/LCAyTKu7tB.lottie",
  style2: "https://lottie.host/28305e56-1b8c-41d7-91af-e6115f082a1a/k3QS5HSdgv.lottie",
  style3: "https://lottie.host/0641a64a-425c-406a-9e27-acb7871aad4f/LCAyTKu7tB.lottie",
};

const TelegramIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

/* Canvas-based white-background removal for style3 videos */
const VideoAvatar = ({ avatarState }) => {
  const canvasRef = useRef(null);
  const idleRef = useRef(null);
  const speakRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const render = () => {
      const vid = avatarState === 'speaking' ? speakRef.current : idleRef.current;
      if (vid && vid.readyState >= 2) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          /* Oq va och kulrang piksellarni shaffof qilish */
          if (d[i] > 230 && d[i + 1] > 230 && d[i + 2] > 230) d[i + 3] = 0;
        }
        ctx.putImageData(img, 0, 0);
      }
      frameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(frameRef.current);
  }, [avatarState]);

  return (
    <div className="relative w-full h-full">
      <video ref={idleRef} src="/idle.mp4" autoPlay loop muted playsInline style={{ display: 'none' }} />
      <video ref={speakRef} src="/speaking.mp4" autoPlay loop muted playsInline style={{ display: 'none' }} />
      <canvas ref={canvasRef} width={400} height={500} className="w-full h-full" />
    </div>
  );
};

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [avatarState, setAvatarState] = useState("idle");
  const [isResponseActive, setIsResponseActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioStream, setAudioStream] = useState(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showRobot, setShowRobot] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('SYSTEM_INIT...');
  const [isRobotVisualReady, setIsRobotVisualReady] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('uz');
  const [isDark, setIsDark] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('style1');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark && selectedStyle === 'style1');
  }, [isDark, selectedStyle]);

  const mediaRecorderRef = useRef(null);
  const chatEndRef = useRef(null);
  const audioPlayerRef = useRef(new Audio());
  const soundEnabledRef = useRef(true);
  const stopSignalRef = useRef(false);
  const hasGreetedRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const currentAudioUrlRef = useRef(null);
  const activeTtsRequestRef = useRef(null);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingStreamRef = useRef(false);
  const activeSourceRef = useRef(null);
  const streamTextRef = useRef("");

  const clearCurrentAudioUrl = () => {
    if (!currentAudioUrlRef.current) return;
    try { URL.revokeObjectURL(currentAudioUrlRef.current); } catch (e) { }
    currentAudioUrlRef.current = null;
  };

  const abortActiveTtsRequest = () => {
    if (!activeTtsRequestRef.current) return;
    activeTtsRequestRef.current.abort();
    activeTtsRequestRef.current = null;
  };

  const stopHtmlAudio = () => {
    audioPlayerRef.current.pause();
    audioPlayerRef.current.currentTime = 0;
    audioPlayerRef.current.onended = null;
    audioPlayerRef.current.onpause = null;
    audioPlayerRef.current.onerror = null;
    clearCurrentAudioUrl();
  };

  const finalizeResponseIfSettled = () => {
    if (stopSignalRef.current) return;
    if (wsRef.current || activeTtsRequestRef.current || isPlayingStreamRef.current || activeSourceRef.current || audioQueueRef.current.length > 0) return;
    setIsResponseActive(false);
    setAvatarState("idle");
  };

  const upsertLastAiMessage = (text) => {
    setMessages(prev => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === 'ai') {
        next[next.length - 1] = { ...last, text };
        return next;
      }
      next.push({ role: 'ai', text });
      return next;
    });
  };

  const playBlobUntilEnded = async (audioBlob) => {
    if (!soundEnabledRef.current) return;
    stopHtmlAudio();
    const audioUrl = URL.createObjectURL(audioBlob);
    currentAudioUrlRef.current = audioUrl;
    audioPlayerRef.current.src = audioUrl;

    await new Promise((resolve, reject) => {
      let settled = false;
      const cleanupAudioEvents = () => {
        audioPlayerRef.current.onended = null;
        audioPlayerRef.current.onpause = null;
        audioPlayerRef.current.onerror = null;
      };
      const finalizePlayback = () => {
        if (settled) return;
        settled = true;
        cleanupAudioEvents();
        clearCurrentAudioUrl();
        resolve();
      };
      audioPlayerRef.current.onended = finalizePlayback;
      audioPlayerRef.current.onpause = () => { if (!stopSignalRef.current) return; finalizePlayback(); };
      audioPlayerRef.current.onerror = () => {
        if (settled) return;
        settled = true;
        cleanupAudioEvents();
        clearCurrentAudioUrl();
        reject(new Error('[Audio] Playback failed'));
      };
      audioPlayerRef.current.play().catch((error) => {
        if (settled) return;
        settled = true;
        cleanupAudioEvents();
        clearCurrentAudioUrl();
        reject(error);
      });
    });
  };

  const fetchTtsBlob = async (text, lang) => {
    const controller = new AbortController();
    activeTtsRequestRef.current = controller;
    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('lang', lang);
      const response = await fetch(`${API_URL}/tts`, { method: 'POST', body: formData, signal: controller.signal });
      if (!response.ok) throw new Error(`[TTS] Request failed for ${lang}`);
      return await response.blob();
    } finally {
      if (activeTtsRequestRef.current === controller) activeTtsRequestRef.current = null;
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleResize = () => {
      const viewport = window.visualViewport;
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const keyboardH = Math.max(0, windowHeight - viewportHeight - viewport.offsetTop);
      setKeyboardHeight(keyboardH);
    };
    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    return () => {
      window.visualViewport.removeEventListener('resize', handleResize);
      window.visualViewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  useEffect(() => {
    if (autoScroll) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, autoScroll]);

  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (!isAtBottom) {
      setAutoScroll(false);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setAutoScroll(true), 5000);
    } else {
      setAutoScroll(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    }
  };

  useEffect(() => {
    if (hasGreetedRef.current) return;
    hasGreetedRef.current = true;

    const waitForBackend = async () => {
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      setLoadingStatus('CONNECTING...');
      const statusMessages = [
        { delay: 3000, text: 'WAKING_UP_SERVER...' },
        { delay: 8000, text: 'LOADING_AI_MODELS...' },
        { delay: 18000, text: 'INITIALIZING_RAG...' },
        { delay: 30000, text: 'ALMOST_READY...' },
      ];
      const timers = statusMessages.map(({ delay, text }) => setTimeout(() => setLoadingStatus(text), delay));

      let backendReady = false;
      const deadline = Date.now() + 60000;
      while (!backendReady && Date.now() < deadline) {
        try {
          const res = await fetch(`${API_URL}/health`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
          if (res.ok) { backendReady = true; break; }
          await sleep(1500);
        } catch (e) { await sleep(2000); }
      }

      timers.forEach(t => clearTimeout(t));

      if (!backendReady) {
        setLoadingStatus('SERVER_TIMEOUT');
        await sleep(400);
        setIsLoading(false);
        setMessages([{ role: 'ai', text: "Server hozircha javob bermayapti. Birozdan so'ng sahifani yangilang yoki qayta urinib ko'ring." }]);
        setAvatarState("idle");
        return;
      }

      setLoadingStatus('READY');
      await sleep(400);
      setIsLoading(false);
      setAvatarState("idle");
    };
    waitForBackend();
  }, []);

  const stopGeneration = () => {
    stopSignalRef.current = true;
    abortActiveTtsRequest();
    stopHtmlAudio();
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch (e) { }
      activeSourceRef.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) { }
      wsRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingStreamRef.current = false;
    setIsResponseActive(false);
    setAvatarState("idle");
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userText = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setAvatarState("thinking");
    setIsResponseActive(true);
    setAutoScroll(true);

    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const backendHost = import.meta.env.VITE_API_URL
      ? new URL(import.meta.env.VITE_API_URL).host
      : window.location.host;
    const wsUrl = `${wsProto}//${backendHost}/api/ws/text-stream`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      stopSignalRef.current = false;
      streamTextRef.current = "";
      audioQueueRef.current = [];
      isPlayingStreamRef.current = false;
      abortActiveTtsRequest();
      stopHtmlAudio();
      if (activeSourceRef.current) {
        try { activeSourceRef.current.stop(); } catch (e) { }
        activeSourceRef.current = null;
      }

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'text_query', text: userText, lang: selectedLang }));
        setMessages(prev => [...prev, { role: 'ai', text: "" }]);
      };

      ws.onmessage = (event) => {
        if (stopSignalRef.current) { ws.close(); return; }
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'llm':
            streamTextRef.current += msg.text;
            upsertLastAiMessage(streamTextRef.current);
            break;
          case 'tts':
            if (soundEnabledRef.current && msg.audio) {
              setAvatarState("speaking");
              const binaryStr = atob(msg.audio);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
              audioQueueRef.current.push(bytes);
              playNextAudioChunk();
            }
            break;
          case 'done':
            wsRef.current = null;
            ws.close();
            finalizeResponseIfSettled();
            break;
          case 'error':
            console.error('[WS-TEXT] Error:', msg.message);
            setIsResponseActive(false);
            setAvatarState("idle");
            wsRef.current = null;
            break;
        }
      };

      ws.onerror = (e) => {
        console.error('[WS-TEXT] Connection error, falling back to REST:', e);
        wsRef.current = null;
        sendTextFallback(userText);
      };

      ws.onclose = () => { wsRef.current = null; };

    } catch (e) {
      console.error('[WS-TEXT] Failed, falling back to REST:', e);
      sendTextFallback(userText);
    }
  };

  const sendTextFallback = async (userText) => {
    try {
      const formData = new FormData();
      formData.append('text', userText);
      formData.append('lang', selectedLang);
      const res = await fetch(`${API_URL}/text-chat`, { method: 'POST', body: formData });
      const data = await res.json();
      await handleAiResponse(data.answer, soundEnabled);
    } catch (e) {
      setIsResponseActive(false);
      setAvatarState("idle");
    }
  };

  const handleAiResponse = async (text, playSound = true) => {
    stopSignalRef.current = false;
    setIsResponseActive(true);
    upsertLastAiMessage(text);

    if (!playSound || !soundEnabledRef.current) {
      setIsResponseActive(false);
      setAvatarState("idle");
      return;
    }

    const controller = new AbortController();
    activeTtsRequestRef.current = controller;

    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('lang', selectedLang);
      const audioRes = await fetch(`${API_URL}/tts`, { method: 'POST', body: formData, signal: controller.signal });
      if (!audioRes.ok) throw new Error(`[TTS] Request failed: ${audioRes.status}`);
      const audioBlob = await audioRes.blob();
      if (activeTtsRequestRef.current === controller) activeTtsRequestRef.current = null;
      if (stopSignalRef.current || !soundEnabledRef.current) { finalizeResponseIfSettled(); return; }
      setAvatarState("speaking");
      await playBlobUntilEnded(audioBlob);
    } catch (e) {
      if (e.name !== 'AbortError') console.error('[TTS] Playback failed:', e);
    } finally {
      if (activeTtsRequestRef.current === controller) activeTtsRequestRef.current = null;
      finalizeResponseIfSettled();
    }
  };

  const playNextAudioChunk = async () => {
    if (isPlayingStreamRef.current) return;
    if (audioQueueRef.current.length === 0) return;
    isPlayingStreamRef.current = true;
    const audioData = audioQueueRef.current.shift();
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioContextRef.current;
      const buffer = await ctx.decodeAudioData(audioData.buffer);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      activeSourceRef.current = source;
      source.onended = () => {
        activeSourceRef.current = null;
        isPlayingStreamRef.current = false;
        playNextAudioChunk();
        finalizeResponseIfSettled();
      };
      source.start(0);
    } catch (e) {
      console.warn('[Audio] Decode error:', e);
      isPlayingStreamRef.current = false;
      playNextAudioChunk();
      finalizeResponseIfSettled();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
        sendVoiceStream(audioBlob);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setAvatarState("listening");
    } catch (err) { alert("Mikrofonga ruxsat bering!"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAvatarState("thinking");
    }
  };

  const sendVoiceStream = async (audioBlob) => {
    stopSignalRef.current = false;
    setIsResponseActive(true);
    streamTextRef.current = "";
    audioQueueRef.current = [];
    isPlayingStreamRef.current = false;
    abortActiveTtsRequest();
    stopHtmlAudio();
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch (e) { }
      activeSourceRef.current = null;
    }

    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const backendHost = import.meta.env.VITE_API_URL
      ? new URL(import.meta.env.VITE_API_URL).host
      : window.location.host;
    const wsUrl = `${wsProto}//${backendHost}/api/ws/voice-stream`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        ws.send(JSON.stringify({ type: 'lang_hint', lang: selectedLang }));
        const arrayBuffer = await audioBlob.arrayBuffer();
        ws.send(arrayBuffer);
      };

      ws.onmessage = (event) => {
        if (stopSignalRef.current) { ws.close(); return; }
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'stt':
            if (msg.is_final && msg.text) {
              setMessages(prev => [...prev, { role: 'user', text: msg.text }]);
              setAvatarState("thinking");
              setAutoScroll(true);
              setMessages(prev => [...prev, { role: 'ai', text: "" }]);
            }
            break;
          case 'llm':
            streamTextRef.current += msg.text;
            upsertLastAiMessage(streamTextRef.current);
            break;
          case 'tts':
            if (soundEnabledRef.current && msg.audio) {
              setAvatarState("speaking");
              const binaryStr = atob(msg.audio);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
              audioQueueRef.current.push(bytes);
              playNextAudioChunk();
            }
            break;
          case 'done':
            wsRef.current = null;
            ws.close();
            finalizeResponseIfSettled();
            break;
          case 'error':
            console.error('[WS] Error:', msg.message);
            setIsResponseActive(false);
            setAvatarState("idle");
            wsRef.current = null;
            break;
        }
      };

      ws.onerror = (e) => {
        console.error('[WS] Connection error, falling back to REST:', e);
        wsRef.current = null;
        sendVoiceFallback(audioBlob);
      };

      ws.onclose = () => { wsRef.current = null; };

    } catch (e) {
      console.error('[WS] Failed to connect, falling back to REST:', e);
      sendVoiceFallback(audioBlob);
    }
  };

  const sendVoiceFallback = async (audioBlob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice.webm');
    try {
      const res = await fetch(`${API_URL}/voice-chat`, { method: 'POST', body: formData });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'user', text: data.text }]);
      await handleAiResponse(data.answer, soundEnabled);
    } catch (e) {
      setIsResponseActive(false);
      setAvatarState("idle");
    }
  };

  const toggleRobot = () => setShowRobot(prev => !prev);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const newState = !prev;
      if (!newState) {
        abortActiveTtsRequest();
        stopHtmlAudio();
        if (activeSourceRef.current) {
          try { activeSourceRef.current.stop(); } catch (e) { }
          activeSourceRef.current = null;
        }
        audioQueueRef.current = [];
        isPlayingStreamRef.current = false;
        finalizeResponseIfSettled();
      }
      return newState;
    });
  };

  const isKeyboardOpen = isFocused || keyboardHeight > 100;
  const shouldEnterFocusMode = isMobile && isKeyboardOpen;
  const isWelcomeView = messages.length === 0;
  const isImg = selectedStyle !== 'style1';
  const bgFile = selectedStyle === 'style2' ? 'style2.jpg' : 'style3.png';

  return (
    <div
      className={`flex flex-col h-full w-full font-sans overflow-hidden relative ${
        isImg ? 'text-white' : 'bg-[#f7f7f8] dark:bg-[#111113] text-gray-900 dark:text-gray-100'
      }`}
      style={isImg ? { backgroundImage: `url(/${bgFile})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >

      {/* Avatar off-screen */}
      <div style={{ position: 'absolute', left: -9999, top: -9999, width: 60, height: 60 }}>
        <Avatar state={avatarState} onReady={() => setIsRobotVisualReady(true)} />
      </div>

      {/* Loading Screen */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#f7f7f8] dark:bg-[#111113]"
          >
            <motion.div
              animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              className="w-9 h-9 rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-gray-800 dark:border-t-gray-300 mb-5"
            />
            <p className="text-gray-900 dark:text-white font-semibold text-base tracking-tight">ECO EXPERT AI</p>
            <p className="text-gray-400 text-[11px] mt-1 tracking-widest uppercase">{loadingStatus}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar + Greeting — avatar har doim, matn faqat welcome rejimida */}
      {!isLoading && !shouldEnterFocusMode && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none pb-52">
          {showRobot && (
            selectedStyle === 'style3' ? (
              /* Style3: video avatar — har doim katta, kichraymaydi */
              <div className="w-[760px] h-[580px] sm:w-[760px] sm:h-[700px] mb-2 ml-10">
                <VideoAvatar avatarState={avatarState} />
              </div>
            ) : (
              /* Style1/2: lottie — chat rejimida kichrayadi */
              <motion.div
                animate={{
                  scale: isWelcomeView ? 1 : 0.5,
                  opacity: isWelcomeView ? 1 : 0.18,
                }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="w-[403px] h-[403px] sm:w-[448px] sm:h-[448px] mb-4"
              >
                <DotLottieReact src={LOTTIE_URLS[selectedStyle]} loop autoplay />
              </motion.div>
            )
          )}
          <AnimatePresence>
            {isWelcomeView && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-center px-4 ml-10"
              >
                {/* Matn orqasida shaffof podlozhka — fon rasmida ko'rinishi uchun */}
                <div className={isImg ? 'inline-block bg-black/35 backdrop-blur-sm rounded-2xl px-5 py-3' : ''}>
                  <p className={`text-sm sm:text-base mb-1 ${isImg ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
                    Ekologiya bo'yicha maslahat
                  </p>
                  <h1 className={`text-2xl sm:text-3xl font-semibold leading-snug ${isImg ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    Savolingizni <span className="text-purple-300">bering</span>
                  </h1>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Header */}
      {!isLoading && (
        <header className={`absolute top-0 left-0 right-0 z-20 backdrop-blur-sm border-b px-4 sm:px-6 py-3.5 flex items-center gap-3 ${
          isImg ? 'bg-black/30 border-white/10' : 'bg-[#f7f7f8]/95 dark:bg-[#111113]/95 border-gray-200/80 dark:border-gray-700/80'
        }`}>
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl border shadow-sm flex items-center justify-center ${
            isImg ? 'bg-white/15 border-white/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
          }`}>
            <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[19px] font-bold leading-none tracking-tight ${isImg ? 'text-white' : 'text-gray-900 dark:text-white'}`}>ECO EXPERT AI</p>
            <p className={`text-[13px] mt-1 truncate ${isImg ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>Davlat ekologik ekspertizasi markazi</p>
          </div>
          {!isWelcomeView && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
              avatarState !== 'idle'
                ? isImg ? 'bg-white/20 text-white' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-500'
                : isImg ? 'bg-white/10 text-white/50' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                avatarState !== 'idle'
                  ? isImg ? 'bg-white animate-pulse' : 'bg-purple-400 animate-pulse'
                  : isImg ? 'bg-white/30' : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <span className="text-[10px] font-medium tracking-wide">{STATUS_TEXT[avatarState]}</span>
            </div>
          )}
          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-full border transition-colors touch-manipulation ${
                isMenuOpen
                  ? isImg ? 'bg-white text-gray-900 border-white' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                  : isImg ? 'bg-white/15 text-white border-white/20 hover:bg-white/25' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {isMenuOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
            {isMenuOpen && <div className="fixed inset-0 z-[55]" onClick={() => setIsMenuOpen(false)} />}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }} transition={{ duration: 0.15 }}
                  className={`absolute top-full mt-2 right-0 w-56 rounded-2xl shadow-lg border p-3 z-[65] ${
                    isImg ? 'bg-black/60 backdrop-blur-xl border-white/15' : 'bg-white dark:bg-[#1c1c1e] border-gray-100 dark:border-gray-700'
                  }`}
                >
                  {/* Dark mode — only style1 */}
                  {!isImg && (
                    <button onClick={() => setIsDark(d => !d)}
                      className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-2.5">
                        {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-gray-500" />}
                        <span>{isDark ? "Yorug' rejim" : "Qorong'u rejim"}</span>
                      </div>
                      <div className={`w-8 h-4 rounded-full flex-shrink-0 transition-colors ${isDark ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200'}`}>
                        <div className={`w-3 h-3 rounded-full bg-white dark:bg-gray-900 mt-0.5 transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                    </button>
                  )}
                  {/* Avatar toggle */}
                  <button onClick={toggleRobot}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-sm transition-colors ${
                      isImg ? 'text-white/90 hover:bg-white/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}>
                    <div className="flex items-center gap-2.5">
                      {showRobot ? <Bot size={15} className={isImg ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'} /> : <MessageSquare size={15} className={isImg ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'} />}
                      <span>{showRobot ? 'Avatar yoqilgan' : "Avatar o'chirilgan"}</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full flex-shrink-0 transition-colors ${showRobot ? (isImg ? 'bg-white/80' : 'bg-gray-900 dark:bg-white') : (isImg ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700')}`}>
                      <div className={`w-3 h-3 rounded-full mt-0.5 transition-transform ${showRobot ? 'translate-x-4' : 'translate-x-0.5'} ${isImg ? 'bg-gray-900' : 'bg-white dark:bg-gray-900'}`} />
                    </div>
                  </button>
                  {/* Sound toggle */}
                  <button onClick={toggleSound}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-sm transition-colors ${
                      isImg ? 'text-white/90 hover:bg-white/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}>
                    <div className="flex items-center gap-2.5">
                      {soundEnabled ? <Volume2 size={15} className={isImg ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'} /> : <VolumeX size={15} className={isImg ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'} />}
                      <span>{soundEnabled ? 'Ovoz yoqilgan' : "Ovoz o'chirilgan"}</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full flex-shrink-0 transition-colors ${soundEnabled ? (isImg ? 'bg-white/80' : 'bg-gray-900 dark:bg-white') : (isImg ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700')}`}>
                      <div className={`w-3 h-3 rounded-full mt-0.5 transition-transform ${soundEnabled ? 'translate-x-4' : 'translate-x-0.5'} ${isImg ? 'bg-gray-900' : 'bg-white dark:bg-gray-900'}`} />
                    </div>
                  </button>
                  {/* Divider */}
                  <div className={`h-px my-2 ${isImg ? 'bg-white/10' : 'bg-gray-100 dark:bg-gray-700'}`} />
                  {/* Style selector */}
                  <div className="px-3 py-1">
                    <div className={`flex items-center gap-2 mb-1.5 ${isImg ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                      <Palette size={13} />
                      <span className="text-xs font-medium">Dizayn stili</span>
                    </div>
                    <select
                      value={selectedStyle}
                      onChange={e => setSelectedStyle(e.target.value)}
                      style={isImg ? { colorScheme: 'dark' } : undefined}
                      className={`w-full text-xs rounded-xl px-3 py-2 border outline-none cursor-pointer ${
                        isImg
                          ? 'bg-black/40 border-white/20 text-white'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <option value="style1">Minimalizm</option>
                      <option value="style2">Hi tech</option>
                      <option value="style3">Ecology</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 pb-52 space-y-3 pt-[60px]" onScroll={handleScroll}>
        <AnimatePresence>
          {messages.map((msg, i) => {
            if (!msg.text) return null;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <MessageBubble text={msg.text} role={msg.role} />
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* Bottom */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 px-3 sm:px-6 pb-4 sm:pb-6 pt-2 ${
        selectedStyle === 'style3' ? 'bg-transparent' : isImg ? 'bg-black/20 backdrop-blur-md' : 'bg-[#f7f7f8]/95 dark:bg-[#111113]/95 backdrop-blur-sm'
      }`}>
        {/* Input Card */}
        <div className={`max-w-2xl mx-auto rounded-2xl border overflow-hidden ${
          isImg ? 'bg-white/10 backdrop-blur-md border-white/15 shadow-none' : 'bg-white dark:bg-[#1c1c1e] border-gray-200 dark:border-gray-700 shadow-sm'
        }`}>
          <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
            <span className={`text-[11px] leading-none ${isImg ? 'text-white/50' : 'text-gray-400 dark:text-gray-500'}`}>Davlat ekologik ekspertizasi markazi</span>
            <span className={`text-[11px] ${isImg ? 'text-white/25' : 'text-gray-300 dark:text-gray-600'}`}>•</span>
            <span className={`text-[11px] font-medium leading-none transition-colors ${avatarState !== 'idle' ? 'text-purple-400' : isImg ? 'text-white/35' : 'text-gray-400 dark:text-gray-500'}`}>
              {STATUS_TEXT[avatarState]}
            </span>
          </div>
          {isRecording ? (
            <div className="px-4 pb-3 pt-2 space-y-2">
              <NierVisualizer isRecording={isRecording} stream={audioStream} isDark={isDark || isImg} />
              <button onClick={stopRecording}
                className={`w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors touch-manipulation border ${
                  isImg ? 'bg-red-500/20 text-red-300 border-red-400/30 hover:bg-red-500/30' : 'bg-red-50 dark:bg-red-900/20 text-red-500 border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                }`}>
                <StopCircle size={15} className="animate-pulse" />
                Yozishni to'xtatish
              </button>
            </div>
          ) : (
            <>
              <input
                ref={inputRef} type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
                placeholder="Savolingizni yozing..."
                className={`w-full px-4 py-3 bg-transparent focus:outline-none text-sm sm:text-base ${
                  isImg ? 'text-white placeholder-white/40' : 'text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600'
                }`}
              />
              <div className="flex items-center justify-between px-3 pb-3">
                <button onClick={() => setSelectedLang(l => l === 'uz' ? 'ru' : 'uz')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors touch-manipulation ${
                    isImg ? 'border-white/20 text-white/70 hover:bg-white/10' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                  <Globe size={12} />
                  <span className="font-medium">{selectedLang === 'uz' ? "O'zbekcha" : 'Русский'}</span>
                </button>
                <div className="flex items-center gap-1.5">
                  {isResponseActive && (
                    <button onClick={stopGeneration} title="To'xtatish"
                      className={`p-2 rounded-full border transition-colors touch-manipulation ${
                        isImg ? 'border-white/20 text-white/70 hover:bg-white/10' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}>
                      <Square size={13} fill="currentColor" />
                    </button>
                  )}
                  <button onClick={startRecording} aria-label="Ovoz yozish"
                    className={`p-2 rounded-full border transition-colors touch-manipulation ${
                      isImg ? 'border-white/20 text-white/70 hover:bg-white/10' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}>
                    <Mic size={16} />
                  </button>
                  <button onClick={sendMessage} disabled={!input.trim()} aria-label="Yuborish"
                    className={`p-2 rounded-full disabled:opacity-30 transition-colors touch-manipulation ${
                      isImg ? 'bg-white text-gray-900 hover:bg-white/90' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200'
                    }`}>
                    {avatarState === 'thinking' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pills */}
        <div className="max-w-2xl mx-auto mt-2.5 flex items-center gap-2 flex-wrap justify-center">
          {QUICK_ACTIONS.map(action => (
            <button key={action.label}
              onClick={() => { setInput(action.query); setTimeout(() => inputRef.current?.focus(), 0); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs transition-colors touch-manipulation ${
                isImg ? 'border-white/20 bg-white/10 text-white hover:bg-white/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1c1e] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              <action.icon size={12} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Social + Disclaimer */}
        <div className="max-w-2xl mx-auto mt-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-0.5">
            {[
              { href: SOCIAL_LINKS.instagram, icon: <Instagram size={14} /> },
              { href: SOCIAL_LINKS.youtube, icon: <Youtube size={14} /> },
              { href: SOCIAL_LINKS.telegram, icon: <TelegramIcon size={14} /> },
              { href: SOCIAL_LINKS.location, icon: <MapPin size={14} /> },
            ].map(({ href, icon }) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                className={`p-1.5 rounded-lg transition-colors touch-manipulation ${
                  isImg ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}>
                {icon}
              </a>
            ))}
          </div>
          <p className={`text-[10px] ${isImg ? 'text-white/30' : 'text-gray-400 dark:text-gray-600'}`}>AI xato qilishi mumkin</p>
        </div>
      </div>
    </div>
  );
}

export default App;
