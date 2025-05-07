/**
 * Persona System Index
 * 
 * This module exports all components of the persona system, including
 * the persona manager, persona library, and utilities.
 */

// Export persona manager
export { personaManager } from './persona-manager';
export { PersonaFileFormat, PersonaFileContent } from './persona-manager';

// Export persona score manager
export { personaScoreManager } from './persona-score-manager';
export { PersonaScore, ScoreUpdateData } from './persona-score-manager';

// Export base persona library
export { default as personaLibrary } from './persona-library';
export { PersonaDefinition, basePersonas, specializedPersonas } from './persona-library';

// Export extended persona library
export { default as extendedPersonaLibrary } from './persona-library-extended';
export { domainPersonas, taskPersonas } from './persona-library-extended';

// Export persona library utilities
export { default as personaLibraryUtils } from './persona-library-utils';
export {
  initializePersonaLibrary,
  getAllPersonaDefinitions,
  createTaskProvider,
  getPersonaByTaskType,
  exportPersonaLibraryToFiles
} from './persona-library-utils';

// Export examples
export { default as personaLibraryExample } from './examples/persona-library-example';
export {
  initializeLibrary,
  listAllPersonas,
  getTopPerformingPersonas,
  usePersonaForTask,
  streamWithPersona,
  recordFeedbackForPersona
} from './examples/persona-library-example';

// Export persona score example
export { default as personaScoreExample } from './examples/persona-score-example';
export {
  selectPersonaForTask,
  usePersonaForTask as usePersonaForTaskWithScoring,
  recordFeedbackForPersona as recordFeedbackForPersonaWithScoring,
  getTopPerformingPersonas as getTopPerformingPersonasWithScoring,
  getMostUsedPersonas
} from './examples/persona-score-example';

// Export all as default
export default {
  personaManager,
  personaScoreManager,
  personaLibrary,
  extendedPersonaLibrary,
  personaLibraryUtils,
  personaLibraryExample,
  personaScoreExample
};
