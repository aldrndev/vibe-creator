import { afterEach, describe, expect, it } from 'vitest';
import { useDirectorStore } from '@/stores/director-store';

describe('director-store transcribe language', () => {
  afterEach(() => {
    useDirectorStore.getState().reset();
  });

  it('uses mixed auto mode as default transcribe language', () => {
    expect(useDirectorStore.getState().transcribeLanguage).toBe('mixed');
  });

  it('updates transcribe language to english when selected', () => {
    useDirectorStore.getState().setTranscribeLanguage('en');

    expect(useDirectorStore.getState().transcribeLanguage).toBe('en');
  });

  it('resets transcribe language back to mixed auto mode', () => {
    const state = useDirectorStore.getState();

    state.setTranscribeLanguage('en');
    state.reset();

    expect(useDirectorStore.getState().transcribeLanguage).toBe('mixed');
  });

  it('resets subtitle translation mode settings to defaults', () => {
    const state = useDirectorStore.getState();

    state.setSubtitleMode('translate');
    state.setSubtitleTargetLanguage('es');
    state.reset();

    expect(useDirectorStore.getState().subtitleMode).toBe('original');
    expect(useDirectorStore.getState().subtitleTargetLanguage).toBe('en');
  });
});
