/**
 * @file Discriminated-union result shapes plus handy type-guards for the
 *       CSV/JSON transformation & analytics tools.
 */

/* ------------------------------------------------------------------ */
/*                             Failure                                */
/* ------------------------------------------------------------------ */
export interface ToolFailure {
  success: false;
  error: string;
}

/* ------------------------------------------------------------------ */
/*                           CSV  ↔  JSON                             */
/* ------------------------------------------------------------------ */
export interface CsvToJsonSuccess {
  success: true;
  data: Record<string, string>[];
  rowCount: number;
  columnCount: number;
}
export type CsvToJsonResult = CsvToJsonSuccess | ToolFailure;
export const isCsvToJsonSuccess = (r: CsvToJsonResult): r is CsvToJsonSuccess =>
  r.success;

export interface JsonToCsvSuccess {
  success: true;
  csv: string;
  rowCount: number;
  columnCount: number;
}
export type JsonToCsvResult = JsonToCsvSuccess | ToolFailure;
export const isJsonToCsvSuccess = (r: JsonToCsvResult): r is JsonToCsvSuccess =>
  r.success;

/* ------------------------------------------------------------------ */
/*                               Filter                               */
/* ------------------------------------------------------------------ */
export interface DataFilterSuccess {
  success: true;
  data: unknown[];
  count: number;
  originalCount: number;
}
export type DataFilterResult = DataFilterSuccess | ToolFailure;
export const isDataFilterSuccess = (
  r: DataFilterResult
): r is DataFilterSuccess => r.success;

/* ------------------------------------------------------------------ */
/*                             Aggregate                              */
/* ------------------------------------------------------------------ */
export interface DataAggregationSuccess {
  success: true;
  data: Record<string, unknown>[];
  groupCount: number;
}
export type DataAggregationResult = DataAggregationSuccess | ToolFailure;
export const isDataAggregationSuccess = (
  r: DataAggregationResult
): r is DataAggregationSuccess => r.success;

/* ------------------------------------------------------------------ */
/*                          YAML  ↔  JSON                             */
/* ------------------------------------------------------------------ */
export interface YamlToJsonSuccess {
  success: true;
  data: unknown;
}
export type YamlToJsonResult = YamlToJsonSuccess | ToolFailure;
export const isYamlToJsonSuccess = (
  r: YamlToJsonResult
): r is YamlToJsonSuccess => r.success;

export interface JsonToYamlSuccess {
  success: true;
  yaml: string;
}
export type JsonToYamlResult = JsonToYamlSuccess | ToolFailure;
export const isJsonToYamlSuccess = (
  r: JsonToYamlResult
): r is JsonToYamlSuccess => r.success;

/* ------------------------------------------------------------------ */
/*                          XML  ↔  JSON                              */
/* ------------------------------------------------------------------ */
export interface XmlToJsonSuccess {
  success: true;
  data: unknown;
}
export type XmlToJsonResult = XmlToJsonSuccess | ToolFailure;
export const isXmlToJsonSuccess = (r: XmlToJsonResult): r is XmlToJsonSuccess =>
  r.success;

export interface JsonToXmlSuccess {
  success: true;
  xml: string;
}
export type JsonToXmlResult = JsonToXmlSuccess | ToolFailure;
export const isJsonToXmlSuccess = (r: JsonToXmlResult): r is JsonToXmlSuccess =>
  r.success;

/* ------------------------------------------------------------------ */
/*                      Markdown-table  ↔  JSON                       */
/* ------------------------------------------------------------------ */
export interface MdTableToJsonSuccess {
  success: true;
  rows: Record<string, string>[];
}
export type MdTableToJsonResult = MdTableToJsonSuccess | ToolFailure;
export const isMdTableToJsonSuccess = (
  r: MdTableToJsonResult
): r is MdTableToJsonSuccess => r.success;

export interface JsonToMdTableSuccess {
  success: true;
  markdown: string;
}
export type JsonToMdTableResult = JsonToMdTableSuccess | ToolFailure;
export const isJsonToMdTableSuccess = (
  r: JsonToMdTableResult
): r is JsonToMdTableSuccess => r.success;
