"use client"

import { useState, useRef, useEffect, useLayoutEffect } from "react"
import { motion } from "framer-motion"
import { Maximize, Minimize, Download, MapPin, Search, Plus, Minus, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import L from "leaflet"

// Import Leaflet CSS statically to ensure it's bundled correctly
import "leaflet/dist/leaflet.css"

// Import Leaflet dynamically to avoid SSR issues
import dynamic from "next/dynamic"
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const ZoomControl = dynamic(() => import('react-leaflet').then(mod => mod.ZoomControl), { ssr: false })

export interface Location {
  lat: number
  lng: number
  title?: string
  description?: string
}

export interface InteractiveMapProps {
  title?: string
  center?: [number, number]
  zoom?: number
  locations?: Location[]
  className?: string
}

export function InteractiveMap({ 
  title = "Location Map", 
  center = [51.505, -0.09], // Default to London
  zoom = 13,
  locations = [],
  className
}: InteractiveMapProps) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(zoom)
  const [searchQuery, setSearchQuery] = useState("")
  const mapRef = useRef<L.Map>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Leaflet CSS is now imported statically above

      // Fix marker icon issues
      import('leaflet').then(L => {
        delete (L.Icon.Default.prototype as any)._getIconUrl

        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '/images/marker-icon-2x.png',
          iconUrl: '/images/marker-icon.png',
          shadowUrl: '/images/marker-shadow.png',
        })

        setMapReady(true)
      })
    }
  }, [])

  // Handle copy locations
  const handleCopyLocations = async () => {
    const locationsString = JSON.stringify(locations, null, 2)
    await navigator.clipboard.writeText(locationsString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Handle download map (screenshot)
  const handleDownload = () => {
    // This is a placeholder - actual implementation would require html2canvas or similar
    alert("Map download functionality would be implemented here")
  }

  // Handle zoom in
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn()
    }
  }

  // Handle zoom out
  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut()
    }
  }

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    // This is a placeholder - actual implementation would use a geocoding service
    alert(`Search for: ${searchQuery}`)
  }

  return (
    <div 
      className={cn(
        "relative rounded-lg overflow-hidden border border-border/50 shadow-md transition-all duration-300 bg-background",
        expanded && "fixed inset-4 z-50 bg-background flex flex-col",
        className
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between bg-gradient-to-r from-green-800 to-teal-800 px-4 py-2 text-white">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span className="font-medium">{title}</span>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered || expanded ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={handleCopyLocations}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="sr-only">Copy locations</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only">Download map</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            <span className="sr-only">{expanded ? "Minimize" : "Maximize"}</span>
          </Button>
        </motion.div>
      </div>
      
      <div className={cn(
        "relative bg-white dark:bg-zinc-900",
        expanded ? "flex-1" : "h-[300px]"
      )}>
        {/* Search bar */}
        <div className="absolute top-2 left-0 right-0 z-10 px-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="Search location..."
              className="bg-white/90 backdrop-blur-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" size="icon" variant="secondary">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
        
        {/* Zoom controls */}
        <div className="absolute top-16 right-4 z-10 flex flex-col gap-2">
          <Button size="icon-sm" variant="secondary" onClick={handleZoomIn}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="icon-sm" variant="secondary" onClick={handleZoomOut}>
            <Minus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Map */}
        {mapReady && (
            <MapContainer
              ref={mapRef}
              center={center as [number, number]} 
              zoom={currentZoom} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false} // Set to false as a separate ZoomControl component is used
              whenReady={() => {
                if (mapRef.current) {
                  setCurrentZoom(mapRef.current.getZoom());
                }
              }}
            >
              <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {locations.map((location: Location, index: number) => (
              <Marker key={index} position={[location.lat, location.lng] as [number, number]}>
                {(location.title || location.description) && (
                <Popup>
                  {location.title && <h3 className="font-medium">{location.title}</h3>}
                  {location.description && <p>{location.description}</p>}
                </Popup>
                )}
              </Marker>
              ))}
              <ZoomControl position="bottomright" />
            </MapContainer>
        )}
        
        {!mapReady && (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            Loading map...
          </div>
        )}
      </div>
    </div>
  )
}

export default InteractiveMap

export type { InteractiveMapProps, Location }