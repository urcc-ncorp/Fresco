import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '~/utils/auth';
import { getExportsDir } from '~/lib/local-storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const session = await getServerSession();
  if (!session) {
	return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { filename } = await params;
  const decodedFilename = decodeURIComponent(filename);

  const exportsDir = await getExportsDir();
  const filePath = join(exportsDir, decodedFilename);

  // Prevent path traversal
  if (!filePath.startsWith(exportsDir)) {
	return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
	const fileBuffer = await readFile(filePath);

	return new NextResponse(fileBuffer, {
	  headers: {
		'Content-Type': 'application/zip',
		'Content-Disposition': `attachment; filename="Network Canvas Export.zip"`,
	  },
	});
  } catch {
	return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
