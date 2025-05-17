/**
 * @file Backwards-compatibility barrel for the "api" tool-suite.
 *
 * @remarks
 *   • Consumers can continue to `import … from "@/lib/tools/api-tools"`
 *     while the real implementation lives in `lib/tools/api/`.
 *   • We simply import the symbols so that TypeScript resolves the files
 *     then we re-export what callers are expected to see.
 */

import { tools as apiTools } from './api/tools';
import * as apiTypes from './api/types';
import * as apiConstants from './api/constants';

export { apiTools as tools };
export { apiTypes };
export { apiConstants };
