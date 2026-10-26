'use client';
import { useEffect } from 'react';
export function PrintTrigger() {
  useEffect(() => { const t = setTimeout(() => window.print(), 500); return () => clearTimeout(t); }, []);
  return (
    <div className="noprint" style={{ textAlign: 'center', marginTop: 24 }}>
      <button onClick={() => window.print()} style={{ background: '#2563eb', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>Print / Save as PDF</button>
    </div>
  );
}
