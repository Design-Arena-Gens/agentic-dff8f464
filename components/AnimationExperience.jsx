import React, { useEffect, useRef, useState } from 'react';

function chooseHindiMaleVoice() {
  const voices = window.speechSynthesis.getVoices();
  // Prefer hi-IN male or Google voices
  const priorityMatches = [
    (v) => /hi(-|_)IN/i.test(v.lang) && /male|?????/i.test(v.name),
    (v) => /hi(-|_)IN/i.test(v.lang) && /Google|Microsoft|Apple/i.test(v.name),
    (v) => /hi/i.test(v.lang)
  ];
  for (const matcher of priorityMatches) {
    const voice = voices.find(matcher);
    if (voice) return voice;
  }
  return voices[0] || null;
}

function speakHindiLines(lines, onCaption) {
  // Schedule TTS and captions
  let cancelled = false;
  const timeouts = [];
  const startAt = performance.now();

  const schedule = (delayMs, fn) => {
    const id = setTimeout(() => { if (!cancelled) fn(); }, delayMs);
    timeouts.push(id);
  };

  const triggerSpeak = (text) => {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    const voice = chooseHindiMaleVoice();
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang || 'hi-IN';
    utter.rate = 0.95;
    utter.pitch = 0.95;
    window.speechSynthesis.speak(utter);
  };

  lines.forEach((item) => {
    schedule(item.t * 1000, () => {
      onCaption(item.text);
      triggerSpeak(item.text);
    });
  });

  // Clear captions after last line
  const last = lines[lines.length - 1];
  if (last) schedule((last.t + Math.max(3, last.text.length * 0.08)) * 1000, () => onCaption(''));

  return () => {
    cancelled = true;
    timeouts.forEach(clearTimeout);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };
}

function startGenerativeMusic({ volume = 0.15 } = {}) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  const makePad = (freq, detune = 0) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = detune;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.09 + Math.random() * 0.04;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 6 + Math.random() * 10; // gentle vibrato/filter sway

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1600;
    filter.Q.value = 0.4;

    const amp = ctx.createGain();
    amp.gain.value = 0.0; // fade in

    const delay = ctx.createDelay();
    delay.delayTime.value = 0.35;
    const fb = ctx.createGain();
    fb.gain.value = 0.35;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    osc.connect(filter);
    filter.connect(amp);

    // Small shimmer
    amp.connect(delay);
    delay.connect(fb);
    fb.connect(delay);

    // Mix
    delay.connect(master);
    amp.connect(master);

    osc.start();
    lfo.start();

    // Slow fade in
    const now = ctx.currentTime;
    amp.gain.setTargetAtTime(0.35, now + 0.05, 3.0);

    return { stop: () => { try { osc.stop(); lfo.stop(); } catch(_){} } };
  };

  // A minor warm pad: A3, C4, E4, G4
  const base = 220; // A3
  const pads = [
    makePad(base, -4),
    makePad(base * Math.pow(2, 3/12)), // C4
    makePad(base * Math.pow(2, 7/12), +3), // E4
    makePad(base * Math.pow(2, 10/12), -7) // G4
  ];

  // Occasional gentle swells
  const swellGain = ctx.createGain();
  swellGain.gain.value = 0;
  swellGain.connect(master);

  const noise = ctx.createOscillator();
  noise.type = 'triangle';
  noise.frequency.value = 55;
  const noiseAmp = ctx.createGain();
  noiseAmp.gain.value = 0.0;
  noise.connect(noiseAmp);
  noiseAmp.connect(swellGain);
  noise.start();

  let running = true;
  (function loop(){
    if (!running) return;
    const now = ctx.currentTime;
    const target = Math.random() * 0.08 + 0.02;
    swellGain.gain.cancelScheduledValues(now);
    swellGain.gain.linearRampToValueAtTime(target, now + 4);
    swellGain.gain.linearRampToValueAtTime(0.0, now + 10);
    setTimeout(loop, 9000);
  })();

  return {
    context: ctx,
    stop: () => {
      running = false;
      pads.forEach(p => p.stop());
      try { noise.stop(); } catch(_){ }
      ctx.close();
    }
  };
}

export default function AnimationExperience(){
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const musicRef = useRef(null);
  const [caption, setCaption] = useState('');
  const cleanupSpeechRef = useRef(() => {});

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      cleanupSpeechRef.current?.();
      musicRef.current?.stop?.();
    };
  }, []);

  const startAll = async () => {
    setStarted(true);
    // Start music
    if (!muted) {
      try {
        musicRef.current = startGenerativeMusic({ volume: 0.14 });
      } catch(_){}
    }
    // Start speech + captions
    const lines = [
      { t: 0.6, text: '??? ???? ??, ?? ?????? ??? ????? ???' },
      { t: 5.5, text: '??? ???? ????????? ??????? ?? ??? ?? ??????' },
      { t: 11.5, text: '????? ?? ????? ??????? ?? ?? ????? ???' },
      { t: 17.5, text: '????? ???, ???? ??? ?? ????? ????' },
      { t: 23.5, text: '?? ??? ?? ???, ?? ??? ??????? ???? ???, ????? ?????' },
      { t: 31.0, text: '????? ?? ???? ?????? ???? ???? ??, ???? ??? ????? ?? ???? ???' },
      { t: 38.0, text: '???????? ????? ??? ??? ??? ????? ?? ?? ????? ?? ?? ??? ?????' },
      { t: 46.0, text: '???, ??? ???? ????? ?????? ?? ???? ?? ???????' }
    ];
    cleanupSpeechRef.current = speakHindiLines(lines, setCaption);
    // Start animation
    startAnimation(canvasRef);
  };

  const toggleMute = () => {
    if (muted) {
      // Unmute
      setMuted(false);
      try { musicRef.current = startGenerativeMusic({ volume: 0.14 }); } catch(_){}
    } else {
      setMuted(true);
      try { musicRef.current?.stop?.(); } catch(_){}
    }
  };

  return (
    <>
      <canvas ref={canvasRef} className="canvas" />
      <div className="badge">9:16 Cinematic ? Hindi</div>
      <button className="mute" onClick={toggleMute}>{muted ? 'Unmute' : 'Mute'}</button>
      {!started && (
        <div className="overlay">
          <div className="start">
            <h1>??? ?? ?????</h1>
            <p>??? ???? ? Tap to Start (audio + TTS)</p>
            <button onClick={startAll}>Start</button>
          </div>
        </div>
      )}
      {caption && <div className="caption">{caption}</div>}
    </>
  );
}

function startAnimation(canvasRef){
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0, dpr = 1;

  const state = {
    t0: performance.now(),
  };

  const resize = () => {
    const rect = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = Math.floor(rect.width * dpr);
    height = Math.floor(rect.height * dpr);
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.imageSmoothingEnabled = true;
  };

  const onResize = () => { resize(); };
  window.addEventListener('resize', onResize);
  resize();

  const draw = (now) => {
    const t = (now - state.t0) / 1000; // seconds

    // Background gradient night sky (dark brown tones)
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#17110d');
    g.addColorStop(0.5, '#0f0b09');
    g.addColorStop(1, '#0a0705');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Soft vignette
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, width, height);

    // Streetlight glow (golden)
    const px = width * 0.78;
    const py = height * 0.25;
    const glow = ctx.createRadialGradient(px, py, 10, px, py, height * 0.45);
    glow.addColorStop(0.0, 'rgba(202,162,94,0.85)');
    glow.addColorStop(0.2, 'rgba(202,162,94,0.25)');
    glow.addColorStop(1.0, 'rgba(202,162,94,0.0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, height * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Streetlight pole
    ctx.strokeStyle = '#3b2d22';
    ctx.lineWidth = Math.max(2, width * 0.004);
    ctx.beginPath();
    ctx.moveTo(px, py - height * 0.18);
    ctx.lineTo(px, height * 0.9);
    ctx.stroke();
    // Lamp head
    ctx.fillStyle = '#caa25e';
    ctx.beginPath();
    ctx.arc(px, py - height * 0.18, width * 0.02, 0, Math.PI * 2);
    ctx.fill();

    // Ground plane
    ctx.fillStyle = '#1a130f';
    ctx.fillRect(0, height * 0.82, width, height * 0.18);

    // Background silhouettes (judging people)
    const peopleBaseY = height * 0.78;
    const numPeople = 6;
    for (let i = 0; i < numPeople; i++) {
      const x = (width * 0.1) + i * (width * 0.1);
      const sway = Math.sin(t * 0.8 + i) * 2;
      drawSilhouette(ctx, x, peopleBaseY + sway, width * 0.04, '#201610', 0.6);
    }

    // Boy at desk working (left)
    const deskX = width * 0.18;
    const deskY = height * 0.7;
    const deskW = width * 0.42;
    const deskH = height * 0.08;
    ctx.fillStyle = '#2b1f18';
    roundRect(ctx, deskX, deskY, deskW, deskH, 8 * dpr);

    // Lamp on desk (soft)
    const lampX = deskX + deskW * 0.8;
    const lampY = deskY - height * 0.08;
    drawDeskLamp(ctx, lampX, lampY, width, height, t);

    // Boy body
    const boyX = deskX + deskW * 0.25;
    const boyY = deskY - height * 0.14;
    drawBoy(ctx, boyX, boyY, width, height, t);

    // Old wise man under streetlight (right)
    const elderX = px - width * 0.08 + Math.sin(t * 0.4) * 2;
    const elderY = height * 0.74;
    drawElder(ctx, elderX, elderY, width, height, t);

    rafRef.current = requestAnimationFrame(draw);
  };

  const rafRef = { current: 0 };
  const loop = (now) => draw(now);
  rafRef.current = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(rafRef.current);
    window.removeEventListener('resize', onResize);
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function drawSilhouette(ctx, x, baseY, size, color, alpha){
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  // body
  ctx.beginPath();
  ctx.ellipse(x, baseY, size * 0.6, size * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // head
  ctx.beginPath();
  ctx.arc(x, baseY - size * 1.1, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDeskLamp(ctx, x, y, width, height, t){
  ctx.save();
  ctx.fillStyle = '#3a2a21';
  ctx.fillRect(x - width * 0.002, y - height * 0.02, width * 0.004, height * 0.04);
  ctx.beginPath();
  ctx.arc(x, y - height * 0.02, width * 0.015, 0, Math.PI * 2);
  ctx.fillStyle = '#caa25e';
  ctx.fill();
  const glow = ctx.createRadialGradient(x, y - height * 0.02, 2, x, y - height * 0.02, height * 0.2);
  glow.addColorStop(0, 'rgba(202,162,94,0.5)');
  glow.addColorStop(1, 'rgba(202,162,94,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y - height * 0.02, height * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function drawBoy(ctx, x, y, width, height, t){
  ctx.save();
  // Body
  ctx.fillStyle = '#2a1e18';
  roundRect(ctx, x - width * 0.05, y - height * 0.02, width * 0.1, height * 0.12, 10);
  // Head bob
  const bob = Math.sin(t * 2.2) * (height * 0.004);
  // Head
  ctx.fillStyle = '#cfa888';
  ctx.beginPath();
  ctx.arc(x, y - height * 0.05 + bob, width * 0.03, 0, Math.PI * 2);
  ctx.fill();
  // Hair
  ctx.fillStyle = '#3b2b23';
  ctx.beginPath();
  ctx.arc(x, y - height * 0.058 + bob, width * 0.032, Math.PI, 0);
  ctx.fill();
  // Arm writing
  const armAngle = -0.5 + Math.sin(t * 3.0) * 0.08;
  ctx.translate(x + width * 0.02, y + height * 0.01);
  ctx.rotate(armAngle);
  ctx.fillStyle = '#2a1e18';
  roundRect(ctx, -width * 0.01, -height * 0.005, width * 0.06, height * 0.012, 6);
  ctx.restore();

  // Book on desk
  ctx.save();
  ctx.fillStyle = '#f0e7d5';
  roundRect(ctx, x - width * 0.03, y + height * 0.04, width * 0.16, height * 0.02, 4);
  ctx.restore();
}

function drawElder(ctx, x, y, width, height, t){
  ctx.save();
  // Robe
  ctx.fillStyle = '#2a211a';
  roundRect(ctx, x - width * 0.04, y - height * 0.09, width * 0.08, height * 0.16, 10);
  // Head
  ctx.fillStyle = '#d9c1a8';
  ctx.beginPath();
  ctx.arc(x, y - height * 0.12 + Math.sin(t * 0.6) * 2, width * 0.025, 0, Math.PI * 2);
  ctx.fill();
  // Beard
  ctx.fillStyle = '#c7b299';
  ctx.beginPath();
  ctx.ellipse(x, y - height * 0.1, width * 0.02, height * 0.018, 0, 0, Math.PI * 2);
  ctx.fill();
  // Staff
  ctx.fillStyle = '#4a3a2f';
  ctx.fillRect(x + width * 0.035, y - height * 0.17, width * 0.006, height * 0.2);
  ctx.restore();
}
