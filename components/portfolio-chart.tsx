'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePortfolio } from './portfolio-provider';
import { HISTORY_PERIODS, historyForPeriod, snapshotTime, type HistoryPeriod } from '../lib/history';
import { money } from '../lib/portfolio';

export function PortfolioChart() {
  const { state, hidden } = usePortfolio();
  const [period, setPeriod] = useState<HistoryPeriod>('6M');
  const data = useMemo(() => historyForPeriod(state.snapshots, period), [state.snapshots, period]);
  const latest = data.at(-1);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    function draw() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      const c = canvas.getContext('2d'); if (!c || !rect.width || !rect.height) return;
      c.scale(dpr, dpr);
      const W = rect.width, H = rect.height, R = Math.min(95, W * .3), T = 18, B = 28;
      if (!data.length) {
        c.fillStyle = '#929c92'; c.font = '12px system-ui'; c.textAlign = 'center';
        c.fillText('Aucune valorisation sur cette période.', W / 2, H / 2);
        return;
      }
      const values = data.flatMap(s => [s.value, s.cost]);
      const min = Math.min(...values), max = Math.max(...values), padding = Math.max((max - min) * .12, max * .025, 1);
      const low = Math.max(0, min - padding), high = max + padding, range = high - low || 1;
      const first = snapshotTime(data[0]), last = snapshotTime(data.at(-1)!);
      const plotWidth = Math.max(1, W - R - 8);
      const x = (i: number) => 8 + (data.length === 1 ? .5 : last === first ? i / (data.length - 1) : (snapshotTime(data[i]) - first) / (last - first)) * plotWidth;
      const y = (value: number) => T + (high - value) / range * (H - T - B);
      c.font = '9px system-ui'; c.textAlign = 'left';
      for (let i = 0; i < 4; i++) {
        const yy = T + i / 3 * (H - T - B);
        c.strokeStyle = '#e4e9e2'; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(8, yy); c.lineTo(W - R, yy); c.stroke();
        c.fillStyle = '#929d91'; c.fillText(hidden ? '•••' : new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 0, notation: high >= 1_000_000 ? 'compact' : 'standard' }).format(high - i / 3 * range) + ' $', W - R + 8, yy + 3);
      }
      if (data.length > 1) {
        c.setLineDash([]); c.beginPath();
        data.forEach((s, i) => i ? c.lineTo(x(i), y(s.value)) : c.moveTo(x(i), y(s.value)));
        c.lineTo(x(data.length - 1), H - B); c.lineTo(x(0), H - B); c.closePath();
        const gradient = c.createLinearGradient(0, T, 0, H - B);
        gradient.addColorStop(0, '#e0ecdd'); gradient.addColorStop(1, '#f8f9f8'); c.fillStyle = gradient; c.fill();
      }
      for (const key of ['cost', 'value'] as const) {
        c.beginPath(); c.strokeStyle = key === 'value' ? '#42775a' : '#aab7a4'; c.lineWidth = key === 'value' ? 2 : 1.2; c.setLineDash(key === 'value' ? [] : [4, 4]);
        data.forEach((s, i) => i ? c.lineTo(x(i), y(s[key])) : c.moveTo(x(i), y(s[key]))); c.stroke();
        c.setLineDash([]); c.fillStyle = key === 'value' ? '#42775a' : '#aab7a4';
        c.beginPath(); c.arc(x(data.length - 1), y(data.at(-1)![key]), key === 'value' ? 4 : 3, 0, Math.PI * 2); c.fill();
      }
      c.setLineDash([]); c.fillStyle = '#8d988c';
      const sameDay = new Date(first).toLocaleDateString('fr-CA') === new Date(last).toLocaleDateString('fr-CA');
      const labels = Math.min(W < 400 ? 3 : 5, data.length);
      for (let i = 0; i < labels; i++) {
        const index = labels === 1 ? 0 : Math.round(i * (data.length - 1) / (labels - 1));
        const snapshot = data[index];
        const stamp = new Date(snapshot.capturedAt || snapshot.date + 'T12:00:00');
        const label = data.length > 1 && last === first ? (index === 0 ? 'Avant' : 'Après')
          : snapshot.capturedAt && (sameDay || period === '1J') ? stamp.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
          : stamp.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
        c.textAlign = labels === 1 ? 'center' : i === 0 ? 'left' : i === labels - 1 ? 'right' : 'center';
        c.fillText(label, x(index), H - 3);
      }
    }
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => observer.disconnect();
  }, [data, period, hidden]);
  const lastLabel = latest ? latest.capturedAt ? new Date(latest.capturedAt).toLocaleString('fr-CA') : latest.date : '';
  return <section className="chart-section"><div className="section-head"><div><h2>Évolution du portefeuille</h2><p className="section-sub">Valeur totale en dollars canadiens</p></div><div className="segmented" aria-label="Période">{HISTORY_PERIODS.map(p => <button className={period === p ? 'active' : ''} key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>{p}</button>)}</div></div>
    {latest && <p className="chart-latest" aria-live="polite"><strong>{hidden ? '•••' : money(latest.value)}</strong><span>Valorisation enregistrée le {lastLabel}</span></p>}
    <div className="chart-wrap"><canvas ref={ref} role="img" aria-label={'Évolution de la valeur et du coût de revient du portefeuille. ' + data.length + ' valorisations sur la période.'} /></div>
    <div className="legend-line"><span><i />Valeur du portefeuille</span><span><i className="gray" />Coût de revient</span></div>
    <p className="chart-note">{data.length === 1 ? 'Premier point enregistré. La prochaine actualisation prolongera la courbe.' : 'Un point à chaque application des cours ou modification enregistrée. Vue 1J : les dernières 24 heures.'}</p>
  </section>;
}
