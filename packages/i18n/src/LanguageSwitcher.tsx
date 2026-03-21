import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from './context';

const C = {
  bg: '#F5F5F7',
  card: '#FFFFFF',
  border: '#E5E5EA',
  text: '#1D1D1F',
  sec: '#86868B',
  blue: '#007AFF',
};

export function LanguageSwitcher() {
  const { locale, setLocale, availableLocales } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = availableLocales.find((l) => l.code === locale);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          background: C.card,
          cursor: 'pointer',
          fontSize: 13,
          color: C.text,
          transition: 'background 0.12s',
        }}
      >
        <span style={{ fontSize: 16 }}>{current?.flag}</span>
        <span>{current?.code.toUpperCase()}</span>
        <span style={{ color: C.sec, fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            overflow: 'hidden',
            minWidth: 170,
            zIndex: 1000,
          }}
        >
          {availableLocales.map((loc) => (
            <button
              key={loc.code}
              role="option"
              aria-selected={loc.code === locale}
              onClick={() => {
                setLocale(loc.code);
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                background: loc.code === locale ? '#007AFF12' : 'transparent',
                color: loc.code === locale ? C.blue : C.text,
                cursor: 'pointer',
                fontSize: 13,
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 18 }}>{loc.flag}</span>
              <span style={{ fontWeight: loc.code === locale ? 600 : 400 }}>
                {loc.name}
              </span>
              {loc.code === locale && (
                <span style={{ marginLeft: 'auto', color: C.blue }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
