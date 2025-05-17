/**
 * @file Back-compatibility barrel so existing imports such as
 *       `import { tools } from "@/lib/tools/data-tools"` keep working
 *       after the tool-suite was moved to `lib/tools/data/`.
 *
 * @remarks
 *   • The real implementation now lives in `lib/tools/data/tools.ts`.
 *   • We re-export its `tools` object plus the public `types` and
 *     `constants` modules for direct consumption when needed.
 */

import { tools as dataTools } from './data/tools';
import * as dataTypes from './data/types';
import * as dataConstants from './data/constants';

export { dataTools as tools };
export { dataTypes };
export { dataConstants };
