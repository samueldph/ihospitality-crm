'use client';
import { useEffect, useRef, useState } from 'react';
import { lookupItem, adjustByCode } from '@/server/actions/scan';

type Item = { id: string; sku: string; name: string; quantity: number; location: string | null; status: string };
declare global { interface Window { Html5Qrcode?: any } }

export default function ScanPage() {
  const [ready, setReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [msg, setMsg] = useState('');
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Html5Qrcode) { setReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
    s.async = true;
    s.onload = () => setReady(true);
    s.onerror = () => setMsg('Could not load the scanner. Check your connection.');
    document.body.appendChild(s);
    return () => { try { scannerRef.current?.stop(); } catch (e) { /* noop */ } };
  }, []);

  async function onDecoded(text: string) {
    setMsg('');
    try { await scannerRef.current?.pause(true); } catch (e) { /* noop */ }
    setScanning(false);
    const found = await lookupItem(text);
    setItem(found as Item | null);
    if (!found) setMsg('No item matches: ' + text);
  }

  async function startScan() {
    if (!window.Html5Qrcode) { setMsg('Scanner not ready yet.'); return; }
    setItem(null); setMsg('');
    try {
      if (!scannerRef.current) scannerRef.current = new window.Html5Qrcode('reader');
      await scannerRef.current.start({ facingMode: 'environment' }, { fps: 10, qrbox: 240 }, (t: string) => onDecoded(t), () => {});
      setScanning(true);
    } catch (e: any) {
      setMsg('Camera error: ' + (e?.message || 'permission denied or no camera'));
    }
  }

  async function stopScan() {
    try { await scannerRef.current?.stop(); } catch (e) { /* noop */ }
    setScanning(false);
  }

  async function adjust(delta: number) {
    if (!item) return;
    try {
      const next = await adjustByCode(item.sku, delta);
      setItem({ ...item, quantity: next as number });
      setMsg('Updated.');
    } catch (e: any) { setMsg(e?.message || 'Update failed'); }
  }

  return (
    <section>
      <h1>Scan stock</h1>
      <p className="muted">Point the camera at an item&apos;s QR label to look it up and adjust its count.</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <div id="reader" style={{ width: '100%', maxWidth: 360, margin: '0 auto' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
          {!scanning
            ? <button className="btn" onClick={startScan} disabled={!ready}>{ready ? 'Start camera' : 'Loading...'}</button>
            : <button className="btn" onClick={stopScan} style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' }}>Stop</button>}
        </div>
        {msg && <p className="muted" style={{ textAlign: 'center', marginTop: 10 }}>{msg}</p>}
      </div>

      {item && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{item.name}</h3>
          <p className="muted" style={{ marginTop: 0 }}>{item.sku}{item.location ? ' - ' + item.location : ''} - {item.status}</p>
          <div style={{ fontSize: 34, fontWeight: 800, margin: '8px 0' }}>{item.quantity} <span style={{ fontSize: 14, fontWeight: 400 }} className="muted">in stock</span></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => adjust(1)}>+1</button>
            <button className="btn" onClick={() => adjust(5)}>+5</button>
            <button className="btn" onClick={() => adjust(-1)} style={{ background: '#b4482f' }}>-1</button>
            <button className="btn" onClick={() => adjust(-5)} style={{ background: '#b4482f' }}>-5</button>
            <button className="btn" onClick={startScan} style={{ marginLeft: 'auto', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' }}>Scan next</button>
          </div>
        </div>
      )}
    </section>
  );
}
