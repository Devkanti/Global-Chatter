import { useEffect, useRef } from 'react';

export default function AudioVisualizer({ stream }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    let audioContext;
    let analyser;
    let source;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      source = audioContext.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 64; // smooth big bars
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const canvas = canvasRef.current;
      const canvasCtx = canvas.getContext('2d');

      const draw = () => {
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;

        animationRef.current = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

        const barWidth = (WIDTH / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 4; 

          // Primary color gradient: var(--primary) is around rgb(59, 130, 246)
          canvasCtx.fillStyle = '#3b82f6';
          canvasCtx.beginPath();
          canvasCtx.roundRect(x, HEIGHT / 2 - barHeight / 2, barWidth - 2, barHeight < 2 ? 2 : barHeight, 4);
          canvasCtx.fill();

          x += barWidth;
        }
      };

      draw();
    } catch (e) {
      console.error('AudioVisualizer error:', e);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (source) source.disconnect();
      if (analyser) analyser.disconnect();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(console.error);
      }
    };
  }, [stream]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={40} 
      style={{ width: '100%', height: '40px', display: 'block', opacity: 0.8 }} 
    />
  );
}
