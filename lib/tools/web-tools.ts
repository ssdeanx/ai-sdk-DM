/**
 * @file Back-compatibility barrel so existing imports such as
 *       `import { tools } from "@/lib/tools/web-tools"` keep working
 *       after the tool-suite was moved to `lib/tools/web/`.
 *
 * @remarks
 *   • The real implementation now lives in `lib/tools/web/tools.ts`.
 *   • We re-export its `tools` object plus the public `types` and
 *     `constants` modules for direct consumption when needed.
 */

import { tools as webTools } from './web/tools';
import * as webTypes from './web/types';
import * as webConstants from './web/constants';

export { webTools as tools };
export { webTypes };
export { webConstants };
