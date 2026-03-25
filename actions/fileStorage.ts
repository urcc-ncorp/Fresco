'use server';

import { unlink } from 'node:fs/promises';
import type {
  ArchiveResult,
  ExportReturn,
} from '~/lib/network-exporters/utils/types';
import { saveExportZip, deleteExportFile } from '~/lib/local-storage';
import { requireApiAuth } from '~/utils/auth';
import { ensureError } from '~/utils/ensureError';

export const deleteExportZip = async (key: string) => {
  await requireApiAuth();
  await deleteExportFile(key);
};

export const uploadExportZip = async (
  results: ArchiveResult,
): Promise<ExportReturn> => {
  const { path: zipLocation, completed, rejected } = results;

  try {
	const { url, key } = await saveExportZip(zipLocation);

	return {
	  zipUrl: url,
	  zipKey: key,
	  status: rejected.length ? 'partial' : 'success',
	  error: rejected.length ? 'Some exports failed' : null,
	  failedExports: rejected,
	  successfulExports: completed,
	};
  } catch (error) {
	// Clean up the source file on error
	void unlink(zipLocation).catch((_e) => {
	  // Ignore if already deleted
	});
	const e = ensureError(error);
	return {
	  status: 'error',
	  error: e.message,
	};
  }
};