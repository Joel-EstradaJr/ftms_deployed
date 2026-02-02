/**
 * Next.js API Route: /api/admin/other-expense/[id]/soft-delete
 * Proxies PATCH to backend /api/v1/admin/other-expense/{id}/soft-delete
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const BACKEND_ENDPOINT = '/api/v1/admin/other-expense';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const url = `${BACKEND_URL}${BACKEND_ENDPOINT}/${id}/soft-delete`;

        console.log('[API Proxy] PATCH /api/admin/other-expense/:id/soft-delete ->', url);

        const response = await fetch(url, {
            method: 'PATCH',
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
            { success: false, error: 'Failed to delete expense' },
            { status: 500 }
        );
    }
}
