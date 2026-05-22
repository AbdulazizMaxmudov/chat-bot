import { useEffect, useRef } from 'react';

const NierVisualizer = ({ isRecording, stream }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    if (isRecording && stream) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioCtx = audioContextRef.current;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      analyserRef.current = analyser;
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      draw();
    } else {
      cancelAnimationFrame(animationRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isRecording, stream]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ff41';

    ctx.beginPath();
    const sliceWidth = width / dataArrayRef.current.length;
    let x = 0;

    for (let i = 0; i < dataArrayRef.current.length; i += 1) {
      const v = dataArrayRef.current[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
    ctx.lineWidth = 1;
    let x2 = 0;

    for (let i = 0; i < dataArrayRef.current.length; i += 5) {
      const v = dataArrayRef.current[i] / 128.0;
      const y = (v * height) / 2 + 5;
      if (i === 0) ctx.moveTo(x2, y);
      else ctx.lineTo(x2, y);
      x2 += sliceWidth * 5;
    }

    ctx.stroke();

    animationRef.current = requestAnimationFrame(draw);
  };

  return (
    <div className="w-full h-24 bg-black/80 backdrop-blur-md rounded-xl border border-neon-blue/20 flex items-center justify-center overflow-hidden relative">
      <canvas
        ref={canvasRef}
        width={600}
        height={100}
        className="w-full h-full"
      />
    </div>
  );
};

export default NierVisualizer;
