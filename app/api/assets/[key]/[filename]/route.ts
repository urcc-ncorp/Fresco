import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';
import { getAssetsDir } from '~/lib/local-storage';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.zip': 'application/zip',
};

function getContentType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string; filename: string }> },
) {
  const { key, filename } = await params;
  const decodedFilename = decodeURIComponent(filename);

  const assetsDir = await getAssetsDir();
  const filePath = join(assetsDir, key, decodedFilename);

  // Prevent path traversal
  if (!filePath.startsWith(assetsDir)) {
	return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
	const fileBuffer = await readFile(filePath);
	const contentType = getContentType(decodedFilename);

	return new NextResponse(fileBuffer, {
	  headers: {
		'Content-Type': contentType,
		'Cache-Control': 'public, max-age=31536000, immutable',
	  },
	});
  } catch {
	return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
