/**
 * Next.js API Route: /api/admin/rental-revenue
 * Proxies requests to backend GET /api/v1/admin/rental-revenue
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Build query string from search params
        const queryString = searchParams.toString();
        const url = `${BACKEND_URL}/api/v1/admin/rental-revenue${queryString ? `?${queryString}` : ''}`;

        console.log('[API Proxy] GET /api/admin/rental-revenue ->', url);

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
        console.error('[API Proxy] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch rental revenue data' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const url = `${BACKEND_URL}/api/v1/admin/rental-revenue`;
        const body = await request.json();

        console.log('[API Proxy] POST /api/admin/rental-revenue ->', url);

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
        console.error('[API Proxy] Error creating rental revenue:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create rental revenue' },
            { status: 500 }
        );
    }
}
