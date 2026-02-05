/**
 * Next.js API Route: /api/staff/revenue
 * Proxies requests to backend GET /api/v1/staff/bus-trip-revenue
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Build query string from search params
        const queryString = searchParams.toString();
        const url = `${BACKEND_URL}/api/v1/staff/bus-trip-revenue${queryString ? `?${queryString}` : ''}`;

        console.log('[API Proxy] GET /api/staff/revenue ->', url);

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
        console.error('[API Proxy] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch revenue data' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const url = `${BACKEND_URL}/api/v1/staff/bus-trip-revenue`;
        const body = await request.json();

        console.log('[API Proxy] POST /api/staff/revenue ->', url);
        console.log('[API Proxy] Request body:', JSON.stringify(body, null, 2));

        const response = await fetch(url, {
            method: 'POST',
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

        console.log('[API Proxy] POST response status:', response.status);
        console.log('[API Proxy] POST response:', JSON.stringify(data, null, 2));

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[API Proxy] Error creating revenue:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create revenue record' },
            { status: 500 }
        );
    }
}
