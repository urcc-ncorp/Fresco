import { createId } from '@paralleldrive/cuid2';
import { copyFile, mkdir, readdir, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ASSETS_DIR = resolve(
  // eslint-disable-next-line no-process-env
  process.env.ASSETS_PATH ?? './data/assets',
);

const EXPORTS_DIR = resolve(
  // eslint-disable-next-line no-process-env
  process.env.EXPORTS_PATH ?? './data/exports',
);

export async function getAssetsDir() {
  await mkdir(ASSETS_DIR, { recursive: true });
  return ASSETS_DIR;
}

export async function getExportsDir() {
  await mkdir(EXPORTS_DIR, { recursive: true });
  return EXPORTS_DIR;
}

export async function saveAssetFile(file: File) {
  const dir = await getAssetsDir();
  const key = createId();
  const fileDir = join(dir, key);
  await mkdir(fileDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = join(fileDir, file.name);
  await writeFile(filePath, buffer);

  return {
	key,
	name: file.name,
	url: `/api/assets/${key}/${encodeURIComponent(file.name)}`,
	size: file.size,
  };
}

export async function deleteAssetFiles(keys: string[]) {
  const dir = await getAssetsDir();
  await Promise.all(
	keys.map((key) => rm(join(dir, key), { recursive: true, force: true })),
  );
}

export async function saveExportZip(sourcePath: string) {
  const dir = await getExportsDir();
  const key = createId();
  const filename = `${key}.zip`;
  const destPath = join(dir, filename);
  await copyFile(sourcePath, destPath);

  // Delete the source temp file
  await unlink(sourcePath).catch(() => {
	// Ignore if already deleted
  });

  return {
	url: `/api/exports/${filename}`,
	key: filename,
  };
}

export async function deleteExportFile(filename: string) {
  const dir = await getExportsDir();
  const filePath = join(dir, filename);
  await unlink(filePath).catch(() => {
	// Ignore if already deleted
  });
}

export async function clearAllFiles() {
  const assetsDir = await getAssetsDir();
  const exportsDir = await getExportsDir();

  // Clear assets
  const assetEntries = await readdir(assetsDir).catch(() => []);
  await Promise.all(
	assetEntries.map((entry) =>
	  rm(join(assetsDir, entry), { recursive: true, force: true }),
	),
  );

  // Clear exports
  const exportEntries = await readdir(exportsDir).catch(() => []);
  await Promise.all(
	exportEntries.map((entry) =>
	  rm(join(exportsDir, entry), { recursive: true, force: true }),
	),
  );
}

export async function getFileSize(filePath: string) {
  const stats = await stat(filePath);
  return stats.size;
}
