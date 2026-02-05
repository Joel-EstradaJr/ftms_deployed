/**
 * Next.js API Route: /api/staff/other-expense/[id]/reject
 * Proxies POST to backend /api/v1/staff/other-expense/{id}/reject
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const BACKEND_ENDPOINT = '/api/v1/staff/other-expense';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const url = `${BACKEND_URL}${BACKEND_ENDPOINT}/${id}/reject`;

        console.log('[Staff API Proxy] POST /api/staff/other-expense/:id/reject ->', url);

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
        console.error('[Staff API Proxy] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to reject expense' },
            { status: 500 }
        );
    }
}
