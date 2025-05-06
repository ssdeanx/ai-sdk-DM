"use client"

import { useEffect, useState } from "react"

/**
 * Custom hook for responsive design that detects if a media query matches
 * 
 * @param query - CSS media query string
 * @returns boolean indicating if the media query matches
 * 
 * @example
 * ```tsx
 * const isMobile = useMediaQuery("(max-width: 768px)")
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false)
  
  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query)
      
      // Set initial value
      setMatches(media.matches)
      
      // Define listener function
      const listener = (event: MediaQueryListEvent) => {
        setMatches(event.matches)
      }
      
      // Add listener
      media.addEventListener("change", listener)
      
      // Clean up
      return () => {
        media.removeEventListener("change", listener)
      }
    }
    
    // Default to false on server-side
    return () => {}
  }, [query])
  
  return matches
}
