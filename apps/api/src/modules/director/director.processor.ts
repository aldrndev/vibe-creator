/**
 * Director Processor Facade
 * Aggregates video processing services.
 *
 * REFACTORED: Logic moved to ./processing/* for modularity.
 */

import { videoAnalysisService } from './processing/video-analysis.service';
import { videoExportService } from './processing/video-export.service';
import { videoExtractionService } from './processing/video-extraction.service';
import { videoMetadataService } from './processing/video-metadata.service';

// Export types for consumers
export * from './processing/types';

export const directorProcessor = {
  ...videoMetadataService,
  ...videoExtractionService,
  ...videoAnalysisService,
  ...videoExportService,

  /**
   * Deprecated helper
   */
  postProcessSegments: () => [],
};
