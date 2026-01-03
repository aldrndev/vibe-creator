/**
 * FFmpeg Progress Parser - Unit Tests
 * Tests for chunk boundary handling, frame parsing, phase aggregation
 */

import { describe, it, expect } from 'vitest';
import {
  createProgressParser,
  createPhaseAggregator,
  PHASE_WEIGHTS,
} from '../ffmpeg-progress';

describe('ffmpeg-progress', () => {
  describe('ProgressParser', () => {
    it('should parse complete progress frames', () => {
      const parser = createProgressParser(10000); // 10 seconds
      
      const chunk = `frame=100
fps=30
stream_0_0_q=1.0
bitrate=1000kbps
total_size=125000
out_time_us=5000000
out_time_ms=5000
out_time=00:00:05.000000
dup_frames=0
drop_frames=0
speed=1.0x
progress=continue
`;
      
      const updates = parser.parse(chunk);
      
      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0]?.type).toBe('PROGRESS');
      expect(updates[0]?.percent).toBeCloseTo(50, 0); // 5s / 10s = 50%
    });

    it('should handle chunk boundaries correctly', () => {
      const parser = createProgressParser(10000);
      
      // Send incomplete chunk
      const updates1 = parser.parse('out_time_us=250');
      expect(updates1).toHaveLength(0); // No complete frame yet
      
      // Complete the chunk
      const updates2 = parser.parse(`0000
speed=1.0x
progress=continue
`);
      
      expect(updates2.length).toBeGreaterThan(0);
      expect(updates2[0]?.type).toBe('PROGRESS');
    });

    it('should emit COMPLETED on progress=end', () => {
      const parser = createProgressParser(10000);
      
      const chunk = `out_time_us=10000000
progress=end
`;
      
      const updates = parser.parse(chunk);
      
      expect(updates.some(u => u.type === 'COMPLETED')).toBe(true);
      expect(updates.find(u => u.type === 'COMPLETED')?.percent).toBe(100);
    });

    it('should handle missing out_time_us gracefully', () => {
      const parser = createProgressParser(10000);
      
      const chunk = `speed=1.0x
progress=continue
`;
      
      // Should not crash and may return empty or with heartbeat
      const updates = parser.parse(chunk);
      expect(Array.isArray(updates)).toBe(true);
    });

    it('should clamp progress to max 100%', () => {
      const parser = createProgressParser(10000); // 10 seconds
      
      // out_time exceeds duration
      const chunk = `out_time_us=15000000
progress=continue
`;
      
      const updates = parser.parse(chunk);
      
      if (updates[0]?.percent !== undefined) {
        expect(updates[0].percent).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('PhaseAggregator', () => {
    it('should calculate weighted overall progress', () => {
      const aggregator = createPhaseAggregator();
      
      // TRIM 100% (weight 0.1) = 10%
      aggregator.updatePhase('TRIM', { type: 'COMPLETED', percent: 100 });
      
      // MIX 100% (weight 0.2) = 20%
      aggregator.updatePhase('MIX', { type: 'COMPLETED', percent: 100 });
      
      // ENCODE 50% (weight 0.6) = 30%
      aggregator.updatePhase('ENCODE', { type: 'PROGRESS', percent: 50 });
      
      // MUX 0% (weight 0.1) = 0%
      // Total = 10 + 20 + 30 + 0 = 60%
      
      const overall = aggregator.getOverallProgress();
      expect(overall).toBeCloseTo(60, 0);
    });

    it('should never exceed 100%', () => {
      const aggregator = createPhaseAggregator();
      
      aggregator.updatePhase('TRIM', { type: 'PROGRESS', percent: 150 }); // Over 100
      aggregator.updatePhase('MIX', { type: 'COMPLETED' });
      aggregator.updatePhase('ENCODE', { type: 'COMPLETED' });
      aggregator.updatePhase('MUX', { type: 'COMPLETED' });
      
      const overall = aggregator.getOverallProgress();
      expect(overall).toBeLessThanOrEqual(100);
    });

    it('should be monotonic (never decrease)', () => {
      const aggregator = createPhaseAggregator();
      
      aggregator.updatePhase('ENCODE', { type: 'PROGRESS', percent: 50 });
      const progress1 = aggregator.getOverallProgress();
      
      // Try to decrease progress
      aggregator.updatePhase('ENCODE', { type: 'PROGRESS', percent: 30 });
      const progress2 = aggregator.getOverallProgress();
      
      expect(progress2).toBeGreaterThanOrEqual(progress1);
    });

    it('should reset all phases', () => {
      const aggregator = createPhaseAggregator();
      
      aggregator.updatePhase('ENCODE', { type: 'COMPLETED' });
      expect(aggregator.getOverallProgress()).toBeGreaterThan(0);
      
      aggregator.reset();
      expect(aggregator.getOverallProgress()).toBe(0);
    });
  });

  describe('PHASE_WEIGHTS', () => {
    it('should sum to 1.0 (100%)', () => {
      const sum = Object.values(PHASE_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    });
  });
});
