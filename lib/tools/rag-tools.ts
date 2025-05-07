/**
 * @file Back-compatibility barrel so existing imports such as
 *       `import { tools } from "@/lib/tools/rag-tools"` keep working
 *       after the tool-suite was moved to `lib/tools/rag/`.
 *
 * @remarks
 *   • The real implementation now lives in `lib/tools/rag/tools.ts`.
 *   • We re-export its `tools` object plus the public `types` and
 *     `constants` modules for direct consumption when needed.
 */

import { tools as ragTools } from './rag/tools';
import * as ragTypes from './rag/types';
import * as ragConstants from './rag/constants';

export { ragTools as tools };
export { ragTypes };
export { ragConstants };
