/**
 * @file CSV / JSON / YAML / XML / Markdown-table transformations, filtering
 *       and aggregation – ready for Vercel AI SDK tool-calling.
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  DELIMITERS,
  LOGICAL_OPERATORS,
  AGG_FUNCTIONS,
} from './constants';
import {
  CsvToJsonResult,
  JsonToCsvResult,
  DataFilterResult,
  DataAggregationResult,
  YamlToJsonResult,
  JsonToYamlResult,
  XmlToJsonResult,
  JsonToXmlResult,
  MdTableToJsonResult,
  JsonToMdTableResult,
  ToolFailure,
} from './types';
import yaml from 'js-yaml';
import { parseStringPromise, Builder as XmlBuilder } from 'xml2js';
import { markdownTable } from 'markdown-table';

/* ──────────────────────────────  schemas  ───────────────────────────── */

export const csvToJsonSchema = z.object({
  csv: z.string().describe('CSV content to convert'),
  delimiter: z.enum(DELIMITERS).default(',').describe('CSV delimiter'),
  hasHeader: z.boolean().default(true).describe('Whether the CSV has a header row'),
});

export const jsonToCsvSchema = z.object({
  json: z.string().describe('JSON array to convert'),
  delimiter: z.enum(DELIMITERS).default(',').describe('CSV delimiter'),
  includeHeader: z.boolean().default(true).describe('Include header row'),
});

export const dataFilterSchema = z.object({
  data: z.string().describe('JSON array to filter'),
  filters: z.record(z.any()).describe('Key-value filter criteria'),
  operator: z.enum(LOGICAL_OPERATORS).default('AND'),
});

export const dataAggregationSchema = z.object({
  data: z.string().describe('JSON array to aggregate'),
  groupBy: z.string().describe('Field to group by'),
  aggregations: z.array(
    z.object({
      field: z.string(),
      function: z.enum(AGG_FUNCTIONS),
      as: z.string().optional(),
    }),
  ),
});

export const yamlToJsonSchema = z.object({
  yaml: z.string().describe('YAML text to convert'),
});

export const jsonToYamlSchema = z.object({
  json: z.string().describe('JSON text to convert'),
  indent: z.number().int().min(2).max(8).default(2).describe('Indent size'),
});

export const xmlToJsonSchema = z.object({
  xml: z.string().describe('XML string to convert'),
});

export const jsonToXmlSchema = z.object({
  json: z.string().describe('JSON string to convert'),
  rootName: z.string().default('root').describe('Name of the root element'),
});

export const mdTableToJsonSchema = z.object({
  markdown: z.string().describe('Markdown table'),
});

export const jsonToMdTableSchema = z.object({
  json: z.string().describe('Array of objects to convert'),
});

/* ────────────────────────────  helpers  ────────────────────────────── */

const safeJsonParse = <T = unknown>(text: string): T => {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON supplied');
  }
};

/* ─────────────────────────  implementations  ───────────────────────── */

/* ------------- CSV → JSON ------------- */
async function csvToJson(params: z.infer<typeof csvToJsonSchema>): Promise<CsvToJsonResult> {
  const { csv, delimiter, hasHeader } = params;
  try {
    const lines = csv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) throw new Error('Empty CSV');

    const headers = hasHeader
      ? lines[0].split(delimiter).map((h) => h.trim())
      : Array.from({ length: lines[0].split(delimiter).length }, (_, i) => `field${i + 1}`);

    const rows: Record<string, string>[] = [];
    for (const line of lines.slice(hasHeader ? 1 : 0)) {
      const values = line.split(delimiter);
      const row: Record<string, string> = {};
      for (let i = 0; i < Math.min(headers.length, values.length); i++) {
        row[headers[i]] = values[i].trim();
      }
      rows.push(row);
    }

    return { success: true, data: rows, rowCount: rows.length, columnCount: headers.length };
  } catch (err) {
    return { success: false, error: (err as Error).message } satisfies ToolFailure;
  }
}

/* ------------- JSON → CSV ------------- */
async function jsonToCsv(params: z.infer<typeof jsonToCsvSchema>): Promise<JsonToCsvResult> {
  const { json, delimiter, includeHeader } = params;
  try {
    const data = safeJsonParse<unknown[]>(json);
    if (!Array.isArray(data) || data.length === 0) throw new Error('Input must be a non-empty array');

    const keys = Array.from(new Set(data.flatMap((o) => Object.keys(o as Record<string, unknown>))));
    const lines: string[] = [];

    if (includeHeader) lines.push(keys.join(delimiter));

    for (const obj of data) {
      const values = keys.map((k) => {
        const v = (obj as Record<string, unknown>)[k];
        if (v == null) return '';
        const s = String(v);
        return s.includes(delimiter) || s.includes('\n') || s.includes('"')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      });
      lines.push(values.join(delimiter));
    }

    return {
      success: true,
      csv: lines.join('\n'),
      rowCount: data.length,
      columnCount: keys.length,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message } satisfies ToolFailure;
  }
}

/* ------------- Filter ------------- */
async function dataFilter(params: z.infer<typeof dataFilterSchema>): Promise<DataFilterResult> {
  const { data, filters, operator } = params;
  try {
    const arr = safeJsonParse<unknown[]>(data);
    if (!Array.isArray(arr)) throw new Error('Input must be a JSON array');

    const filtered = arr.filter((item) => {
      const results = Object.entries(filters).map(([k, v]) => {
        // dot-notation support
        const parts = k.split('.');
        let current: any = item;
        for (const part of parts.slice(0, -1)) {
          current = current?.[part];
        }
        return current?.[parts.at(-1)!] === v;
      });

      return operator === 'AND' ? results.every(Boolean) : results.some(Boolean);
    });

    return {
      success: true,
      data: filtered,
      count: filtered.length,
      originalCount: arr.length,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message } satisfies ToolFailure;
  }
}

/* ------------- Aggregate ------------- */
async function dataAggregation(
  params: z.infer<typeof dataAggregationSchema>,
): Promise<DataAggregationResult> {
  const { data, groupBy, aggregations } = params;
  try {
    const arr = safeJsonParse<unknown[]>(data);
    if (!Array.isArray(arr)) throw new Error('Input must be a JSON array');

    // Grouping
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const obj of arr as Record<string, unknown>[]) {
      const key = obj[groupBy];
      if (key == null) continue;
      const k = String(key);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(obj);
    }

    // Aggregation
    const result = [...groups.entries()].map(([gk, items]) => {
      const out: Record<string, unknown> = { [groupBy]: gk };
      for (const { field, function: fn, as } of aggregations) {
        const name = as ?? `${fn}_${field}`;
        const numbers = items
          .map((i) => i[field])
          .filter((v) => v != null)
          .map((v) => Number(v))
          .filter((n) => !Number.isNaN(n));

        switch (fn) {
          case 'sum':
            out[name] = numbers.reduce((s, n) => s + n, 0);
            break;
          case 'avg':
            out[name] = numbers.length ? numbers.reduce((s, n) => s + n, 0) / numbers.length : null;
            break;
          case 'min':
            out[name] = numbers.length ? Math.min(...numbers) : null;
            break;
          case 'max':
            out[name] = numbers.length ? Math.max(...numbers) : null;
            break;
          case 'count':
            out[name] = numbers.length;
            break;
        }
      }
      return out;
    });

    return { success: true, data: result, groupCount: result.length };
  } catch (err) {
    return { success: false, error: (err as Error).message } satisfies ToolFailure;
  }
}

/* ------------- YAML → JSON ------------- */
async function yamlToJson(
  params: z.infer<typeof yamlToJsonSchema>,
): Promise<YamlToJsonResult> {
  try {
    const data = yaml.load(params.yaml);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/* ------------- JSON → YAML ------------- */
async function jsonToYaml(
  params: z.infer<typeof jsonToYamlSchema>,
): Promise<JsonToYamlResult> {
  try {
    const obj = JSON.parse(params.json);
    const yamlText = yaml.dump(obj, { indent: params.indent });
    return { success: true, yaml: yamlText };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/* ------------- XML → JSON ------------- */
async function xmlToJson(
  params: z.infer<typeof xmlToJsonSchema>,
): Promise<XmlToJsonResult> {
  try {
    const data = await parseStringPromise(params.xml, { explicitArray: false });
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/* ------------- JSON → XML ------------- */
async function jsonToXml(
  params: z.infer<typeof jsonToXmlSchema>,
): Promise<JsonToXmlResult> {
  try {
    const obj = JSON.parse(params.json);
    const builder = new XmlBuilder({ rootName: params.rootName, headless: true });
    const xml = builder.buildObject(obj);
    return { success: true, xml };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/* ------------- Markdown-table → JSON ------------- */
async function mdTableToJson(
  params: z.infer<typeof mdTableToJsonSchema>,
): Promise<MdTableToJsonResult> {
  try {
    const lines = params.markdown
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    // crude table parsing (header | separator | rows…)
    if (lines.length < 2) throw new Error('Invalid markdown table');
    const header = lines[0].split('|').map((h) => h.trim()).filter(Boolean);
    const rows: Record<string, string>[] = [];

    for (const line of lines.slice(2)) {
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length === 0) continue;
      const row: Record<string, string> = {};
      header.forEach((h, i) => {
        row[h] = cells[i] ?? '';
      });
      rows.push(row);
    }

    return { success: true, rows };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/* ------------- JSON → Markdown-table ------------- */
async function jsonToMdTable(
  params: z.infer<typeof jsonToMdTableSchema>,
): Promise<JsonToMdTableResult> {
  try {
    const arr = JSON.parse(params.json);
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error('Input must be a non-empty array');
    }

    const headers = Array.from(new Set(arr.flatMap((o) => Object.keys(o))));
    const table = markdownTable([
      headers,
      ...arr.map((o: Record<string, unknown>) =>
        headers.map((h) => String(o[h] ?? '')),
      ),
    ]);

    return { success: true, markdown: table };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/* ─────────────────────────────  exports  ───────────────────────────── */

export const tools = {
  CsvToJson: tool({
    description: 'Convert CSV data to JSON format',
    parameters: csvToJsonSchema,
    execute: csvToJson,
  }),
  JsonToCsv: tool({
    description: 'Convert a JSON array to CSV',
    parameters: jsonToCsvSchema,
    execute: jsonToCsv,
  }),
  DataFilter: tool({
    description: 'Filter a JSON array by simple criteria',
    parameters: dataFilterSchema,
    execute: dataFilter,
  }),
  DataAggregation: tool({
    description: 'Aggregate / group a JSON array',
    parameters: dataAggregationSchema,
    execute: dataAggregation,
  }),
  YamlToJson: tool({
    description: 'Convert YAML to JSON',
    parameters: yamlToJsonSchema,
    execute: yamlToJson,
  }),
  JsonToYaml: tool({
    description: 'Convert JSON to YAML',
    parameters: jsonToYamlSchema,
    execute: jsonToYaml,
  }),
  XmlToJson: tool({
    description: 'Convert XML to JSON',
    parameters: xmlToJsonSchema,
    execute: xmlToJson,
  }),
  JsonToXml: tool({
    description: 'Convert JSON to XML',
    parameters: jsonToXmlSchema,
    execute: jsonToXml,
  }),
  MdTableToJson: tool({
    description: 'Convert a markdown table to JSON',
    parameters: mdTableToJsonSchema,
    execute: mdTableToJson,
  }),
  JsonToMdTable: tool({
    description: 'Convert JSON array to a markdown table',
    parameters: jsonToMdTableSchema,
    execute: jsonToMdTable,
  }),
};