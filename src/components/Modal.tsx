import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  variant?: 'sheet' | 'centered'
}

export function Modal({ open, onClose, title, children, variant = 'sheet' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  if (variant === 'centered') {
    return (
      <div
        className="modal-backdrop centered"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        <div className="modal-centered">
          {title && (
            <div style={{ marginBottom: 16 }}>
              <h2 id="modal-title" style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
            </div>
          )}
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div className="modal-sheet">
        <div className="modal-drag-handle" />
        {title && (
          <div className="modal-title" id="modal-title">{title}</div>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  confirmVariant?: 'danger' | 'primary' | 'success'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} variant="centered">
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>
          {confirmVariant === 'danger' ? '⚠️' : confirmVariant === 'success' ? '✅' : '❓'}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>{message}</p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-surface btn-sm" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button
          className={`btn btn-${confirmVariant} btn-sm`}
          style={{ flex: 1 }}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? (
            <span className="loading-spinner" style={{ width: 16, height: 16 }} />
          ) : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
