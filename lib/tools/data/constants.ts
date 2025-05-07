/**
 * @file Shared literals for the “data” tool-suite.
 */

export const DELIMITERS = [',', ';', '\t', '|'] as const;

export const LOGICAL_OPERATORS = ['AND', 'OR'] as const;

export const AGG_FUNCTIONS = ['sum', 'avg', 'min', 'max', 'count'] as const;