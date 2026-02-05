/**
 * Next.js API Route: /api/staff/revenue/[id]
 * Proxies requests to backend /api/v1/staff/bus-trip-revenue/:id
 * - GET: Fetch revenue details
 * - PATCH: Update revenue record
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const url = `${BACKEND_URL}/api/v1/staff/bus-trip-revenue/${id}`;

        console.log('[API Proxy] GET /api/staff/revenue/[id] ->', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Forward authorization header if present
                ...(request.headers.get('authorization') && {
                    'Authorization': request.headers.get('authorization')!,
                }),
            },
            cache: 'no-store',
        });

        const data = await response.json();

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[API Proxy] Error fetching revenue by ID:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch revenue details' },
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
        const url = `${BACKEND_URL}/api/v1/staff/bus-trip-revenue/${id}`;
        const body = await request.json();

        console.log('[API Proxy] PATCH /api/staff/revenue/[id] ->', url);
        console.log('[API Proxy] Request body:', JSON.stringify(body, null, 2));

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                // Forward authorization header if present
                ...(request.headers.get('authorization') && {
                    'Authorization': request.headers.get('authorization')!,
                }),
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        console.log('[API Proxy] PATCH response status:', response.status);
        console.log('[API Proxy] PATCH response:', JSON.stringify(data, null, 2));

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[API Proxy] Error updating revenue:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update revenue record' },
            { status: 500 }
        );
    }
}
