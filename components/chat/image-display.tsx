"use client"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface ImageDisplayProps {
  src: string
  alt: string
}

export function ImageDisplay({ src, alt }: ImageDisplayProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="relative h-40 cursor-pointer rounded-md overflow-hidden" onClick={() => setIsOpen(true)}>
        <Image src={src || "/placeholder.svg"} alt={alt} fill className="object-cover" />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl">
          <div className="relative h-[80vh]">
            <Image src={src || "/placeholder.svg"} alt={alt} fill className="object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
