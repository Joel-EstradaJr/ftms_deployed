/**
 * Next.js API Route: /api/admin/rental-revenue/[id]/cancel
 * Proxies POST requests to backend /api/v1/admin/rental-revenue/:id/cancel
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const url = `${BACKEND_URL}/api/v1/admin/rental-revenue/${id}/cancel`;
        const body = await request.json();

        console.log('[API Proxy] POST /api/admin/rental-revenue/[id]/cancel ->', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(request.headers.get('authorization') && {
                    'Authorization': request.headers.get('authorization')!,
                }),
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[API Proxy] Error cancelling rental:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to cancel rental' },
            { status: 500 }
        );
    }
}
