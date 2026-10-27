'use client';
import { useEffect, useRef, useState } from 'react';

type Item = { sku: string; name: string };
declare global { interface Window { QRCode?: any } }

export function QrLabels({ items }: { items: Item[] }) {
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.QRCode) { setReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.async = true;
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    if (!ready || !window.QRCode || !ref.current) return;
    const nodes = ref.current.querySelectorAll('[data-sku]');
    nodes.forEach((n) => {
      const el = n as HTMLElement;
      if (el.getAttribute('data-done')) return;
      el.innerHTML = '';
      new window.QRCode(el, { text: el.getAttribute('data-sku') || '', width: 120, height: 120, correctLevel: window.QRCode.CorrectLevel.M });
      el.setAttribute('data-done', '1');
    });
  }, [ready, items]);

  return (
    <section>
      <div className="noprint" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>QR labels</h1>
        <span className="muted">{items.length} item{items.length === 1 ? '' : 's'}</span>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>Print</button>
      </div>
      {items.length === 0
        ? <p className="muted">No inventory items yet.</p>
        : <div ref={ref} className="qrlabels">
            {items.map((it) => (
              <div key={it.sku} className="qrlabel">
                <div data-sku={it.sku} className="qrlabel__code" />
                <div className="qrlabel__name">{it.name}</div>
                <div className="qrlabel__sku">{it.sku}</div>
              </div>
            ))}
          </div>}
    </section>
  );
}

export default QrLabels;
