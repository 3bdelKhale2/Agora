import React from 'react'

export default function FormInput({ label, type='text', value, onChange, placeholder, required, inputClass = '', ...rest }) {
  return (
    <label className="block">
      <span className="text-sm text-white/80">{label}</span>
      <input
        className={`mt-1 w-full ${inputClass || 'glass-input'}`}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        {...rest}
      />
    </label>
  )
}