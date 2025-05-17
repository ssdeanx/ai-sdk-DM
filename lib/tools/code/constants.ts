/**
 * @file Centralised constants that are shared by both the validation
 *       schemas (Zod) and the implementation logic.  Keeping the literals
 *       here prevents the validator and the business rules from drifting
 *       apart.
 */

export const LANG_EXECUTE = ['javascript', 'python', 'shell'] as const;

export const LANG_ANALYZE = [
  'javascript',
  'python',
  'typescript',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'ruby',
  'php',
] as const;

export const ANALYSES = [
  'complexity',
  'security',
  'style',
  'performance',
] as const;

/**
 * Pre-compiled dangerous-pattern matchers (compile-once on module load).
 */
export const DANGEROUS_PATTERNS: ReadonlyMap<
  (typeof LANG_ANALYZE)[number],
  ReadonlyArray<RegExp>
> = new Map([
  [
    'javascript',
    ['eval\\(', 'new Function\\(', 'setTimeout\\(', 'setInterval\\('].map(
      (p) => new RegExp(p, 'g')
    ),
  ],
  [
    'python',
    ['eval\\(', 'exec\\(', 'os\\.system\\(', 'subprocess'].map(
      (p) => new RegExp(p, 'g')
    ),
  ],
]);
