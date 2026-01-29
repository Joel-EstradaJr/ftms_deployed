/**
 * Next.js API Route: /api/admin/rental-revenue/[id]
 * Proxies requests to backend /api/v1/admin/rental-revenue/:id
 * - GET: Fetch rental revenue details
 * - PATCH: Update rental revenue record
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const url = `${BACKEND_URL}/api/v1/admin/rental-revenue/${id}`;

        console.log('[API Proxy] GET /api/admin/rental-revenue/[id] ->', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(request.headers.get('authorization') && {
                    'Authorization': request.headers.get('authorization')!,
                }),
            },
            cache: 'no-store',
        });

        const data = await response.json();

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[API Proxy] Error fetching rental revenue by ID:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch rental revenue details' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const url = `${BACKEND_URL}/api/v1/admin/rental-revenue/${id}`;
        const body = await request.json();

        console.log('[API Proxy] PATCH /api/admin/rental-revenue/[id] ->', url);

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
        console.error('[API Proxy] Error updating rental revenue:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update rental revenue record' },
            { status: 500 }
        );
    }
}
