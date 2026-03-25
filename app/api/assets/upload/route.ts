import { NextResponse } from 'next/server';
import { getServerSession } from '~/utils/auth';
import { saveAssetFile } from '~/lib/local-storage';

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
	return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll('files') as File[];

  if (files.length === 0) {
	return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  try {
    const results = await Promise.all(
      files.map(async (file) => saveAssetFile(file)),
    );

    return NextResponse.json(results);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Asset upload failed:', error);

    const message = error instanceof Error ? error.message : 'Unknown upload error';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
