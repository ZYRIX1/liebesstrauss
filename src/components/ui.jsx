import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from './icons.jsx';

// ---------- Buttons ----------

const variants = {
  primary: 'bg-rose-strong text-white dark:bg-rose dark:text-on-rose shadow-soft active:scale-[0.97]',
  soft: 'bg-rose-soft text-rose-strong active:scale-[0.97]',
  ghost: 'bg-surface-2 text-ink active:scale-[0.97]',
  outline: 'border-2 border-line text-ink active:scale-[0.97]',
  danger: 'bg-[#f6dcdc] text-[#a33a3a] dark:bg-[#4a2626] dark:text-[#f3b3b3] active:scale-[0.97]',
};

export function Button({ variant = 'primary', className = '', loading = false, children, disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-6 text-[17px] font-bold transition-[transform,opacity,background-color] duration-150 disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

export function IconButton({ label, className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid size-12 place-items-center rounded-full text-ink/80 transition active:scale-90 active:bg-surface-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export const Spinner = ({ className = '' }) => (
  <span className={`inline-block size-5 rounded-full border-[2.5px] border-current border-r-transparent spin ${className}`} aria-label="Lädt" />
);

// ---------- Formularfelder ----------

export function Field({ label, hint, error, className = '', inputClassName = '', ...props }) {
  const id = useId();
  return (
    <label htmlFor={id} className={`block ${className}`}>
      <span className="mb-1.5 block px-1 text-sm font-bold text-muted">{label}</span>
      <input
        id={id}
        className={`h-14 w-full rounded-2xl border-2 border-line bg-surface px-4 text-[17px] outline-none transition focus:border-rose placeholder:text-muted/60 ${inputClassName}`}
        {...props}
      />
      {(error || hint) && (
        <span className={`mt-1.5 block px-1 text-sm ${error ? 'font-semibold text-[#b8435b] dark:text-[#f3a3b3]' : 'text-muted'}`}>{error || hint}</span>
      )}
    </label>
  );
}

export function PinField({ onValue, ...props }) {
  return (
    <Field
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={8}
      autoComplete="off"
      inputClassName="tracking-[0.5em] text-center text-xl font-bold"
      {...props}
      onChange={(e) => onValue(e.target.value.replace(/\D/g, ''))}
    />
  );
}

// ---------- Umschalter ----------

export function Segmented({ options, value, onChange, className = '', size = 'lg' }) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="tablist" className={`relative grid rounded-full bg-surface-2 p-1 ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span
        aria-hidden="true"
        className="absolute inset-y-1 rounded-full bg-surface shadow-soft transition-transform duration-300 ease-[cubic-bezier(.3,.8,.3,1)]"
        style={{ width: `calc((100% - 8px) / ${options.length})`, left: 4, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`relative z-10 flex min-w-0 items-center justify-center gap-1.5 rounded-full px-3 font-bold transition-colors ${size === 'lg' ? 'h-12 text-[15px]' : 'h-10 text-sm'} ${o.value === value ? 'text-ink' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Bottom-Sheet ----------

export function Sheet({ open, onClose, title, children, footer }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      setDrag(0);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, 260);
      return () => clearTimeout(t);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const onPointerDown = (e) => { dragStart.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); };
  const onPointerMove = (e) => { if (dragStart.current !== null) setDrag(Math.max(0, e.clientY - dragStart.current)); };
  const onPointerUp = () => {
    if (drag > 90) onClose();
    else setDrag(0);
    dragStart.current = null;
  };

  return createPortal(
    <div className="fixed inset-x-0 z-40 flex flex-col justify-end" style={{ top: 'var(--vvt, 0px)', height: 'var(--vvh, 100dvh)' }}>
      <div
        className={`absolute inset-0 bg-[#2a1a20]/40 backdrop-blur-[2px] transition-opacity duration-250 ${closing ? 'opacity-0' : 'fade-in'}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`relative mx-auto flex max-h-[calc(100%-16px)] w-full max-w-lg flex-col rounded-t-[30px] bg-surface shadow-lift ${closing ? 'translate-y-full transition-transform duration-250 ease-in' : 'sheet-up'}`}
        style={drag ? { transform: `translateY(${drag}px)`, animation: 'none' } : undefined}
      >
        <div
          className="flex shrink-0 touch-none cursor-grab justify-center pb-1 pt-3"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="h-1.5 w-11 rounded-full bg-line" />
        </div>
        {title && (
          <div className="flex shrink-0 items-center justify-between gap-2 px-5 pb-2">
            <h2 id={titleId} className="font-display text-[22px] font-semibold italic">{title}</h2>
            <IconButton label="Schließen" onClick={onClose} className="-mr-2"><IconX /></IconButton>
          </div>
        )}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && <div className="pb-safe shrink-0 border-t border-line/70 px-5 pt-3">{footer}</div>}
        {!footer && <div className="pb-safe" />}
      </div>
    </div>,
    document.body,
  );
}

// ---------- Bestätigungsdialog ----------

export function Confirm({ open, title, text, confirmLabel = 'OK', danger, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-6">
      <div className="absolute inset-0 bg-[#2a1a20]/45 backdrop-blur-[2px] fade-in" onClick={onCancel} />
      <div role="alertdialog" aria-modal="true" className="card-in relative w-full max-w-sm rounded-[28px] bg-surface p-6 text-center shadow-lift">
        <h2 className="font-display text-xl font-semibold italic">{title}</h2>
        {text && <p className="mt-2 text-muted">{text}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={onCancel} className="min-h-12 px-4">Abbrechen</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} className="min-h-12 px-4">{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ---------- Toasts ----------

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const show = useCallback((message, tone = 'info') => {
    clearTimeout(timer.current);
    setToast({ message, tone, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? 4200 : 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && createPortal(
        <div className="pt-safe pointer-events-none fixed left-1/2 top-0 z-[70] w-[min(92vw,420px)]" style={{ transform: 'translateX(-50%)' }}>
          <div
            key={toast.key}
            role="status"
            className={`toast-in mt-2 rounded-2xl px-4 py-3 text-center text-[15px] font-semibold shadow-lift ${toast.tone === 'error' ? 'bg-[#fbe3e3] text-[#9b2f3f] dark:bg-[#4a2626] dark:text-[#f7c2c2]' : 'bg-ink text-bg'}`}
          >
            {toast.message}
          </div>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
