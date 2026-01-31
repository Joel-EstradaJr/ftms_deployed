/**
 * Other Revenue Reject API Proxy Route
 * 
 * Proxies PATCH requests to the ftms_backend API at:
 * PATCH http://localhost:4000/api/v1/admin/other-revenue/:id/reject
 */

import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));

        const response = await fetch(`${BACKEND_URL}/api/v1/admin/other-revenue/${id}/reject`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(request.headers.get('authorization') && {
                    'Authorization': request.headers.get('authorization')!,
                }),
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });

    } catch (error) {
        console.error('[API Proxy] Other Revenue REJECT error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to connect to backend' },
            { status: 500 }
        );
    }
}
