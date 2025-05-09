/**
 * Persona System Index
 *
 * This module exports all core components of the persona system,
 * providing a single point of entry for accessing personas, managers,
 * utilities, and associated types and schemas.
 */

// --- Import from modules for re-export and default object construction ---

// Core Persona Library
import personaLibraryDefault, {
  // Enums
  GeminiSafetyCategory,
  GeminiSafetyThreshold,
  GeminiCapability,
  // Schemas (Zod)
  PersonaDefinitionSchema,
  MicroPersonaDefinitionSchema,
  SafetySettingSchema,
  ExampleDialogueSchema,
  PersonaScoreSchema,
  ScoreUpdateDataSchema,
  GeminiModelIdSchema,
  // Types (derived from Zod schemas or standalone)
  type PersonaDefinition,
  type MicroPersonaDefinition,
  type SafetySetting,
  type ExampleDialogue,
  type PersonaScore,
  type ScoreUpdateData,
  type GeminiModelId,
  // Validation and Composition Functions
  validatePersonaDefinition,
  validateMicroPersonaDefinition,
  composePersona,
  // Pre-defined Persona Collections
  basePersonas,
  specializedPersonas,
} from './persona-library';

// Persona Manager
import {
  personaManager as personaManagerInstance,
  PersonaFileFormat as PersonaManagerFileFormat, // Renamed to avoid conflict if any
  PersonaFileContent as PersonaManagerFileContent, // Renamed to avoid conflict if any
  // PersonaManager, // Export class if needed for extension
} from './persona-manager';

// Persona Score Manager
import {
  personaScoreManager as personaScoreManagerInstance,
  // PersonaScoreManager, // Export class if needed for extension
} from './persona-score-manager';

// Extended Persona Library
import extendedPersonaLibraryDefault, {
  domainPersonas as extendedDomainPersonas,
  taskPersonas as extendedTaskPersonas,
  registerDomainPersonas as registerExtendedDomainPersonas,
  registerTaskPersonas as registerExtendedTaskPersonas,
  registerAllExtendedPersonas as registerAllExtPersonas,
} from './persona-library-extended';

// Persona Library Utilities
import personaLibraryUtilsDefault, {
  initializePersonaLibrary as initLib,
  getAllPersonaDefinitions as getAllDefs,
  createTaskProvider as createTaskProv,
  getPersonaByTaskType as getByTaskType,
  exportPersonaLibraryToFiles as exportLibToFiles,
} from './persona-library-utils';

// Examples
import personaLibraryExampleDefault, {
  initializeLibrary as exampleInitializeLibrary,
  listAllPersonas as exampleListAllPersonas,
  getTopPerformingPersonas as exampleGetTopPerformingPersonas,
  usePersonaForTask as exampleUsePersonaForTask,
  streamWithPersona as exampleStreamWithPersona,
  recordFeedbackForPersona as exampleRecordFeedbackForPersona,
} from './examples/persona-library-example';

import personaScoreExampleDefault, {
  selectPersonaForTask as exampleSelectPersonaForTask,
  usePersonaForTaskWithScoring as exampleUsePersonaForTaskWithScoring,
  recordFeedbackForPersonaWithScoring as exampleRecordFeedbackForPersonaWithScoring,
  getTopPerformingPersonasWithScoring as exampleGetTopPerformingPersonasWithScoring,
  getMostUsedPersonas as exampleGetMostUsedPersonas,
} from './examples/persona-score-example';


// --- Re-export all imported items ---

// Core Persona Library Exports
export {
  GeminiSafetyCategory,
  GeminiSafetyThreshold,
  GeminiCapability,
  PersonaDefinitionSchema,
  MicroPersonaDefinitionSchema,
  SafetySettingSchema,
  ExampleDialogueSchema,
  PersonaScoreSchema,
  ScoreUpdateDataSchema,
  GeminiModelIdSchema,
  PersonaDefinition,
  MicroPersonaDefinition,
  SafetySetting,
  ExampleDialogue,
  PersonaScore,
  ScoreUpdateData,
  GeminiModelId,
  validatePersonaDefinition,
  validateMicroPersonaDefinition,
  composePersona,
  basePersonas,
  specializedPersonas,
  personaLibraryDefault as personaLibrary,
};

// Persona Manager Exports
export {
  personaManagerInstance as personaManager,
  PersonaManagerFileFormat,
  PersonaManagerFileContent,
  // PersonaManager, // Export class if needed
};

// Persona Score Manager Exports
export {
  personaScoreManagerInstance as personaScoreManager,
  // PersonaScoreManager, // Export class if needed
};

// Extended Persona Library Exports
export {
  extendedDomainPersonas as domainPersonas,
  extendedTaskPersonas as taskPersonas,
  registerExtendedDomainPersonas as registerDomainPersonas,
  registerExtendedTaskPersonas as registerTaskPersonas,
  registerAllExtPersonas as registerAllExtendedPersonas,
  extendedPersonaLibraryDefault as extendedPersonaLibrary,
};

// Persona Library Utilities Exports
export {
  initLib as initializePersonaLibrary,
  getAllDefs as getAllPersonaDefinitions,
  createTaskProv as createTaskProvider,
  getByTaskType as getPersonaByTaskType,
  exportLibToFiles as exportPersonaLibraryToFiles,
  personaLibraryUtilsDefault as personaLibraryUtils,
};

// Example Exports (if intended for library consumers)
export {
  personaLibraryExampleDefault as personaLibraryExample,
  exampleInitializeLibrary as initializeLibrary,
  exampleListAllPersonas as listAllPersonas,
  exampleGetTopPerformingPersonas as getTopPerformingPersonas,
  exampleUsePersonaForTask as usePersonaForTask,
  exampleStreamWithPersona as streamWithPersona,
  exampleRecordFeedbackForPersona as recordFeedbackForPersona,
};
export {
  personaScoreExampleDefault as personaScoreExample,
  exampleSelectPersonaForTask as selectPersonaForTask,
  exampleUsePersonaForTaskWithScoring as usePersonaForTaskWithScoring,
  exampleRecordFeedbackForPersonaWithScoring as recordFeedbackForPersonaWithScoring,
  exampleGetTopPerformingPersonasWithScoring as getTopPerformingPersonasWithScoring,
  exampleGetMostUsedPersonas as getMostUsedPersonas,
};

// --- Aggregated Default Export ---
export default {
  // Managers
  personaManager: personaManagerInstance,
  personaScoreManager: personaScoreManagerInstance,
  // Libraries
  personaLibrary: personaLibraryDefault,
  extendedPersonaLibrary: extendedPersonaLibraryDefault,
  // Utilities
  personaLibraryUtils: personaLibraryUtilsDefault,
  // Examples
  personaLibraryExample: personaLibraryExampleDefault,
  personaScoreExample: personaScoreExampleDefault,
  // Key Schemas & Types (optional, for convenience if users prefer default import)
  // PersonaDefinitionSchema,
  // PersonaScoreSchema,
  // PersonaDefinition,
  // PersonaScore,
};
