// Helper for chat content rendering and parsing
import React from 'react';
import { z } from 'zod';

import { CodeBlock } from './code-block';
import { MermaidDiagram } from './mermaid-diagram';
import { ImageDisplay, type ImageDisplayProps } from './image-display';
import { AIImageGenerator, type AIImageGeneratorProps } from './ai-image-generator';
import { ComputerUse, type ComputerUseProps } from './computer-use';
import { DataVisualization, type DataPoint, type DataSeries, type DataVisualizationProps } from './data-visualization';
import { VisualizationWithTracing, type VisualizationWithTracingProps } from './visualization-with-tracing';
import { DataTable, type Column as DataTableColumn, type DataTableProps } from './data-table';
import { BrowserDisplay, type BrowserDisplayProps } from './browser-display';
import { ScreenShare, type ScreenShareProps } from './screen-share';
import { InteractiveMap, type Location as InteractiveMapLocation, type InteractiveMapProps } from './interactive-map';
import { InteractiveForm, type FormField as InteractiveFormField, type InteractiveFormProps } from './interactive-form';
import { AudioPlayer, type AudioPlayerProps } from './audio-player';
import { ModelViewer, type ModelViewerProps } from './model-viewer';
import { CanvasDisplay } from './canvasDisplay';

// --- Zod Schemas for Component Props ---

const ImageDisplayPropsSchema: z.ZodType<ImageDisplayProps> = z.object({
  src: z.string().min(1, "Image source (src) is required."),
  alt: z.string(),
  className: z.string().optional(),
});

const AIImageGeneratorPropsSchema: z.ZodType<AIImageGeneratorProps> = z.object({
  initialPrompt: z.string().min(1, "Initial prompt is required."),
});

const ComputerUsePropsSchema: z.ZodType<Omit<ComputerUseProps, 'onRun'>> = z.object({
  title: z.string().min(1, "Task title is required."),
  content: z.string().min(1, "Task content is required."),
  isTerminal: z.boolean().optional(),
  isRunnable: z.boolean().optional(),
  className: z.string().optional(),
});

const DataPointSchema: z.ZodType<DataPoint> = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
  x: z.union([z.string(), z.number()]).optional(),
  y: z.number().optional(),
  z: z.number().optional(),
  size: z.number().optional(),
});

const DataSeriesSchema: z.ZodType<DataSeries> = z.object({
  name: z.string(),
  data: z.union([
    z.array(DataPointSchema),
    z.array(z.number())
  ]),
  color: z.string().optional(),
  type: z.string().optional(),
});

const DataVisualizationPropsSchema: z.ZodType<DataVisualizationProps> = z.object({
  title: z.string().optional(),
  data: z.union([z.array(DataPointSchema), z.array(DataSeriesSchema)]),
  type: z.enum(["bar", "line", "pie", "doughnut", "radar", "polarArea", "scatter", "area", "heatmap", "bubble", "radialBar", "treemap"]).optional(),
  labels: z.array(z.string()).optional(),
  className: z.string().optional(),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  stacked: z.boolean().optional(),
  is3D: z.boolean().optional(),
  isMultiSeries: z.boolean().optional(),
  theme: z.enum(["light", "dark", "colorful", "monochrome"]).optional(),
  showLegend: z.boolean().optional(),
  showGrid: z.boolean().optional(),
  showTooltip: z.boolean().optional(),
  showAnimation: z.boolean().optional(),
  library: z.enum(["chartjs", "plotly", "recharts"]).optional(),
});

const VisualizationWithTracingPropsSchema: z.ZodType<VisualizationWithTracingProps> = z.object({
  title: z.string().optional(),
  data: z.union([
    z.array(DataPointSchema),
    z.array(DataSeriesSchema),
    z.record(z.unknown()),
    z.number(),
    z.string()
  ]),
  type: z.string().optional(),
  className: z.string().optional(),
});

const DataTableColumnSchema: z.ZodType<Omit<DataTableColumn, 'render'> & { render?: undefined }> = z.object({
  key: z.string(),
  title: z.string(),
  sortable: z.boolean().optional(),
  filterable: z.boolean().optional(),
});

const DataTablePropsSchema: z.ZodType<Omit<DataTableProps, 'columns'> & { columns: Array<Omit<DataTableColumn, 'render'>> }> = z.object({
  title: z.string().optional(),
  data: z.array(z.record(z.unknown())),
  columns: z.array(DataTableColumnSchema),
  className: z.string().optional(),
  pagination: z.boolean().optional(),
  pageSize: z.number().optional(),
});

const BrowserDisplayPropsSchema: z.ZodType<BrowserDisplayProps> = z.object({
  url: z.string().url("Invalid URL for BrowserDisplay."),
  title: z.string().optional(),
  className: z.string().optional(),
});

const ScreenSharePropsSchema: z.ZodType<ScreenShareProps> = z.object({
  src: z.string().min(1, "ScreenShare source (src) is required."),
  title: z.string().optional(),
  isVideo: z.boolean().optional(),
  className: z.string().optional(),
});

const InteractiveMapLocationSchema: z.ZodType<InteractiveMapLocation> = z.object({
  lat: z.number(),
  lng: z.number(),
  title: z.string().optional(),
  description: z.string().optional(),
});

const InteractiveMapPropsSchema: z.ZodType<InteractiveMapProps> = z.object({
  title: z.string().optional(),
  center: z.tuple([z.number(), z.number()]).optional(),
  zoom: z.number().optional(),
  locations: z.array(InteractiveMapLocationSchema).optional(),
  className: z.string().optional(),
});

const InteractiveFormFieldSchema: z.ZodType<Omit<InteractiveFormField, 'validation'> & { validation?: { pattern?: string; min?: number; max?: number; minLength?: number; maxLength?: number; errorMessage?: string } }> = z.object({
  id: z.string(),
  type: z.enum(['text', 'textarea', 'number', 'email', 'checkbox', 'radio', 'select', 'date']),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  validation: z.object({
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    errorMessage: z.string().optional(),
  }).optional(),
});

const InteractiveFormPropsSchema: z.ZodType<Omit<InteractiveFormProps, 'onSubmit' | 'onCancel'> & { onSubmit?: undefined; onCancel?: undefined }> = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(InteractiveFormFieldSchema),
  submitLabel: z.string().optional(),
  cancelLabel: z.string().optional(),
  className: z.string().optional(),
});

const AudioPlayerPropsSchema: z.ZodType<AudioPlayerProps> = z.object({
  src: z.string().min(1, "Audio source (src) is required."),
  title: z.string().optional(),
  waveform: z.boolean().optional(),
  className: z.string().optional(),
});

const ModelViewerPropsSchema: z.ZodType<ModelViewerProps> = z.object({
  modelUrl: z.string().min(1, "Model URL (modelUrl) is required."),
  title: z.string().optional(),
  format: z.enum(["gltf", "glb", "obj", "stl"]).optional(),
  autoRotate: z.boolean().optional(),
  backgroundColor: z.string().optional(),
  className: z.string().optional(),
});

const CanvasDisplayPropsSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  className: z.string().optional(),
  style: z.any().optional(),
  children: z.any().optional(),
});

// --- Error Display Component ---
export interface ParseErrorDisplayProps {
  componentName: string;
  errorMessage: string;
  originalText: string;
  validationErrors?: z.ZodFormattedError<unknown>;
}

const ParseErrorDisplay: React.FC<ParseErrorDisplayProps> = ({ componentName, errorMessage, originalText, validationErrors }) => (
  <div style={{
    border: '1px solid #ff4d4f',
    backgroundColor: '#fff1f0',
    padding: '12px',
    margin: '8px 0',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.9em'
  }}>
    <p style={{ color: '#cf1322', fontWeight: 'bold', margin: '0 0 8px 0' }}>
      Error rendering &lt;{componentName}&gt;:
    </p>
    <p style={{ color: '#d4380d', margin: '0 0 8px 0' }}>{errorMessage}</p>
    {validationErrors && (
      <pre style={{ whiteSpace: 'pre-wrap', color: '#595959', background: '#f0f0f0', padding: '8px', borderRadius: '3px', maxHeight: '150px', overflowY: 'auto' }}>
        {JSON.stringify(validationErrors, null, 2)}
      </pre>
    )}
    <p style={{ marginTop: '8px', fontStyle: 'italic', color: '#8c8c8c' }}>
      Original text: <code style={{ background: '#f0f0f0', padding: '2px 4px', borderRadius: '3px' }}>{originalText}</code>
    </p>
  </div>
);


/**
 * Render message content by parsing code blocks and special component tags
 */
export function renderContent(content: string): React.ReactNode {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

  const customRegexes = [
    {
      regex: /<ImageDisplay\s+src="([^"]+)"(?:\s+alt="([^"]*)")?(?:[^>]*)\/?>/g,
      render: (m: RegExpExecArray, key: string | number) => {
        const props = { src: m[1], alt: m[2] || '' };
        const result = ImageDisplayPropsSchema.safeParse(props);
        if (result.success) {
          return <ImageDisplay key={key} {...result.data} />;
        }
        return <ParseErrorDisplay key={key} componentName="ImageDisplay" errorMessage="Invalid props." validationErrors={result.error.format()} originalText={m[0]} />;
      }
    },
    {
      regex: /<AIImageGenerator\s+prompt="([^"]+)"(?:[^>]*)\/?>/g,
      render: (m: RegExpExecArray, key: string | number) => {
        const props = { initialPrompt: m[1] };
        const result = AIImageGeneratorPropsSchema.safeParse(props);
        if (result.success) {
          return <AIImageGenerator key={key} {...result.data} />;
        }
        return <ParseErrorDisplay key={key} componentName="AIImageGenerator" errorMessage="Invalid props." validationErrors={result.error.format()} originalText={m[0]} />;
      }
    },
    {
      regex: /<ComputerUse\s+task="([^"]+)"(?:\s+showSteps="(true|false)")?(?:[^>]*)\/?>/g,
      render: (m: RegExpExecArray, key: string | number) => {
        const props = { title: m[1], content: m[1], isRunnable: m[2] === 'true' };
        const result = ComputerUsePropsSchema.safeParse(props);
        if (result.success) {
          return <ComputerUse key={key} {...result.data} />;
        }
        return <ParseErrorDisplay key={key} componentName="ComputerUse" errorMessage="Invalid props." validationErrors={result.error.format()} originalText={m[0]} />;
      }
    },
    {
      regex: /<DataVisualization\s+data='([^']+)'(?:\s+type="([^"]+)")?(?:[^>]*)\/?>/g,
      render: (m: RegExpExecArray, key: string | number) => {
        try {
          const jsonData = JSON.parse(m[1]);
          const props = { data: jsonData, type: m[2] };
          const result = DataVisualizationPropsSchema.safeParse(props);
          if (result.success) {
            return <DataVisualization key={key} {...result.data} />;
          }
          return <ParseErrorDisplay key={key} componentName="DataVisualization" errorMessage="Invalid props after JSON parse." validationErrors={result.error.format()} originalText={m[0]} />;
        } catch (e: unknown) {
          const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : 'Unknown error';
          return <ParseErrorDisplay key={key} componentName="DataVisualization" errorMessage={`JSON parsing error: ${message}`} originalText={m[0]} />;
        }
      }
    },
    {
      regex: /<VisualizationWithTracing\s+data='([^']+)'(?:\s+type="([^"]+)")?(?:[^>]*)\/?>/g,
      render: (m: RegExpExecArray, key: string | number) => {
        try {
          const jsonData = JSON.parse(m[1]);
          const props = { data: jsonData, type: m[2] }; 
          const result = VisualizationWithTracingPropsSchema.safeParse(props); 
          if (result.success) {
            return <VisualizationWithTracing key={key} data={result.data.data} type={result.data.type} />;
          }
          return <ParseErrorDisplay key={key} componentName="VisualizationWithTracing" errorMessage="Invalid props after JSON parse." validationErrors={result.error.format()} originalText={m[0]} />;
        } catch (e: unknown) {
          const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : 'Unknown error';
          return <ParseErrorDisplay key={key} componentName="VisualizationWithTracing" errorMessage={`JSON parsing error: ${message}`} originalText={m[0]} />;
        }
      }
    },
    {
      regex: /<DataTable\s+data='([^']+)'(?:\s+columns='([^']+)')?(?:[^>]*)\/?>/g,
      render: (m: RegExpExecArray, key: string | number) => {
        try {
          const jsonData = JSON.parse(m[1]);
          const jsonColumns = m[2] ? JSON.parse(m[2]) : undefined;
          const props = { data: jsonData, columns: jsonColumns };
          const result = DataTablePropsSchema.safeParse(props);
          if (result.success) {
            return <DataTable key={key} data={result.data.data} columns={result.data.columns || []} />;
          }
          return <ParseErrorDisplay key={key} componentName="DataTable" errorMessage="Invalid props after JSON parse." validationErrors={result.error.format()} originalText={m[0]} />;
        } catch (e: unknown) {
          const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : 'Unknown error';
          return <ParseErrorDisplay key={key} componentName="DataTable" errorMessage={`JSON parsing error: ${message}`} originalText={m[0]} />;
        }
      }
    },
    {
      regex: /<BrowserDisplay\s+url="([^"]+)"(?:[^>]*)\/?>/g,
      render: (m: RegExpExecArray, key: string | number) => {
        const props = { url: m[1] };
        const result = BrowserDisplayPropsSchema.safeParse(props);
        if (result.success) {
          return <BrowserDisplay key={key} {...result.data} />;
        }
        return <ParseErrorDisplay key={key} componentName="BrowserDisplay" errorMessage="Invalid props." validationErrors={result.error.format()} originalText={m[0]} />;
      }
    },
    {
      regex: /<ScreenShare\s+src="([^"]+)"(?:\s+title="([^"]*)")?(?:\s+isVideo="(true|false)")?(?:[^>]*)\/?>/g,
      render: (m: RegExpExecArray, key: string | number) => {
        const props = {
          src: m[1],
          title: m[2] || 'Screen Recording',
          isVideo: m[3] !== 'false'
        };
        const result = ScreenSharePropsSchema.safeParse(props);
        if (result.success) {
          return <ScreenShare key={key} {...result.data} />;
        }
        return <ParseErrorDisplay key={key} componentName="ScreenShare" errorMessage="Invalid props." validationErrors={result.error.format()} originalText={m[0]} />;
      }
    },
    {
      regex: /<InteractiveMap\s+center="\[\s*([0-9.-]+)\s*,\s*([0-9.-]+)\s*\]"(?:\s+zoom="(\d+)")?(?:\s+locations='([^']*)')?(?:[^>]*)\/?>/g,
      render: (m: RegExpExecArray, key: string | number) => {
        try {
          const centerTuple: [number, number] = [parseFloat(m[1]), parseFloat(m[2])];
          const zoomNum = m[3] ? parseInt(m[3], 10) : undefined;
          const locationsArray = m[4] ? JSON.parse(m[4]) : undefined;

          const props = {
            center: centerTuple,
            zoom: zoomNum,
            locations: locationsArray
          };
          const result = InteractiveMapPropsSchema.safeParse(props);
          if (result.success) {
            return <InteractiveMap key={key} {...result.data} />;
          }
          return <ParseErrorDisplay key={key} componentName="InteractiveMap" errorMessage="Invalid props after parsing." validationErrors={result.error.format()} originalText={m[0]} />;
        } catch (e: unknown) {
          const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : 'Unknown error';
          return <ParseErrorDisplay key={key} componentName="InteractiveMap" errorMessage={`Attribute parsing error: ${message}`} originalText={m[0]} />;
        }
      }
    },
    {
      regex: /<InteractiveForm\s+title="([^"]+)"(?:\s+fields='([^']*)')?(?:\s+submitLabel="([^"]*)")?(?:[^>]*)\/?>/g,
      render: (m: RegExpExecArray, key: string | number) => {
        try {
          const fieldsArray = m[2] ? JSON.parse(m[2]) : undefined;
          const props = {
            title: m[1],
            fields: fieldsArray,
            submitLabel: m[3] || undefined
          };
          const result = InteractiveFormPropsSchema.safeParse(props);
          if (result.success) {
            return <InteractiveForm key={key} {...{ ...result.data, fields: result.data.fields || [] }} />;
          }
          return <ParseErrorDisplay key={key} componentName="InteractiveForm" errorMessage="Invalid props after parsing." validationErrors={result.error.format()} originalText={m[0]} />;
        } catch (e: unknown) {
          const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : 'Unknown error';
          return <ParseErrorDisplay key={key} componentName="InteractiveForm" errorMessage={`Attribute parsing error: ${message}`} originalText={m[0]} />;
        }
      }
    },
    {
      regex: /<AudioPlayer\s+src="([^"]+)"(?:\s+title="([^"]*)")?(?:\s+waveform="(true|false)")?(?:[^>]*)\/?>/g,
      render: (m: RegExpExecArray, key: string | number) => {
        const props = {
          src: m[1],
          title: m[2],
          waveform: m[3] === 'true'
        };
        const result = AudioPlayerPropsSchema.safeParse(props);
        if (result.success) {
          return <AudioPlayer key={key} {...result.data} />;
        }
        return <ParseErrorDisplay key={key} componentName="AudioPlayer" errorMessage="Invalid props." validationErrors={result.error.format()} originalText={m[0]} />;
      }
    },
    {
      regex: /<ModelViewer\s+modelUrl="([^"]+)"(?:\s+title="([^"]*)")?(?:\s+format="(gltf|glb|obj|stl)")?(?:\s+autoRotate="(true|false)")?(?:\s+backgroundColor="([^"]*)")?(?:[^>]*)\/?>/g,
      render: (m: RegExpExecArray, key: string | number) => {
        const props = {
          modelUrl: m[1],
          title: m[2],
          format: m[3] as ModelViewerProps['format'],
          autoRotate: m[4] === 'true',
          backgroundColor: m[5]
        };
        const result = ModelViewerPropsSchema.safeParse(props);
        if (result.success) {
          return <ModelViewer key={key} {...result.data} />;
        }
        return <ParseErrorDisplay key={key} componentName="ModelViewer" errorMessage="Invalid props." validationErrors={result.error.format()} originalText={m[0]} />;
      }
    },
    {
      regex: /<CanvasDisplay(?:\s+width="(\d+)")?(?:\s+height="(\d+)")?(?:\s+className="([^"]*)")?\s*>([\s\S]*?)<\/CanvasDisplay>/g,
      render: (m: RegExpExecArray, key: string | number) => {
        const width = m[1] ? parseInt(m[1], 10) : undefined;
        const height = m[2] ? parseInt(m[2], 10) : undefined;
        const className = m[3] || undefined;
        const children = m[4] ? m[4] : undefined;
        const props = { width, height, className, children };
        const result = CanvasDisplayPropsSchema.safeParse(props);
        if (result.success) {
          return <CanvasDisplay key={key} {...result.data}>{children}</CanvasDisplay>;
        }
        return <ParseErrorDisplay key={key} componentName="CanvasDisplay" errorMessage="Invalid props." validationErrors={result.error.format()} originalText={m[0]} />;
      }
    },
  ];

  const parts: React.ReactNode[] = [];
  let lastIndexProcessed = 0;
  let componentKeyIndex = 0;

  const regexConfigs = [...customRegexes];

  while (lastIndexProcessed < content.length) {
    let earliestMatch: { match: RegExpExecArray; renderFunc: (m: RegExpExecArray, key: string | number) => React.ReactNode; regex: RegExp } | null = null;

    for (const config of regexConfigs) {
      config.regex.lastIndex = lastIndexProcessed;
      const currentMatch = config.regex.exec(content);

      if (currentMatch) {
        if (!earliestMatch || currentMatch.index < earliestMatch.match.index) {
          earliestMatch = { match: currentMatch, renderFunc: config.render, regex: config.regex };
        }
      }
    }

    if (earliestMatch) {
      if (earliestMatch.match.index > lastIndexProcessed) {
        parts.push(
          <p key={`text-${componentKeyIndex++}`} className="whitespace-pre-wrap">
            {content.slice(lastIndexProcessed, earliestMatch.match.index)}
          </p>
        );
      }
      parts.push(earliestMatch.renderFunc(earliestMatch.match, `component-${componentKeyIndex++}`));
      lastIndexProcessed = earliestMatch.match.index + earliestMatch.match[0].length;

    } else {
      break;
    }
  }

  const remainingTextAfterCustom = content.slice(lastIndexProcessed);
  if (remainingTextAfterCustom) {
    let lastCodeBlockIndex = 0;
    let codeMatch: RegExpExecArray | null;
    codeBlockRegex.lastIndex = 0;

    while ((codeMatch = codeBlockRegex.exec(remainingTextAfterCustom)) !== null) {
      if (codeMatch.index > lastCodeBlockIndex) {
        parts.push(
          <p key={`text-code-${componentKeyIndex++}`} className="whitespace-pre-wrap">
            {remainingTextAfterCustom.slice(lastCodeBlockIndex, codeMatch.index)}
          </p>
        );
      }
      const lang = codeMatch[1] || 'plaintext';
      const codeContent = codeMatch[2];
      parts.push(
        lang === 'mermaid'
          ? <MermaidDiagram key={`mermaid-${componentKeyIndex++}`} code={codeContent} />
          : <CodeBlock key={`codeblock-${componentKeyIndex++}`} language={lang} code={codeContent} />
      );
      lastCodeBlockIndex = codeBlockRegex.lastIndex;
    }

    if (lastCodeBlockIndex < remainingTextAfterCustom.length) {
      parts.push(
        <p key={`text-final-${componentKeyIndex++}`} className="whitespace-pre-wrap">
          {remainingTextAfterCustom.slice(lastCodeBlockIndex)}
        </p>
      );
    }
  } else if (parts.length === 0 && lastIndexProcessed === 0 && content.length > 0) {
    parts.push(<p key={`fulltext-${componentKeyIndex++}`} className="whitespace-pre-wrap">{content}</p>);
  }

  return parts.length > 0 ? parts : <p key="empty" className="whitespace-pre-wrap"></p>;
}
