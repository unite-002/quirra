'use client'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

export default function PasswordInput({ placeholder, value, onChange, name }: any) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative w-full">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        name={name}
        className="w-full px-4 py-3 rounded-2xl bg-[#0a0a24] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-4 top-3 text-gray-400 hover:text-white"
      >
        {show ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  )
}
