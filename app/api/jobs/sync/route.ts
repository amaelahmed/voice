import { NextResponse } from 'next/server';
import { JobsService } from '@/lib/jobs/JobsService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    // Basic protection for cron jobs
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const service = new JobsService();
    try {
        await service.sync();
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Sync failed", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
