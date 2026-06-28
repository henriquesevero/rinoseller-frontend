import md5 from 'blueimp-md5'

export function gravatarUrl(email: string, size = 160): string {
  const hash = md5(email.trim().toLowerCase())
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`
}
