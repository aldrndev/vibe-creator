import type { 
  ScriptPromptInput, 
  VoicePromptInput, 
  VideoGenPromptInput,
  ImagePromptInput,
  RelaxingPromptInput,
  CreativeScanPromptInput 
} from '../types/prompt';

/**
 * Template generator untuk Script Prompt
 * Menghasilkan prompt yang komprehensif untuk storytelling
 */
export function generateScriptPrompt(input: ScriptPromptInput): string {
  const platformGuide = {
    youtube: 'YouTube (fokus pada watch time, engagement, dan storytelling yang mendalam)',
    tiktok: 'TikTok (hook kuat di 3 detik pertama, fast-paced, trending sounds)',
    instagram: 'Instagram Reels (visual menarik, relatable, shareable)',
    facebook: 'Facebook (komunitas, discussion-driven, shareability)',
  };

  const narrativeGuide = {
    linear: 'Cerita linear dari awal hingga akhir dengan klimaks yang jelas',
    'hook-problem-solution': 'Hook → Problem → Agitate → Solution → CTA',
    'before-after': 'Kontras kuat antara keadaan sebelum dan sesudah',
    'story-arc': 'Setup → Rising Action → Climax → Resolution',
    listicle: 'Format list dengan transisi yang menarik antar poin',
  };

  const durationGuide = {
    '15s': '15 detik (micro-content, 1 pesan utama)',
    '30s': '30 detik (short-form, 1-2 poin kunci)',
    '60s': '1 menit (short-form detail, 2-3 poin)',
    '3min': '3 menit (medium-form, storytelling lengkap)',
    '10min': '10 menit (long-form, educational depth)',
    '30min': '30 menit (deep-dive, comprehensive)',
  };

  return `Kamu adalah script writer profesional untuk konten ${platformGuide[input.platform]}.

## BRIEF PROYEK
- **Niche**: ${input.niche}
- **Durasi Target**: ${durationGuide[input.duration]}
- **Tone**: ${input.tone}
- **Target Audiens**: ${input.targetAudience}
- **Goal Konten**: ${input.contentGoal}
- **Keywords**: ${input.keywords.join(', ')}
- **Pesan Utama**: ${input.keyMessage}

## STRUKTUR NARASI
Gunakan struktur: **${narrativeGuide[input.narrativeStyle]}**

## EMOTIONAL JOURNEY
Bawa audiens melalui perjalanan emosi berikut:
${input.emotionalJourney.map((e, i) => `${i + 1}. ${e}`).join('\n')}

## INSTRUKSI DETAIL

### Hook (0-3 detik)
- Buat hook yang SANGAT kuat dan menghentikan scroll
- Gunakan pattern interrupt atau pertanyaan provokatif
- Pastikan relevan dengan target audiens

### Body Content
- Kembangkan storytelling yang engaging dan relatable
- Gunakan bahasa yang sesuai dengan tone "${input.tone}"
- Sisipkan micro-hooks untuk mempertahankan perhatian
- Berikan value yang konkret dan actionable

### Closing
- Rangkum pesan utama dengan memorable
- Call to Action: ${input.callToAction || 'Sesuaikan dengan goal konten'}

${input.additionalContext ? `## KONTEKS TAMBAHAN\n${input.additionalContext}` : ''}

## OUTPUT YANG DIHARAPKAN

Buatkan script lengkap dengan format:

\`\`\`
[HOOK - 0:00-0:03]
(Apa yang diucapkan/ditampilkan)

[SCENE 1 - 0:03-...]
Visual: (Deskripsi visual)
Audio: (Apa yang diucapkan)
Text Overlay: (Jika ada)

[Lanjutkan untuk setiap scene...]

[CLOSING - ...]
Visual:
Audio:
CTA:
\`\`\`

Pastikan script:
1. Memiliki hook yang SANGAT kuat
2. Storytelling yang engaging dari awal hingga akhir
3. Timing yang realistis sesuai durasi ${input.duration}
4. Bahasa natural sesuai platform dan audiens
5. Value yang jelas dan memorable`;
}

/**
 * Template generator untuk Voice/TTS Prompt
 */
export function generateVoicePrompt(input: VoicePromptInput): string {
  const styleGuide = {
    narrator: 'profesional dan authoritative seperti narator dokumenter',
    conversational: 'santai dan ramah seperti ngobrol dengan teman',
    energetic: 'penuh semangat dan antusias',
    calm: 'tenang dan menenangkan',
    dramatic: 'dramatis dengan variasi intonasi yang kuat',
    friendly: 'hangat dan approachable',
  };

  const paceGuide = {
    slow: 'lambat dan deliberate untuk penekanan',
    normal: 'natural dan conversational',
    fast: 'cepat dan energetic',
    dynamic: 'bervariasi sesuai konteks - cepat saat exciting, lambat saat penting',
  };

  return `Kamu adalah voice director profesional. Buatkan panduan voice-over untuk text-to-speech AI.

## SCRIPT YANG AKAN DIBACAKAN
\`\`\`
${input.script}
\`\`\`

## KARAKTERISTIK SUARA
- **Style**: ${styleGuide[input.voiceStyle]}
- **Bahasa**: ${input.language === 'id' ? 'Bahasa Indonesia' : 'English'}
- **Gender**: ${input.gender}
- **Emosi Dominan**: ${input.emotion}
- **Pace**: ${paceGuide[input.pace]}

## PENEKANAN KHUSUS
Berikan penekanan pada kata/frasa berikut:
${input.emphasis.map((e, i) => `${i + 1}. "${e}"`).join('\n')}

## TITIK JEDA
Berikan jeda yang lebih panjang setelah:
${input.pausePoints.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

## OUTPUT YANG DIHARAPKAN

Buatkan prompt untuk AI TTS (ElevenLabs/PlayHT) dengan format:

1. **Voice Configuration**
   - Voice type recommendation
   - Stability setting (0-1)
   - Similarity boost (0-1)
   - Style exaggeration (0-1)

2. **Script dengan Markup**
   - Gunakan SSML atau markup khusus platform
   - Tandai jeda: <break time="Xs"/>
   - Tandai penekanan: <emphasis>text</emphasis>
   - Tandai variasi pitch jika perlu

3. **Segment Breakdown**
   - Pecah script menjadi segments jika diperlukan
   - Berikan note untuk setiap segment`;
}

/**
 * Template generator untuk Video Generation (Veo/Runway)
 */
export function generateVideoGenPrompt(input: VideoGenPromptInput): string {
  return `Kamu adalah prompt engineer untuk AI video generation (Veo, Runway, Pika).

## KONSEP VIDEO
${input.concept}

## SPESIFIKASI TEKNIS
- **Style**: ${input.style}
- **Aspect Ratio**: ${input.aspectRatio}
- **Durasi**: ${input.duration}
- **Camera**: ${input.camera}
- **Lighting**: ${input.lighting}
- **Movement**: ${input.movement}
- **Mood**: ${input.mood}
- **Color Palette**: ${input.colorPalette.join(', ')}

${input.additionalDetails ? `## DETAIL TAMBAHAN\n${input.additionalDetails}` : ''}

## OUTPUT YANG DIHARAPKAN

Buatkan prompt yang optimal untuk masing-masing platform:

### 1. Prompt untuk Veo
[Format khusus Veo dengan struktur yang tepat]

### 2. Prompt untuk Runway Gen-3
[Format khusus Runway]

### 3. Prompt untuk Pika
[Format khusus Pika]

Untuk setiap prompt, sertakan:
- Main prompt (detailed scene description)
- Negative prompt (apa yang harus dihindari)
- Recommended settings (jika ada)

Pastikan prompt:
1. Sangat deskriptif dan spesifik
2. Menggunakan terminology yang dipahami AI
3. Menghindari ambiguitas
4. Mencakup semua aspek visual yang penting`;
}

/**
 * Template generator untuk Image/Thumbnail
 */
export function generateImagePrompt(input: ImagePromptInput): string {
  const purposeGuide = {
    thumbnail: 'YouTube thumbnail yang clickable dan attention-grabbing',
    cover: 'Cover image profesional',
    post: 'Social media post image',
    story: 'Instagram/Facebook Story',
    banner: 'Banner/header image',
  };

  return `Kamu adalah prompt engineer untuk AI image generation (DALL-E, Midjourney, Ideogram).

## TUJUAN
${purposeGuide[input.purpose]}

## SPESIFIKASI
- **Subject**: ${input.subject}
- **Style**: ${input.style}
- **Aspect Ratio**: ${input.aspectRatio}
- **Mood**: ${input.mood}
- **Warna Dominan**: ${input.colors.join(', ')}
${input.textOverlay ? `- **Text Overlay**: "${input.textOverlay}"` : ''}
${input.brand ? `- **Brand**: ${input.brand}` : ''}

${input.additionalDetails ? `## DETAIL TAMBAHAN\n${input.additionalDetails}` : ''}

## OUTPUT YANG DIHARAPKAN

### 1. Prompt untuk DALL-E 3
[Detailed natural language prompt]

### 2. Prompt untuk Midjourney
[Dengan parameter --ar, --style, --v, dll]

### 3. Prompt untuk Ideogram
[Optimized untuk text rendering jika ada text overlay]

Untuk thumbnail YouTube, pastikan:
1. Wajah/ekspresi yang ekspresif (jika ada orang)
2. Kontras tinggi dan warna yang pop
3. Komposisi yang clear bahkan di ukuran kecil
4. Space untuk text jika diperlukan`;
}

/**
 * Template generator untuk Relaxing/Ambient Content
 */
export function generateRelaxingPrompt(input: RelaxingPromptInput): string {
  const moodGuide = {
    peaceful: 'damai dan tenang untuk relaksasi umum',
    focus: 'membantu konsentrasi dan produktivitas',
    sleep: 'menenangkan untuk membantu tidur',
    meditation: 'meditatif dan introspektif',
    study: 'background yang tidak mengganggu untuk belajar',
    relaxation: 'santai untuk menghilangkan stress',
  };

  const intensityGuide = {
    subtle: 'sangat halus, hampir tidak terasa',
    moderate: 'terasa tapi tidak dominan',
    immersive: 'immersive dan enveloping',
  };

  return `Kamu adalah sound designer untuk konten relaxing/ambient.

## ENVIRONMENT
${input.environment === 'custom' ? input.customEnvironment : input.environment}

## AUDIO DESIGN
- **Suara Utama**: ${input.primarySound}
- **Suara Sekunder**: ${input.secondarySounds.join(', ')}
- **Detail Ambient**: ${input.ambientDetails.join(', ')}
- **Intensitas**: ${intensityGuide[input.intensity]}
- **Mood Target**: ${moodGuide[input.mood]}
- **Durasi**: ${input.duration}
- **Seamless Loop**: ${input.loopSeamless ? 'Ya' : 'Tidak'}

${input.visualStyle ? `## VISUAL STYLE\n${input.visualStyle}` : ''}

## OUTPUT YANG DIHARAPKAN

### 1. Audio Prompt untuk AI Music Generation
Buatkan prompt untuk Suno/Udio dengan detail:
- Deskripsi soundscape lengkap
- Instrument/sound elements
- Tempo dan rhythm (biasanya ambient = no tempo)
- Dynamics dan evolution over time

### 2. Visual Prompt (untuk background video)
Prompt untuk generate visual yang cocok:
- Scene description
- Movement (subtle, slow)
- Color grading

### 3. Looping Strategy
Panduan untuk membuat ${input.duration} seamless loop:
- Fade points
- Transition techniques
- Variation patterns untuk menghindari monoton`;
}

/**
 * Template generator untuk Creative Scan/Competitor Analysis
 */
export function generateCreativeScanPrompt(input: CreativeScanPromptInput): string {
  const analysisGuide = {
    hook: 'fokus pada hook dan attention-grabbing elements',
    structure: 'fokus pada struktur dan pacing konten',
    engagement: 'fokus pada elemen yang drive engagement (likes, comments, shares)',
    full: 'analisis komprehensif semua aspek',
    'viral-elements': 'identifikasi elemen yang membuat konten viral',
  };

  return `Kamu adalah content strategist dan video analyst profesional.

## VIDEO YANG DIANALISIS
${input.sourceUrl ? `URL: ${input.sourceUrl}` : 'Video yang diupload'}

## NICHE
${input.niche}

## TIPE ANALISIS
${analysisGuide[input.analysisType]}

## FOKUS AREA
${input.focusAreas.map((f, i) => `${i + 1}. ${f}`).join('\n')}

${input.competitorInfo ? `## INFO KOMPETITOR\n${input.competitorInfo}` : ''}

## KEY FRAMES YANG DIEKSTRAK
${input.extractedFrames.length} frames telah diekstrak dari video.

## INSTRUKSI ANALISIS

Analisis video ini dan berikan insight untuk:

### 1. Hook Analysis (0-3 detik)
- Apa yang membuat hook effective/ineffective?
- Pattern yang digunakan
- Saran improvement untuk konten kita

### 2. Structure Breakdown
- Bagaimana video distruktur?
- Pacing dan rhythm
- Transisi antar segment

### 3. Engagement Elements
- Apa yang mendorong viewer untuk tetap menonton?
- CTA placement dan effectiveness
- Comment-baiting techniques (jika ada)

### 4. Visual & Audio Analysis
- Style visual yang digunakan
- Music/sound design choices
- Text overlay usage

### 5. Actionable Insights
- Apa yang bisa kita adopt?
- Apa yang bisa kita improve?
- Unique angle yang bisa kita ambil

### 6. Content Ideas
Berdasarkan analisis, buatkan 3-5 ide konten yang:
- Terinspirasi tapi tidak copy
- Sesuai dengan niche kita
- Potentially perform better`;
}

export const PROMPT_GENERATORS = {
  SCRIPT: generateScriptPrompt,
  VOICE: generateVoicePrompt,
  VIDEO_GEN: generateVideoGenPrompt,
  IMAGE: generateImagePrompt,
  RELAXING: generateRelaxingPrompt,
  CREATIVE_SCAN: generateCreativeScanPrompt,
} as const;
