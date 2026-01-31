/**
 * Next.js API Route: /api/admin/operational-expenses/[id]/reject
 * Proxies reject action to backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const BACKEND_ENDPOINT = '/api/v1/admin/operational-expenses';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const url = `${BACKEND_URL}${BACKEND_ENDPOINT}/${id}/reject`;

        console.log('[API Proxy] POST /api/admin/operational-expenses/[id]/reject ->', url);

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
        console.error('[API Proxy] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to reject expense' },
            { status: 500 }
        );
    }
}
