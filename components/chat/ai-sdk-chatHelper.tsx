// Helper for chat content rendering and parsing
import React from 'react'
import { CodeBlock } from './code-block'
import { MermaidDiagram } from './mermaid-diagram'
import { ImageDisplay } from './image-display'
import { AIImageGenerator } from './ai-image-generator'
import { ComputerUse } from './computer-use'
import { DataVisualization } from './data-visualization'
import { VisualizationWithTracing } from './visualization-with-tracing'
import { DataTable } from './data-table'
import { BrowserDisplay } from './browser-display'
import { ScreenShare } from './screen-share'
import { InteractiveMap } from './interactive-map'
import { InteractiveForm } from './interactive-form'

/**
 * Render message content by parsing code blocks and special component tags
 */
export function renderContent(content: string): React.ReactNode {
const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  // Patterns for custom JSX components
const customRegexes = [
    { regex: /<ImageDisplay\s+src="([^"]+)"(?:\s+alt="([^"]+)")?(?:\s+width="([^"]+)")?(?:\s+height="([^"]+)")?\s*\/?>/g, render: (m: RegExpExecArray) => (
       <ImageDisplay key={m.index} src={m[1]} alt={m[2]||''} />
    )},
    { regex: /<AIImageGenerator\s+prompt="([^"]+)"(?:\s+style="([^"]+)")?\s*\/?>/g, render: (m: RegExpExecArray) => (
      <AIImageGenerator key={m.index} initialPrompt={m[1]} />
    )},
    { regex: /<ComputerUse\s+task="([^"]+)"(?:\s+showSteps="(true|false)")?\s*\/?>/g, render: (m: RegExpExecArray) => (
      <ComputerUse key={m.index} title={m[1]} content={m[1]} isRunnable={m[2]==='true'} />
    )},
    { regex: /<DataVisualization\s+data='([^']+)'(?:\s+type="([^"]+)")?\s*\/?>/g, render: (m: RegExpExecArray) => {
      try { const data=JSON.parse(m[1]); return <DataVisualization key={m.index} data={data} type={m[2] as any} /> }
       catch { return <p key={m.index} className="text-red-500">Visualization parse error</p> }
    }},
    { regex: /<VisualizationWithTracing\s+data='([^']+)'(?:\s+type="([^"]+)")?\s*\/?>/g, render: (m: RegExpExecArray) => {
      try { const data=JSON.parse(m[1]); return <VisualizationWithTracing key={m.index} data={data} type={m[2] as any} /> }
        catch { return <p key={m.index} className="text-red-500">Tracing parse error</p> }
    }},
    { regex: /<DataTable\s+data='([^']+)'(?:\s+columns='([^']+)')?\s*\/?>/g, render: (m: RegExpExecArray) => {
      try { const data=JSON.parse(m[1]); const cols=m[2]?JSON.parse(m[2]):undefined; return <DataTable key={m.index} data={data} columns={cols} /> }
        catch { return <p key={m.index} className="text-red-500">Table parse error</p> }
    }},
    { regex: /<BrowserDisplay\s+url="([^"]+)"(?:\s+height="([^"]+)")?\s*\/?>/g, render: (m: RegExpExecArray) => (
      <BrowserDisplay key={m.index} url={m[1]} />
    )},
    { regex: /<ScreenShare\s+src="([^"]+)"(?:\s+title="([^"]+)")?(?:\s+isVideo="(true|false)")?\s*\/?>/g, render: (m: RegExpExecArray) => (
      <ScreenShare key={m.index} src={m[1]} title={m[2]||'Screen Recording'} isVideo={m[3]!=='false'} />
    )},
    { regex: /<InteractiveMap\s+center="\[([0-9.-]+),([0-9.-]+)\]"(?:\s+zoom="(\d+)")?(?:\s+locations='([^']+)')?\s*\/?>/g, render: (m: RegExpExecArray) => {
      try { const locs=JSON.parse(m[4]||'[]'); return <InteractiveMap key={m.index} center={[+m[1],+m[2]]} zoom={+(m[3]||13)} locations={locs} /> }
        catch { return <p key={m.index} className="text-red-500">Map parse error</p> }
    }},
    { regex: /<InteractiveForm\s+title="([^"]+)"(?:\s+fields='([^']+)')?(?:\s+submitLabel="([^"]+)")?\s*\/?>/g, render: (m: RegExpExecArray) => {
      try { const fields=JSON.parse(m[2]||'[]'); return <InteractiveForm key={m.index} title={m[1]} fields={fields} submitLabel={m[3]||'Submit'} /> }
        catch { return <p key={m.index} className="text-red-500">Form parse error</p> }
    }},
]

const parts: React.ReactNode[] = []
let last=0

  // process custom tags
customRegexes.forEach(({regex,render})=>{
  let m: RegExpExecArray|null
    while((m=regex.exec(content))){
        if(m.index>last){ parts.push(<p key={last} className="whitespace-pre-wrap">{content.slice(last,m.index)}</p>) }
      parts.push(render(m))
      last=m.index+m[0].length
    }
})

  // process remaining for code blocks
const rem=content.slice(last)
const codeMatches=[...rem.matchAll(codeBlockRegex)]
  if(codeMatches.length){
    let offset=0
    codeMatches.forEach((cm,i)=>{
      const idx=cm.index||0
    if(idx>offset){ parts.push(<p key={`t${i}`} className="whitespace-pre-wrap">{rem.slice(offset,idx)}</p>) }
    const lang=cm[1]||'plaintext'
    parts.push(lang==='mermaid'
      ? <MermaidDiagram key={`mer${i}`} code={cm[2]} />
        : <CodeBlock key={`cb${i}`} language={lang} code={cm[2]} />
      );
    offset=idx+cm[0].length
    })
    if(offset<rem.length){ parts.push(<p key="last" className="whitespace-pre-wrap">{rem.slice(offset)}</p>) }
  } else if(rem){
  parts.push(<p key="full" className="whitespace-pre-wrap">{rem}</p>)
  }
  return parts
}
