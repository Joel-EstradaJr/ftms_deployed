/**
 * Next.js API Route: /api/admin/revenue
 * Proxies requests to backend GET /api/v1/admin/bus-trip-revenue
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Build query string from search params
        const queryString = searchParams.toString();
        const url = `${BACKEND_URL}/api/v1/admin/bus-trip-revenue${queryString ? `?${queryString}` : ''}`;

        console.log('[API Proxy] GET /api/admin/revenue ->', url);

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
