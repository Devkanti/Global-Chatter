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

        // Calculate actual width needed for bars (use middle frequencies mostly)
        const activeBars = Math.floor(bufferLength * 0.7); 
        const barWidth = (WIDTH / activeBars) * 1.2;
        let x = 0;

        // Create glowing gradient
        const gradient = canvasCtx.createLinearGradient(0, 0, WIDTH, 0);
        gradient.addColorStop(0, '#a855f7'); // purple
        gradient.addColorStop(0.5, '#ec4899'); // pink
        gradient.addColorStop(1, '#f43f5e'); // rose

        for (let i = 0; i < activeBars; i++) {
          // Add a subtle wave base + actual volume
          const volume = dataArray[i];
          const normalizedVol = volume / 255;
          let barHeight = (normalizedVol * HEIGHT * 0.8) + 2; 

          // Apply some easing so low volumes still show a small bump
          if (barHeight < 4) barHeight = 4;

          canvasCtx.fillStyle = gradient;
          canvasCtx.shadowBlur = 8;
          canvasCtx.shadowColor = gradient;
          
          canvasCtx.beginPath();
          canvasCtx.roundRect(x, HEIGHT / 2 - barHeight / 2, barWidth - 2, barHeight, (barWidth - 2) / 2);
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
