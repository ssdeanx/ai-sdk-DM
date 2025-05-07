/**
 * @file Backwards-compatibility barrel for the “file” tool-suite.
 *
 * @remarks
 *   • Consumers can continue to `import … from "@/lib/tools/file-tools"`  
 *     while the real implementation lives in `lib/tools/file/`.  
 *   • We simply import the symbols so that TypeScript resolves the files  
 *     then we re-export what callers are expected to see.
 */

import { tools as fileTools } from './file/tools'
import * as fileTypes from './file/types'
import * as fileConstants from './file/constants'

export { fileTools as tools }
export { fileTypes }
export { fileConstants }