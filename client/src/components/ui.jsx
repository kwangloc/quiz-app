import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/* ==========================================================================
   Shared UI kit
   --------------------------------------------------------------------------
   Every screen in the app is assembled from these pieces, so spacing, radii,
   type scale and colour all stay in step. Colour comes from the `accent`
   token, which the page wrapper re-tints per role (see styles/index.css).
   ========================================================================== */

export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

/* -------------------------------------------------------------- Icons ---- */
// Inline so the app stays fully offline — no icon font, no CDN.
function Svg({ children, className = 'w-5 h-5', ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const Icon = {
  Search: (p) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  ),
  Check: (p) => (
    <Svg {...p}>
      <path d="m4 12.5 5 5L20 6.5" />
    </Svg>
  ),
  Close: (p) => (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  ),
  ArrowLeft: (p) => (
    <Svg {...p}>
      <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
    </Svg>
  ),
  ArrowRight: (p) => (
    <Svg {...p}>
      <path d="M5 12h14m0 0-6-6m6 6-6 6" />
    </Svg>
  ),
  Clock: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Svg>
  ),
  User: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  ),
  Building: (p) => (
    <Svg {...p}>
      <path d="M4 20h16M6 20V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15M14 9h3a1 1 0 0 1 1 1v10" />
      <path d="M9 8h2M9 12h2M9 16h2" />
    </Svg>
  ),
  Doc: (p) => (
    <Svg {...p}>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
      <path d="M14 3v4h4M9 13h6M9 17h4" />
    </Svg>
  ),
  Plus: (p) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  Pencil: (p) => (
    <Svg {...p}>
      <path d="M16.5 4.5a2.12 2.12 0 0 1 3 3L8 19l-4 1 1-4z" />
    </Svg>
  ),
  Trash: (p) => (
    <Svg {...p}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </Svg>
  ),
  Download: (p) => (
    <Svg {...p}>
      <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
    </Svg>
  ),
  Upload: (p) => (
    <Svg {...p}>
      <path d="M12 16V5m0 0L8 9m4-4 4 4M5 19h14" />
    </Svg>
  ),
  Refresh: (p) => (
    <Svg {...p}>
      <path d="M20 11a8 8 0 0 0-13.6-4.6L4 9m0-5v5h5" />
      <path d="M4 13a8 8 0 0 0 13.6 4.6L20 15m0 5v-5h-5" />
    </Svg>
  ),
  Alert: (p) => (
    <Svg {...p}>
      <path d="M12 4.5 2.8 20h18.4z" />
      <path d="M12 10v4m0 3h.01" />
    </Svg>
  ),
  Info: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8h.01" />
    </Svg>
  ),
  CheckCircle: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </Svg>
  ),
  Play: (p) => (
    <Svg {...p}>
      <path d="M7 5.5v13l11-6.5z" />
    </Svg>
  ),
  Logout: (p) => (
    <Svg {...p}>
      <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
      <path d="M10 8 6 12l4 4M6 12h9" />
    </Svg>
  ),
  Lock: (p) => (
    <Svg {...p}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
    </Svg>
  ),
  List: (p) => (
    <Svg {...p}>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </Svg>
  ),
  Chart: (p) => (
    <Svg {...p}>
      <path d="M4 20h16M7 20v-6M12 20V7M17 20v-9" />
    </Svg>
  ),
  Sheet: (p) => (
    <Svg {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 10h16M10 10v10" />
    </Svg>
  ),
  Inbox: (p) => (
    <Svg {...p}>
      <path d="M4 13h4l1.5 3h5L16 13h4" />
      <path d="M5.5 5h13l1.5 8v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5z" />
    </Svg>
  ),
}

/* ------------------------------------------------------------- Spinner --- */
export function Spinner({ className = 'w-5 h-5' }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/* -------------------------------------------------------------- Button --- */
const BUTTON_VARIANTS = {
  primary:
    'bg-accent-600 text-white shadow-sm hover:bg-accent-700 active:bg-accent-800 disabled:bg-slate-300 disabled:shadow-none',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 disabled:text-slate-400 disabled:bg-slate-50',
  soft: 'bg-accent-50 text-accent-700 border border-accent-200 hover:bg-accent-100 active:bg-accent-200 disabled:text-slate-400 disabled:bg-slate-50 disabled:border-slate-200',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 disabled:text-slate-300',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 disabled:bg-slate-300 disabled:shadow-none',
  dangerGhost:
    'text-rose-600 border border-rose-200 bg-white hover:bg-rose-50 hover:border-rose-300 active:bg-rose-100',
  onDark:
    'bg-white/10 text-white border border-white/30 backdrop-blur-sm hover:bg-white/20 active:bg-white/25',
}

const BUTTON_SIZES = {
  xs: 'h-8 px-2.5 text-xs gap-1.5 rounded-lg',
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
  xl: 'h-14 px-7 text-lg gap-2.5 rounded-xl',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: IconCmp,
  iconRight: IconRight,
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...rest
}) {
  const iconSize = size === 'xs' || size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center font-semibold transition-colors duration-150',
        'disabled:cursor-not-allowed select-none whitespace-nowrap',
        BUTTON_SIZES[size],
        BUTTON_VARIANTS[variant],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? (
        <Spinner className={iconSize} />
      ) : (
        IconCmp && <IconCmp className={iconSize} />
      )}
      {children}
      {IconRight && !loading && <IconRight className={iconSize} />}
    </button>
  )
}

/* ---------------------------------------------------------------- Card --- */
export function Card({ className, children, ...rest }) {
  return (
    <section
      className={cx(
        'bg-white rounded-2xl border border-slate-200 shadow-card',
        className
      )}
      {...rest}
    >
      {children}
    </section>
  )
}

export function CardHeader({ title, description, icon: IconCmp, actions, className }) {
  return (
    <div
      className={cx(
        'flex flex-wrap items-start justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200',
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {IconCmp && (
          <span className="mt-0.5 grid place-items-center w-9 h-9 rounded-xl bg-accent-50 text-accent-600 shrink-0">
            <IconCmp className="w-5 h-5" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-sm text-slate-500 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, children }) {
  return <div className={cx('p-5 sm:p-6', className)}>{children}</div>
}

/* --------------------------------------------------------------- Badge --- */
const BADGE_TONES = {
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  accent: 'bg-accent-50 text-accent-700 border-accent-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
}

export function Badge({ tone = 'neutral', icon: IconCmp, className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap',
        BADGE_TONES[tone],
        className
      )}
    >
      {IconCmp && <IconCmp className="w-3.5 h-3.5" />}
      {children}
    </span>
  )
}

/* --------------------------------------------------------------- Forms --- */
export function Field({ label, hint, error, required, htmlFor, children, className }) {
  return (
    <div className={cx('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-rose-600 flex items-center gap-1">
          <Icon.Alert className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-slate-500 leading-relaxed">{hint}</p>
      )}
    </div>
  )
}

const INPUT_BASE =
  'w-full rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 ' +
  'transition-colors hover:border-slate-400 focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15 focus:outline-none ' +
  'disabled:bg-slate-50 disabled:text-slate-400'

export function Input({ className, size = 'md', ...rest }) {
  const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-3.5 text-sm', lg: 'h-12 px-4 text-base' }
  return <input className={cx(INPUT_BASE, sizes[size], className)} {...rest} />
}

export function Select({ className, size = 'md', children, ...rest }) {
  const sizes = { sm: 'h-9 pl-3 pr-9 text-sm', md: 'h-11 pl-3.5 pr-10 text-sm' }
  return (
    <div className="relative inline-block w-full">
      <select
        className={cx(INPUT_BASE, sizes[size], 'appearance-none cursor-pointer', className)}
        {...rest}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}

export function SearchInput({ value, onChange, onClear, className, ...rest }) {
  return (
    <div className={cx('relative', className)}>
      <Icon.Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        className={cx(INPUT_BASE, 'h-12 pl-11 pr-10 text-base')}
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Xóa tìm kiếm"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 grid place-items-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <Icon.Close className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

/**
 * The native file input renders an OS button with English text ("No file
 * chosen"), which reads as a foreign element in a Vietnamese UI. This keeps the
 * real input for behaviour and accessibility but hides it behind our own chrome.
 */
export function FilePicker({ file, onChange, accept, placeholder = 'Chưa chọn file nào' }) {
  const inputRef = useRef(null)
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-300 bg-white p-1.5 pl-3.5">
      <span
        className={cx(
          'min-w-0 flex-1 text-sm truncate',
          file ? 'text-slate-900 font-medium' : 'text-slate-400'
        )}
        title={file?.name}
      >
        {file ? file.name : placeholder}
      </span>
      {file && (
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = ''
            onChange(null)
          }}
          aria-label="Bỏ chọn file"
          className="grid place-items-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
        >
          <Icon.Close className="w-4 h-4" />
        </button>
      )}
      <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
        Chọn file
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </div>
  )
}

/* --------------------------------------------------------------- Modal --- */
const ICON_TONES = {
  accent: 'bg-accent-50 text-accent-600',
  danger: 'bg-rose-50 text-rose-600',
  warning: 'bg-amber-50 text-amber-600',
  success: 'bg-emerald-50 text-emerald-600',
}

const MODAL_SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  icon: IconCmp,
  tone = 'accent',
  size = 'md',
  footer,
  children,
  closeOnBackdrop = true,
  hideClose = false,
}) {
  useEffect(() => {
    if (!open) return
    // Escape closes, and the page behind stops scrolling while the dialog is up
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'relative w-full bg-white rounded-2xl shadow-pop border border-slate-200',
          'max-h-[calc(100vh-2rem)] flex flex-col animate-pop-in',
          MODAL_SIZES[size]
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200">
            {IconCmp && (
              <span
                className={cx(
                  'grid place-items-center w-10 h-10 rounded-xl shrink-0',
                  ICON_TONES[tone]
                )}
              >
                <IconCmp className="w-5 h-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="text-lg font-semibold text-slate-900 leading-snug">{title}</h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">{description}</p>
              )}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="shrink-0 grid place-items-center w-9 h-9 -mr-1.5 -mt-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Icon.Close className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="px-5 sm:px-6 py-5 overflow-y-auto scroll-slim">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

/**
 * Replaces window.confirm() so destructive actions look like the rest of the app
 * instead of an OS chrome dialog. Driven by a `{ title, message, … }` state object.
 */
export function ConfirmDialog({ state, onCancel }) {
  const open = Boolean(state)
  const tone = state?.tone || 'danger'
  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      title={state?.title}
      icon={tone === 'danger' ? Icon.Alert : Icon.Info}
      tone={tone === 'danger' ? 'danger' : 'accent'}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {state?.cancelLabel || 'Hủy'}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              state?.onConfirm?.()
              onCancel()
            }}
          >
            {state?.confirmLabel || 'Xác nhận'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600 leading-relaxed">{state?.message}</p>
    </Modal>
  )
}

/* --------------------------------------------------------------- Toast --- */
export function Toast({ notification }) {
  if (!notification) return null
  const isError = notification.type === 'error'
  return createPortal(
    <div className="fixed top-20 right-4 sm:right-6 z-[60] animate-toast-in">
      <div
        role="status"
        className={cx(
          'flex items-center gap-3 pl-4 pr-5 py-3 rounded-xl shadow-raised border bg-white max-w-sm',
          isError ? 'border-rose-200' : 'border-emerald-200'
        )}
      >
        <span
          className={cx(
            'grid place-items-center w-8 h-8 rounded-lg shrink-0',
            isError ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
          )}
        >
          {isError ? <Icon.Alert className="w-5 h-5" /> : <Icon.CheckCircle className="w-5 h-5" />}
        </span>
        <p className="text-sm font-medium text-slate-800">{notification.message}</p>
      </div>
    </div>,
    document.body
  )
}

/* ----------------------------------------------------- Async placeholders - */
export function LoadingState({ label = 'Đang tải...', className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-3 py-12 text-slate-500', className)}>
      <Spinner className="w-7 h-7 text-accent-600" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export function EmptyState({ icon: IconCmp = Icon.Inbox, title, description, action, tone = 'neutral', className }) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-400',
    warning: 'bg-amber-50 text-amber-500',
    danger: 'bg-rose-50 text-rose-500',
  }
  return (
    <div className={cx('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
      <span className={cx('grid place-items-center w-14 h-14 rounded-2xl mb-4', tones[tone])}>
        <IconCmp className="w-7 h-7" />
      </span>
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {description && (
        <p className="mt-1.5 text-sm text-slate-500 max-w-md leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* Inline banner for recoverable errors and standing warnings */
export function Alert({ tone = 'warning', title, children, action, className }) {
  const tones = {
    warning: { box: 'bg-amber-50 border-amber-200', icon: 'text-amber-600', text: 'text-amber-900' },
    danger: { box: 'bg-rose-50 border-rose-200', icon: 'text-rose-600', text: 'text-rose-900' },
    info: { box: 'bg-sky-50 border-sky-200', icon: 'text-sky-600', text: 'text-sky-900' },
    success: { box: 'bg-emerald-50 border-emerald-200', icon: 'text-emerald-600', text: 'text-emerald-900' },
  }
  const t = tones[tone]
  const IconCmp = tone === 'success' ? Icon.CheckCircle : tone === 'info' ? Icon.Info : Icon.Alert
  return (
    <div className={cx('flex items-start gap-3 rounded-xl border px-4 py-3', t.box, className)}>
      <IconCmp className={cx('w-5 h-5 shrink-0 mt-0.5', t.icon)} />
      <div className={cx('min-w-0 flex-1 text-sm leading-relaxed', t.text)}>
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------- Stepper --- */
export function Stepper({ steps, current, onStepClick }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        const clickable = done && onStepClick
        return (
          <li key={step} className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              disabled={!clickable}
              onClick={clickable ? () => onStepClick(i) : undefined}
              className={cx(
                'flex items-center gap-2 min-w-0 transition-opacity',
                clickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
              )}
            >
              <span
                className={cx(
                  'grid place-items-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors',
                  active && 'bg-accent-600 text-white ring-4 ring-accent-600/20',
                  done && 'bg-accent-100 text-accent-700',
                  !active && !done && 'bg-slate-200 text-slate-500'
                )}
              >
                {done ? <Icon.Check className="w-4 h-4" /> : i + 1}
              </span>
              <span
                className={cx(
                  'text-sm font-medium truncate hidden sm:block',
                  active ? 'text-slate-900' : done ? 'text-slate-600' : 'text-slate-400'
                )}
              >
                {step}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span
                className={cx(
                  'h-px w-4 sm:w-8 shrink-0',
                  i < current ? 'bg-accent-300' : 'bg-slate-200'
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* ---------------------------------------------------------------- Tabs --- */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div
      role="tablist"
      className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 overflow-x-auto scroll-slim max-w-full"
    >
      {tabs.map((tab) => {
        const active = tab.id === value
        const IconCmp = tab.icon
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cx(
              'inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all',
              active
                ? 'bg-white text-accent-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            )}
          >
            {IconCmp && <IconCmp className="w-4 h-4" />}
            {tab.label}
            {tab.count != null && (
              <span
                className={cx(
                  'px-1.5 py-0.5 rounded text-[11px] font-bold tabular-nums',
                  active ? 'bg-accent-50 text-accent-700' : 'bg-slate-300/70 text-slate-600'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------ Progress --- */
export function ProgressBar({ value, total, tone = 'accent', className }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  const tones = { accent: 'bg-accent-500', warning: 'bg-amber-500', danger: 'bg-rose-500' }
  return (
    <div className={cx('h-2 w-full rounded-full bg-slate-200 overflow-hidden', className)}>
      <div
        className={cx('h-full rounded-full transition-[width] duration-300 ease-out', tones[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* A ring gauge for the result screen — reads faster than a bare percentage */
export function ScoreRing({ percent, passed, size = 148 }) {
  const stroke = 12
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.max(0, Math.min(100, percent)) / 100)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cx(
            'transition-[stroke-dashoffset] duration-700 ease-out',
            passed ? 'stroke-emerald-500' : 'stroke-rose-500'
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cx(
            'text-4xl font-bold tnum leading-none',
            passed ? 'text-emerald-600' : 'text-rose-600'
          )}
        >
          {percent}%
        </span>
        <span className="mt-1 text-xs font-medium text-slate-500">Tỷ lệ đúng</span>
      </div>
    </div>
  )
}
