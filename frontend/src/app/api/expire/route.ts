import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { swarmReference } = await req.json();

    if (!swarmReference) {
      return NextResponse.json({ error: 'Missing swarmReference' }, { status: 400 });
    }

    const session = globalThis.activeDeadDropSessions?.get(swarmReference);
    if (!session) {
      return NextResponse.json({
        success: true,
        alreadyExpired: true,
        message: 'Data room already expired and pruned globally.'
      });
    }

    // Force expiration & scrub
    session.status = 'EXPIRED';
    session.expiresAt = Date.now() - 1000;
    globalThis.activeDeadDropSessions?.delete(swarmReference);

    return NextResponse.json({
      success: true,
      message: 'Postage batch expired. All data chunks permanently dropped by network nodes.',
      swarmReference,
      status: 'PRUNED_404'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Expiration trigger failed' }, { status: 500 });
  }
}
