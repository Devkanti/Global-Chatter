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
      analyser.smoothingTimeConstant = 0.85;
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

        const activeBars = Math.floor(WIDTH / 6); // 6px per bar (4px width + 2px gap)
        const barWidth = 3;
        let x = 0;

        for (let i = 0; i < activeBars; i++) {
          const volume = dataArray[i * Math.floor(bufferLength / activeBars)] || 0;
          const normalizedVol = volume / 255;
          let barHeight = (normalizedVol * HEIGHT * 0.9) + 4; 

          if (barHeight < 4) barHeight = 4;

          canvasCtx.fillStyle = '#10b981'; // WhatsApp green color
          canvasCtx.beginPath();
          canvasCtx.roundRect(x, HEIGHT / 2 - barHeight / 2, barWidth, barHeight, barWidth / 2);
          canvasCtx.fill();

          x += 6; // 3px bar + 3px gap
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
