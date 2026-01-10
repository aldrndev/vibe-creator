/**
 * Director Service Facade
 * Aggregates all domain-specific services for the Director module.
 *
 * REFACTORED: Logic moved to ./services/* to reduce file complexity.
 */

import { directorSessionService } from "./services/session.service";
import { directorAssetService } from "./services/asset.service";
import { directorAnalysisService } from "./services/analysis.service";
import { directorTranscribeService } from "./services/transcribe.service";
import { directorExportService } from "./services/export.service";

export const directorService = {
  ...directorSessionService,
  ...directorAssetService,
  ...directorAnalysisService,
  ...directorTranscribeService,
  ...directorExportService,
};
