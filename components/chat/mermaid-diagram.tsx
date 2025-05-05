"use client"

import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"
import { Loader2 } from "lucide-react"

interface MermaidDiagramProps {
  code: string
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const mermaidRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: "default",
      securityLevel: "strict",
    })

    const renderDiagram = async () => {
      setLoading(true)
      setError(null)

      try {
        const { svg } = await mermaid.render("mermaid-diagram-" + Math.random(), code)
        setSvg(svg)
      } catch (err) {
        console.error("Mermaid rendering error:", err)
        setError("Failed to render diagram. Please check your syntax.")
      } finally {
        setLoading(false)
      }
    }

    renderDiagram()
  }, [code])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-md my-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 text-red-800 rounded-md my-4">
        <p className="font-medium">Error rendering diagram</p>
        <p className="text-sm">{error}</p>
        <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-x-auto">{code}</pre>
      </div>
    )
  }

  return <div className="my-4 p-4 bg-white rounded-md border overflow-auto" dangerouslySetInnerHTML={{ __html: svg }} />
}
