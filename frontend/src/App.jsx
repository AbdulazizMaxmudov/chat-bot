import { useState, useRef, useEffect } from 'react';
import { Mic, Send, StopCircle, Loader2, Phone, Globe, Instagram, Youtube, Zap, Square, Volume2, VolumeX, Bot, MessageSquare, MapPin, Menu, X, ChevronRight } from 'lucide-react';
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

// Social links configuration
const SOCIAL_LINKS = {
  phone: "tel:+998712030022",
  email: "mailto:info@ecoekspertiza.uz",
  telegram: "https://t.me/ecoekspertiza",
  youtube: "https://www.youtube.com/channel/UCk1-8z1uI0fWDQRniifg6xw",
  instagram: "https://www.instagram.com/ecoekspertiza_uz/",
  location: "https://www.google.com/maps/search/Toshkent+sh.,+Mirzo+Ulug'bek+t.,+Sayram+5-tor+k.,+15-uy"
};

// Telegram SVG Icon component
const TelegramIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [avatarState, setAvatarState] = useState("idle");
  const [isResponseActive, setIsResponseActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioStream, setAudioStream] = useState(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showRobot, setShowRobot] = useState(true); // Robot visibility toggle
  const [soundEnabled, setSoundEnabled] = useState(true); // Sound toggle
  const [keyboardHeight, setKeyboardHeight] = useState(0); // Keyboard height tracking
  const [isLoading, setIsLoading] = useState(true); // Loading screen state
  const [loadingStatus, setLoadingStatus] = useState('SYSTEM_INIT...'); // Dynamic loading text
  const [isRobotVisualReady, setIsRobotVisualReady] = useState(false);
  const [isFocused, setIsFocused] = useState(false); // Track input focus state
  const [isMobile, setIsMobile] = useState(false); // Mobile detection
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Menu toggle
  const [selectedLang, setSelectedLang] = useState('uz'); // Language selector: 'uz' or 'ru'

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

  // WebSocket + Web Audio streaming refs
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingStreamRef = useRef(false);
  const activeSourceRef = useRef(null); // Track active AudioBufferSourceNode for instant stop
  const streamTextRef = useRef("");

  const clearCurrentAudioUrl = () => {
    if (!currentAudioUrlRef.current) return;
    try {
      URL.revokeObjectURL(currentAudioUrlRef.current);
    } catch (e) {
      console.warn('[Audio] Failed to revoke object URL:', e);
    }
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
    if (wsRef.current || activeTtsRequestRef.current || isPlayingStreamRef.current || activeSourceRef.current || audioQueueRef.current.length > 0) {
      return;
    }
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
      audioPlayerRef.current.onpause = () => {
        if (!stopSignalRef.current) return;
        finalizePlayback();
      };
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

      const response = await fetch(`${API_URL}/tts`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`[TTS] Request failed for ${lang}`);
      }

      return await response.blob();
    } finally {
      if (activeTtsRequestRef.current === controller) {
        activeTtsRequestRef.current = null;
      }
    }
  };

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // VisualViewport API for keyboard detection
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
    if (autoScroll) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    if (!isAtBottom) {
      setAutoScroll(false);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setAutoScroll(true);
      }, 5000);
    } else {
      setAutoScroll(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    }
  };

  // --- СТАРТ: ждём бэкенд, потом приветствие ---
  useEffect(() => {
    if (hasGreetedRef.current) return;
    hasGreetedRef.current = true;

    const waitForBackend = async () => {
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      setLoadingStatus('CONNECTING...');

      // Progressive status messages while waiting
      const statusMessages = [
        { delay: 3000, text: 'WAKING_UP_SERVER...' },
        { delay: 8000, text: 'LOADING_AI_MODELS...' },
        { delay: 18000, text: 'INITIALIZING_RAG...' },
        { delay: 30000, text: 'ALMOST_READY...' },
      ];
      const timers = statusMessages.map(({ delay, text }) =>
        setTimeout(() => setLoadingStatus(text), delay)
      );

      // Ping backend until it responds, but don't leave the user on an endless loading screen.
      let backendReady = false;
      const deadline = Date.now() + 60000;

      while (!backendReady && Date.now() < deadline) {
        try {
          const res = await fetch(`${API_URL}/health`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(10000),
          });

          if (res.ok) {
            backendReady = true;
            break;
          }

          await sleep(1500);
        } catch (e) {
          // Backend not ready yet, wait and retry
          await sleep(2000);
        }
      }

      // Clear status timers
      timers.forEach(t => clearTimeout(t));

      if (!backendReady) {
        setLoadingStatus('SERVER_TIMEOUT');
        await sleep(400);
        setIsLoading(false);
        setMessages([{
          role: 'ai',
          text: "Server hozircha javob bermayapti. Birozdan so'ng sahifani yangilang yoki qayta urinib ko'ring."
        }]);
        setAvatarState("idle");
        return;
      }

      setLoadingStatus('READY');

      // Small pause for the "READY" state to show
      await sleep(400);

      // Hide loading screen — backend is alive
      setIsLoading(false);

      // Now play greeting
      const uzbekText = "Savolingizni bering";
      const startupRussianText = "\u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0441\u0432\u043e\u0439 \u0432\u043e\u043f\u0440\u043e\u0441";
      const russianText = "Задайте свой вопрос";
      void russianText;
      const fullText = `${uzbekText} (${startupRussianText})`;

      setMessages([{ role: 'ai', text: fullText }]);

      try {
        if (soundEnabledRef.current) {
          setAvatarState("speaking");
          const [audioBlobUz, audioBlobRu] = await Promise.all([
            fetchTtsBlob(uzbekText, 'uz'),
            fetchTtsBlob(startupRussianText, 'ru'),
          ]);

          await playBlobUntilEnded(audioBlobUz);
          await playBlobUntilEnded(audioBlobRu);
        }
      } catch (e) {
        console.log('[Startup] TTS error:', e);
      }

      setAvatarState("idle");
    };
    waitForBackend();
  }, []);

  const stopGeneration = () => {
    stopSignalRef.current = true;
    abortActiveTtsRequest();
    stopHtmlAudio();
    // Stop currently playing Web Audio source immediately
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch (e) { }
      activeSourceRef.current = null;
    }
    // Close WebSocket if active
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) { }
      wsRef.current = null;
    }
    // Clear audio queue
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

    // Try WebSocket streaming (parallel LLM + TTS)
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

      // Stop any playing audio from previous session
      if (activeSourceRef.current) {
        try { activeSourceRef.current.stop(); } catch (e) { }
        activeSourceRef.current = null;
      }

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'text_query',
          text: userText,
          lang: selectedLang
        }));
        // Add empty AI message for streaming
        setMessages(prev => [...prev, { role: 'ai', text: "" }]);
      };

      ws.onmessage = (event) => {
        if (stopSignalRef.current) { ws.close(); return; }
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'llm':
            // Streaming text chunk — append to AI message
            streamTextRef.current += msg.text;
            upsertLastAiMessage(streamTextRef.current);
            break;

          case 'tts':
            if (soundEnabledRef.current && msg.audio) {
              setAvatarState("speaking");
              const binaryStr = atob(msg.audio);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
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
        // Fallback to REST API
        sendTextFallback(userText);
      };

      ws.onclose = () => {
        wsRef.current = null;
      };

    } catch (e) {
      console.error('[WS-TEXT] Failed, falling back to REST:', e);
      sendTextFallback(userText);
    }
  };

  // REST fallback for text chat (if WebSocket fails)
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
      const audioRes = await fetch(`${API_URL}/tts`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!audioRes.ok) {
        throw new Error(`[TTS] Request failed: ${audioRes.status}`);
      }

      const audioBlob = await audioRes.blob();

      if (activeTtsRequestRef.current === controller) {
        activeTtsRequestRef.current = null;
      }

    // Show text instantly (no char-by-char animation — matches voice behavior)
      if (stopSignalRef.current || !soundEnabledRef.current) {
        finalizeResponseIfSettled();
        return;
      }

      setAvatarState("speaking");
      await playBlobUntilEnded(audioBlob);
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('[TTS] Playback failed:', e);
      }
    } finally {
      if (activeTtsRequestRef.current === controller) {
        activeTtsRequestRef.current = null;
      }
      finalizeResponseIfSettled();
    }
  };

  // --- Web Audio API: queue and play streaming MP3 chunks ---
  const playNextAudioChunk = async () => {
    if (isPlayingStreamRef.current) return;
    if (audioQueueRef.current.length === 0) return;

    isPlayingStreamRef.current = true;
    const audioData = audioQueueRef.current.shift();

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const buffer = await ctx.decodeAudioData(audioData.buffer);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      activeSourceRef.current = source; // Store for instant stop
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
    } catch (err) {
      alert("Mikrofonga ruxsat bering!");
    }
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
    // Stop any playing audio from previous session
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch (e) { }
      activeSourceRef.current = null;
    }

    // Determine WebSocket URL (use backend host when deployed separately)
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const backendHost = import.meta.env.VITE_API_URL
      ? new URL(import.meta.env.VITE_API_URL).host
      : window.location.host;
    const wsUrl = `${wsProto}//${backendHost}/api/ws/voice-stream`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        // First: send lang_hint as JSON so backend skips FastText
        ws.send(JSON.stringify({ type: 'lang_hint', lang: selectedLang }));
        // Then: send audio blob as binary
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
              // Add empty AI message for streaming
              setMessages(prev => [...prev, { role: 'ai', text: "" }]);
            }
            break;

          case 'llm':
            // Streaming text chunk — append to AI message
            streamTextRef.current += msg.text;
            upsertLastAiMessage(streamTextRef.current);
            break;

          case 'tts':
            if (soundEnabledRef.current && msg.audio) {
              setAvatarState("speaking");
              // Decode base64 audio and queue for playback
              const binaryStr = atob(msg.audio);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
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
        // Fallback to REST API
        sendVoiceFallback(audioBlob);
      };

      ws.onclose = () => {
        wsRef.current = null;
      };

    } catch (e) {
      console.error('[WS] Failed to connect, falling back to REST:', e);
      sendVoiceFallback(audioBlob);
    }
  };

  // REST fallback (in case WebSocket fails)
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

  const toggleRobot = () => {
    setShowRobot(prev => !prev);
  };

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

  // Determine if keyboard is open based on height detecting OR focus state
  // Focus is needed for Telegram/Webviews, Height for native browser resizing detection
  const isKeyboardOpen = isFocused || keyboardHeight > 100;

  // Only apply "Focus Mode" on mobile devices
  const shouldEnterFocusMode = isMobile && isKeyboardOpen;
  const shouldShowRobotVisual = showRobot && isRobotVisualReady;

  return (
    <div className="flex flex-col h-full w-full bg-main-bg text-white font-sans overflow-hidden relative scanlines">

      {/* Loading Screen Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02, filter: "blur(12px)" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-main-bg/98 backdrop-blur-3xl"
          >
            <div className="relative flex flex-col items-center justify-center">
              {/* Ambient Glow */}
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-48 h-48 rounded-full bg-neon-blue/5 blur-3xl"
              />

              {/* Single Clean Ring */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-neon-blue/60 border-r-neon-blue/20"
                />

                {/* Center Icon */}
                <div className="relative z-10 p-3 rounded-full bg-surface-100/80 backdrop-blur-sm border border-white/[0.06]">
                  <Bot size={28} className="text-neon-blue" />
                </div>
              </div>
            </div>

            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="mt-6 flex flex-col items-center gap-2"
            >
              <h2 className="text-lg font-heading font-semibold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-accent-purple">
                ECO EXPERT AI
              </h2>
              <div className="h-px w-20 bg-white/20" />
              <p className="text-[10px] font-mono text-neon-blue/50 tracking-widest uppercase">{loadingStatus}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Wrapper - Fades out when keyboard opens ON MOBILE ONLY */}
      {/* 1. ХЕДЕР - Extracted & Fixed Z-Index */}
      <motion.div
        animate={{ opacity: shouldEnterFocusMode ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="absolute top-0 left-0 w-full px-6 py-1 sm:py-2 flex justify-between items-start z-[60] pointer-events-none"
      >
        {/* Logo & Branding */}
        <div className="flex items-center gap-0 sm:gap-1 pointer-events-auto -mt-2 -ml-2">
          <div className="logo-hover">
            <img src="/logo.png" alt="Logo" className="w-[80px] h-[80px] sm:w-[92px] sm:h-[92px] object-contain transition-all duration-300" />
          </div>
          <div className="flex flex-col justify-center translate-x-1 sm:translate-x-0">
            <h1 className="text-[17px] sm:text-[22px] font-heading font-bold text-white tracking-wide leading-none uppercase transition-all duration-300">
              ECO EXPERT AI
            </h1>
            <p className="text-[7px] sm:text-[10px] font-mono font-medium text-eco-green/80 tracking-widest uppercase mt-1 leading-tight transition-all duration-300">
              Davlat ekologik ekspertizasi markazi
            </p>
          </div>
        </div>

        {/* Right Side - Unified Menu Button */}
        <div className="pointer-events-auto relative mt-1">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
            className={`relative z-[70] p-3 sm:p-4 rounded-2xl bg-surface-100/80 backdrop-blur-xl border border-white/[0.06] text-white shadow-[0_8px_32px_rgba(0,0,0,0.4)] cursor-pointer group menu-btn-hover ${isMenuOpen ? 'bg-neon-blue/15 border-neon-blue/40' : 'hover:bg-white/[0.04] hover:border-white/20'}`}
          >
            <div className="relative w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">
              <AnimatePresence mode='wait'>
                {isMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X size={28} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu size={28} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </button>

          {/* Outside click overlay — closes menu */}
          {isMenuOpen && (
            <div
              className="fixed inset-0 z-[55]"
              onClick={() => setIsMenuOpen(false)}
            />
          )}

          {/* Dropdown Menu Panel */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute top-full right-0 mt-3 w-72 glass-card rounded-3xl overflow-hidden z-[65] p-4 flex flex-col gap-4 scanlines"
              >
                {/* Toggles Group */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={toggleRobot}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between border btn-hover ${showRobot
                      ? 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {showRobot ? <Bot size={24} /> : <MessageSquare size={24} />}
                      <span className="font-heading tracking-wide text-sm">{showRobot ? 'AVATAR' : 'CHAT'}</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${showRobot ? 'bg-neon-blue' : 'bg-gray-600'}`}></div>
                  </button>

                  <button
                    onClick={toggleSound}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between border btn-hover ${soundEnabled
                      ? 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                      <span className="font-heading tracking-wide text-sm">{soundEnabled ? 'OVOZ' : 'OVOZSIZ'}</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${soundEnabled ? 'bg-neon-blue' : 'bg-gray-600'}`}></div>
                  </button>
                </div>

                <div className="h-px bg-white/10 w-full"></div>

                {/* Social Grid */}
                <div className="grid grid-cols-4 gap-2">
                  <SocialBtn href={SOCIAL_LINKS.instagram} icon={<Instagram size={20} />} color="pink" />
                  <SocialBtn href={SOCIAL_LINKS.youtube} icon={<Youtube size={20} />} color="red" />
                  <SocialBtn href={SOCIAL_LINKS.telegram} icon={<TelegramIcon size={20} />} color="blue" />
                  <SocialBtn href={SOCIAL_LINKS.location} icon={<MapPin size={20} />} color="green" />
                </div>

                {/* Call CTA */}
                <a
                  href={SOCIAL_LINKS.phone}
                  className="w-full py-4 bg-gradient-to-r from-neon-blue to-sky-400 rounded-2xl flex items-center justify-center gap-3 text-black font-heading font-semibold cta-btn-hover"
                >
                  <Phone size={20} strokeWidth={2.5} />
                  <span>QO'NG'IROQ QILISH 22222</span>
                </a>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 2. РОБОТ (conditional rendering) - Wrapper z-10 */}
      <motion.div
        animate={{ opacity: shouldEnterFocusMode ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className={`absolute inset-0 z-10 flex flex-col ${shouldEnterFocusMode ? 'pointer-events-none' : 'pointer-events-auto'}`}
      >
        <div className="h-[40%] sm:h-[45%] w-full relative flex flex-col items-center justify-center pt-20 sm:pt-0">
          <div
            className={`w-[500px] h-[500px] sm:w-[500px] sm:h-[500px] md:w-[600px] md:h-[600px] lg:w-[800px] lg:h-[800px] relative flex items-center justify-center transition-opacity duration-200 ${shouldShowRobotVisual ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            aria-hidden={!shouldShowRobotVisual}
          >
            <Avatar state={avatarState} onReady={() => setIsRobotVisualReady(true)} />
            <div className="absolute inset-0 hole-mask pointer-events-none z-20"></div>
          </div>
        </div>
      </motion.div>

      {/* 3. ЧАТ - Mobile Optimized */}
      <div
        className={`flex-1 flex flex-col bg-transparent relative min-h-0 z-20 transition-all duration-500 ease-out ${shouldEnterFocusMode
          ? 'mt-0'
          : (!showRobot ? 'mt-[70px] sm:mt-[80px]' : 'mt-[45vh]')
          }`}
      >
        <div
          className={`flex-1 overflow-y-auto px-3 sm:px-8 pb-40 pt-4 space-y-3 sm:space-y-4 pr-1 sm:pr-2`}
          onScroll={handleScroll}
        >
          <AnimatePresence>
            {messages.map((msg, i) => {
              if (!msg.text) return null;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <MessageBubble text={msg.text} role={msg.role} />
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* НИЗ - Input Container - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)] transition-all duration-300 ease-out">
        <div className="flex-none px-2 sm:px-6 pt-2 sm:pt-4 pb-2 sm:pb-6 flex flex-col items-center gap-1.5 sm:gap-4">

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1 rounded-full border border-neon-blue/15 bg-surface-100/70 backdrop-blur-md h-full">
              <Zap size={10} className={`sm:w-3 sm:h-3 flex-shrink-0 ${avatarState !== 'idle' ? "text-neon-blue fill-neon-blue animate-pulse" : "text-gray-500"}`} />
              <span className="text-[10px] sm:text-[10px] font-heading text-neon-blue tracking-widest leading-none mt-0.5">{STATUS_TEXT[avatarState]}</span>
            </div>

            {isResponseActive && (
              <button
                onClick={stopGeneration}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-4 py-1.5 sm:py-1 rounded-full border border-red-500/60 bg-red-950/40 text-red-400 hover:bg-red-900/30 danger-btn-hover h-full"
              >
                <Square size={10} className="sm:w-2.5 sm:h-2.5 flex-shrink-0" fill="currentColor" />
                <span className="text-[10px] sm:text-[10px] font-heading tracking-widest leading-none mt-0.5">STOP</span>
              </button>
            )}
          </div>

          {isRecording ? (
            <div className="w-full max-w-4xl space-y-3 sm:space-y-4 px-2">
              <NierVisualizer isRecording={isRecording} stream={audioStream} />
              <button onClick={stopRecording} className="w-full py-3 sm:py-4 bg-red-950/30 text-red-400 border border-red-500/40 rounded-xl flex items-center justify-center gap-2 hover:bg-red-900/25 danger-btn-hover shadow-[0_0_12px_rgba(239,68,68,0.15)]">
                <StopCircle size={18} className="sm:w-5 sm:h-5 animate-pulse" />
                <span className="font-heading tracking-widest text-sm sm:text-base">Yozishni to'xtatish</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-3 max-w-4xl w-full px-0 sm:px-1">

              {/* Language Toggle — flag only, no text */}
              <button
                onClick={() => setSelectedLang(l => l === 'uz' ? 'ru' : 'uz')}
                title={selectedLang === 'uz' ? "O'zbekcha — Ruscha uchun bosing" : "Русский — нажмите для Узбекского"}
                className="relative flex items-center justify-center overflow-hidden rounded-lg sm:rounded-xl touch-manipulation flag-btn-hover"
                style={{
                  width: isMobile ? '40px' : '58px', height: isMobile ? '40px' : '58px', padding: 0, flexShrink: 0,
                  border: selectedLang === 'uz'
                    ? '1.5px solid rgba(103,232,249,0.7)'
                    : '1.5px solid rgba(148,163,184,0.4)',
                  boxShadow: 'none',
                  background: '#000',
                }}
              >
                <span
                  className={`fi fi-${selectedLang === 'uz' ? 'uz' : 'ru'} fis`}
                  style={{ display: 'block', width: '100%', height: '100%', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 'inherit' }}
                />
              </button>

              <button onClick={startRecording} aria-label="Start recording" className="p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-transparent border border-white/[0.15] hover:border-eco-green hover:text-eco-green hover:shadow-glow-green btn-hover group touch-manipulation">
                <Mic size={isMobile ? 18 : 20} className="sm:w-6 sm:h-6" />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Savolingizni yozing..."
                className="flex-1 min-w-0 bg-transparent border border-white/[0.15] rounded-lg sm:rounded-xl py-2.5 sm:py-4 px-3 sm:px-6 focus:outline-none focus:border-neon-blue focus:shadow-glow-input text-white placeholder-gray-500 transition-shadow duration-200 font-sans text-sm sm:text-base"
              />

              <button onClick={sendMessage} disabled={!input.trim()} aria-label="Send message" className="p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-neon-blue/10 border border-neon-blue text-neon-blue font-bold hover:bg-neon-blue hover:text-black disabled:opacity-40 btn-hover touch-manipulation">
                {avatarState === 'thinking' ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <Send size={isMobile ? 18 : 20} className="sm:w-6 sm:h-6" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const SocialBtn = ({ icon, href, tooltip, color }) => {
  const colorClasses = {
    pink: 'social-hover-pink text-pink-500',
    red: 'social-hover-red text-red-500',
    blue: 'social-hover-blue text-sky-500',
    green: 'social-hover-green text-emerald-500',
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`p-2 sm:p-2.5 text-gray-500 rounded-xl social-btn-hover touch-manipulation ${colorClasses[color] || 'hover:text-neon-blue'}`}
      title={tooltip}
    >
      {icon}
    </a>
  );
};

export default App;
