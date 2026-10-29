import { useCallback, useEffect, useState } from 'react'

function readHash(validIds, fallback) {
  const id = window.location.hash.replace(/^#\/?/, '')
  return validIds.includes(id) ? id : fallback
}

// Current page from the URL hash (#/watchtower). Back/forward and shared links work,
// and static hosts need no rewrite rules.
export function useHashRoute(validIds, fallback) {
  const [route, setRoute] = useState(() => readHash(validIds, fallback))

  useEffect(() => {
    const onChange = () => setRoute(readHash(validIds, fallback))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [validIds, fallback])

  const navigate = useCallback((id) => {
    if (window.location.hash !== `#/${id}`) window.location.hash = `/${id}`
  }, [])

  return [route, navigate]
}
