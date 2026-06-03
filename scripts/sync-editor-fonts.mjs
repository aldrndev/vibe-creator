#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '..');
const catalogPath = join(workspaceRoot, 'packages/shared/src/constants/editor-fonts.ts');
const webFontDir = join(workspaceRoot, 'apps/web/public/fonts/editor');
const apiFontDir = join(workspaceRoot, 'apps/api/src/assets/fonts/editor');
const googleFontsApiBase = 'https://api.github.com/repos/google/fonts/contents';

const fontFolderSlugs = {
  'bebas-neue': 'bebasneue',
  anton: 'anton',
  'archivo-black': 'archivoblack',
  oswald: 'oswald',
  'league-spartan': 'leaguespartan',
  poppins: 'poppins',
  montserrat: 'montserrat',
  inter: 'inter',
  'dm-sans': 'dmsans',
  'plus-jakarta-sans': 'plusjakartasans',
  'space-grotesk': 'spacegrotesk',
  sora: 'sora',
  outfit: 'outfit',
  urbanist: 'urbanist',
  barlow: 'barlow',
  'roboto-condensed': 'robotocondensed',
  'noto-sans': 'notosans',
  manrope: 'manrope',
  'nunito-sans': 'nunitosans',
  bangers: 'bangers',
  'luckiest-guy': 'luckiestguy',
  'permanent-marker': 'permanentmarker',
  fredoka: 'fredoka',
  'baloo-2': 'baloo2',
};

function writeLine(message) {
  process.stdout.write(`${message}\n`);
}

function parseCatalog(source) {
  const entryPattern =
    /id: '([^']+)'[\s\S]*?family: '([^']+)'[\s\S]*?regularFile: '([^']+)'[\s\S]*?boldFile: '([^']+)'/g;
  const entries = [];

  for (const match of source.matchAll(entryPattern)) {
    const [, id, family, regularFile, boldFile] = match;
    if (!id || !family || !regularFile || !boldFile) {
      throw new Error('Unable to parse editor font catalog entry.');
    }
    entries.push({ id, family, regularFile, boldFile });
  }

  return entries;
}

async function findFamilyDirectory(slug) {
  const licenseRoots = ['ofl', 'apache', 'ufl'];

  for (const licenseRoot of licenseRoots) {
    const directoryUrl = `${googleFontsApiBase}/${licenseRoot}/${slug}`;
    const response = await fetch(directoryUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'vibe-creator-font-sync',
      },
    });

    if (response.ok) {
      return {
        licenseRoot,
        files: await response.json(),
      };
    }
  }

  throw new Error(`Google Fonts directory not found for ${slug}.`);
}

function compactName(value) {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function selectTtfFile(files, family, targetWeight) {
  const targetFamily = compactName(family);
  const fontFiles = files
    .filter((file) => file.type === 'file' && file.name.endsWith('.ttf'))
    .filter((file) => !file.name.toLowerCase().includes('italic'));

  const exactName = `${targetFamily}-${targetWeight}.ttf`.toLowerCase();
  const exactFile = fontFiles.find((file) => compactName(file.name) === compactName(exactName));
  if (exactFile) {
    return exactFile;
  }

  const staticFile = fontFiles.find((file) => file.name.toLowerCase().includes(targetWeight));
  if (staticFile) {
    return staticFile;
  }

  const regularFile = fontFiles.find((file) => file.name.toLowerCase().includes('regular'));
  if (regularFile && targetWeight === 'regular') {
    return regularFile;
  }

  const variableFile = fontFiles.find((file) => file.name.includes('['));
  if (variableFile) {
    return variableFile;
  }

  const fallbackFile = fontFiles[0];
  if (!fallbackFile) {
    throw new Error(`No TTF file found for ${family}.`);
  }

  return fallbackFile;
}

async function downloadBytes(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'vibe-creator-font-sync',
    },
  });

  if (!response.ok) {
    throw new Error(`Font download failed ${response.status}: ${url}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function writeFontPair(fileName, bytes) {
  await writeFile(join(webFontDir, fileName), bytes);
  await writeFile(join(apiFontDir, fileName), bytes);
}

async function syncFonts() {
  const catalogSource = await readFile(catalogPath, 'utf8');
  const catalog = parseCatalog(catalogSource);
  await mkdir(webFontDir, { recursive: true });
  await mkdir(apiFontDir, { recursive: true });

  for (const font of catalog) {
    const slug = fontFolderSlugs[font.id];
    if (!slug) {
      throw new Error(`Missing Google Fonts folder slug for ${font.id}.`);
    }

    const familyDirectory = await findFamilyDirectory(slug);
    const regularFile = selectTtfFile(familyDirectory.files, font.family, 'regular');
    const boldFile = selectTtfFile(familyDirectory.files, font.family, 'bold');
    const regularUrl = regularFile.download_url;
    const boldUrl = boldFile.download_url;

    if (!regularUrl || !boldUrl) {
      throw new Error(`Missing download URL for ${font.family}.`);
    }

    const regularBytes = await downloadBytes(regularUrl);
    const boldBytes = boldUrl === regularUrl ? regularBytes : await downloadBytes(boldUrl);

    await writeFontPair(font.regularFile, regularBytes);
    await writeFontPair(font.boldFile, boldBytes);

    writeLine(
      `Synced ${font.family} from google/fonts/${familyDirectory.licenseRoot}/${slug} (${regularFile.name}, ${boldFile.name})`,
    );
  }
}

await syncFonts();
