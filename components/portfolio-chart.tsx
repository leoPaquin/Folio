'use client';

import { useEffect, useRef, useState } from 'react';
import { usePortfolio } from './portfolio-provider';

export function PortfolioChart() {
  const { state, hidden } = usePortfolio();
  const [period, setPeriod] = useState('6M');
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    function draw() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      const c = canvas.getContext('2d'); if (!c) return;
      c.scale(dpr, dpr);
      const W = rect.width, H = rect.height, R = 62, T = 15, B = 26, days = ({ '1M': 30, '3M': 90, '6M': 180, '1A': 365, Tout: 730 })[period] || 180;
      const data = state.snapshots.filter(s => new Date(s.date).getTime() >= Date.now() - days * 86400000).sort((a, b) => a.date.localeCompare(b.date));
      if (data.length < 2) { c.fillStyle = '#929c92'; c.font = '12px system-ui'; c.textAlign = 'center'; c.fillText(data.length ? 'Le prochain relevé complétera votre historique.' : 'Aucun relevé enregistré.', W / 2, H / 2); return; }
      const values = data.flatMap(s => [s.value, s.cost]), low = Math.min(...values) * .93, high = Math.max(...values) * 1.04, range = high - low || 1;
      const first = new Date(data[0].date).getTime(), last = new Date(data.at(-1)!.date).getTime();
      const x = (i: number) => 4 + (new Date(data[i].date).getTime() - first) / (last - first || 1) * (W - R - 4);
      const y = (v: number) => T + (high - v) / range * (H - T - B);
      c.font = '9px system-ui'; c.textAlign = 'left';
      for (let i = 0; i < 4; i++) { const yy = T + i / 3 * (H - T - B); c.strokeStyle = '#e4e9e2'; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(4, yy); c.lineTo(W - R, yy); c.stroke(); c.fillStyle = '#929d91'; c.fillText(hidden ? '•••' : new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 0 }).format(high - i / 3 * range) + ' $', W - R + 8, yy + 3); }
      c.setLineDash([]); c.beginPath(); data.forEach((s, i) => i ? c.lineTo(x(i), y(s.value)) : c.moveTo(x(i), y(s.value))); c.lineTo(x(data.length - 1), H - B); c.lineTo(4, H - B); c.closePath();
      const gradient = c.createLinearGradient(0, T, 0, H - B); gradient.addColorStop(0, '#e0ecdd'); gradient.addColorStop(1, '#f8f9f8'); c.fillStyle = gradient; c.fill();
      for (const key of ['cost', 'value'] as const) { c.beginPath(); c.strokeStyle = key === 'value' ? '#42775a' : '#aab7a4'; c.lineWidth = key === 'value' ? 2 : 1.2; c.setLineDash(key === 'value' ? [] : [4, 4]); data.forEach((s, i) => i ? c.lineTo(x(i), y(s[key])) : c.moveTo(x(i), y(s[key]))); c.stroke(); }
      c.setLineDash([]); c.fillStyle = '#8d988c';
      const labels = Math.min(5, data.length);
      for (let i = 0; i < labels; i++) { const index = Math.round(i * (data.length - 1) / (labels - 1)); c.textAlign = i === 0 ? 'left' : i === labels - 1 ? 'right' : 'center'; c.fillText(new Date(data[index].date + 'T12:00:00').toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' }), x(index), H - 3); }
    }
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => observer.disconnect();
  }, [state.snapshots, period, hidden]);
  return <section className="chart-section"><div className="section-head"><div><h2>Évolution du portefeuille</h2><p className="section-sub">Valeur totale en dollars canadiens</p></div><div className="segmented" aria-label="Période">{['1M', '3M', '6M', '1A', 'Tout'].map(p => <button className={period === p ? 'active' : ''} key={p} onClick={() => setPeriod(p)}>{p}</button>)}</div></div><div className="chart-wrap"><canvas ref={ref} role="img" aria-label="Évolution de la valeur et du coût de revient du portefeuille" /></div><div className="legend-line"><span><i />Valeur du portefeuille</span><span><i className="gray" />Coût de revient</span></div><p className="chart-note">Relevés enregistrés lors de vos modifications</p></section>;
}
