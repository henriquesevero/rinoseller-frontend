import { useState } from 'react'
import { gravatarUrl } from '../utils/gravatar'

interface UserAvatarProps {
  name?: string
  email?: string
  size: number
  className?: string
}

export function UserAvatar({ name, email, size, className = '' }: UserAvatarProps) {
  const [failed, setFailed] = useState(false)
  const initial = (name ?? '?').trim().charAt(0).toUpperCase()
  const url = email ? gravatarUrl(email, size * 2) : null

  if (!url || failed) {
    return (
      <div
        className={`rounded-full bg-[#28AEA4]/15 border border-[#28AEA4]/30 flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-[#28AEA4] font-bold" style={{ fontSize: size * 0.4 }}>{initial}</span>
      </div>
    )
  }

  return (
    <img
      src={url}
      onError={() => setFailed(true)}
      alt={name ?? 'avatar'}
      className={`rounded-full object-cover flex-shrink-0 border border-[#28AEA4]/30 ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
