import React, { useEffect, useRef, useState } from 'react'

export default function PromptModal({
  open,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  placeholder = '',
  defaultValue = '',
  showInput = false,
  multiline = false,
  onConfirm,
  onClose,
}) {
  const [value, setValue] = useState(defaultValue || '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setValue(defaultValue || '')
      // Autofocus for accessibility
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, defaultValue])

  if (!open) return null

  const submit = () => { onConfirm?.(value) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 card w-full max-w-md p-4">
        <div className="text-lg font-semibold mb-2">{title}</div>
        {message && <div className="text-sm text-white/80 mb-3">{message}</div>}
        {showInput && (
          multiline ? (
            <textarea
              ref={inputRef}
              className="glass-input w-full mb-3"
              rows={3}
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          ) : (
            <input
              ref={inputRef}
              className="glass-input w-full mb-3"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          )
        )}
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>{cancelLabel}</button>
          <button className="btn btn-primary" onClick={submit}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
