import React, { useEffect, useRef, useState } from 'react';

// Hardcoded fallback baseline as per error-handling specs
const FALLBACK_PPM = 421.08; 

export const CO2Clock: React.FC<{ initialPpm?: number; compact?: boolean }> = ({ initialPpm, compact }) => {
  const [ppm, setPpm] = useState(initialPpm || FALLBACK_PPM);
  const [announcedPpm, setAnnouncedPpm] = useState(initialPpm || FALLBACK_PPM);
  const [tick, setTick] = useState(false);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    const interval = setInterval(() => setAnnouncedPpm(ppm), 5000);
    return () => clearInterval(interval);
  }, [ppm]);

  useEffect(() => {
    let isVisible = document.visibilityState === 'visible';
    let tickTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
      if (isVisible) {
        lastTimeRef.current = performance.now();
        requestRef.current = requestAnimationFrame(animate);
      } else if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const animate = (time: number) => {
      if (!isVisible) return;
      const delta = time - lastTimeRef.current;
      if (delta > 150) { // Update visually every 150ms
        setPpm(prev => prev + 0.000005);
        setTick(true);
        if (tickTimeout) clearTimeout(tickTimeout);
        tickTimeout = setTimeout(() => setTick(false), 50);
        lastTimeRef.current = time;
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    if (isVisible) {
      requestRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (tickTimeout) clearTimeout(tickTimeout);
    };
  }, []);

  const hiddenAriaLabel = (
    <div 
      aria-live="polite" 
      style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}
    >
      {`Current atmospheric CO2 is ${announcedPpm.toFixed(3)} parts per million`}
    </div>
  );

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative' }}>
        {hiddenAriaLabel}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }} aria-hidden="true">
          <span className="text-caption">LIVE CO₂</span>
          <span className={`text-hero-number ${tick ? 'animate-tick' : ''}`} style={{ fontSize: '1.5rem', margin: 0, lineHeight: 1 }}>
            {ppm.toFixed(4)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="glass-panel" 
      style={{ padding: '1.5rem', textAlign: 'center', minWidth: '250px', position: 'relative' }}
    >
      {hiddenAriaLabel}
      <div aria-hidden="true">
        <h3 className="text-caption" style={{ margin: 0 }}>
          Live Atmospheric CO₂
        </h3>
        <div className={`text-hero-number ${tick ? 'animate-tick' : ''}`} style={{ margin: '0.5rem 0' }}>
          {ppm.toFixed(4)} <span className="text-body">ppm</span>
        </div>
        <p className="text-caption" style={{ margin: 0 }}>
          Baseline: NOAA Global Monitoring
        </p>
      </div>
    </div>
  );
};
