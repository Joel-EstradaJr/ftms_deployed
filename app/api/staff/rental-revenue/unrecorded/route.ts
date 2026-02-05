/**
 * Next.js API Route: /api/staff/rental-revenue/unrecorded
 * Proxies GET requests to backend /api/v1/staff/rental-revenue/unrecorded
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const queryString = searchParams.toString();
        const url = `${BACKEND_URL}/api/v1/staff/rental-revenue/unrecorded${queryString ? `?${queryString}` : ''}`;

        console.log('[API Proxy] GET /api/staff/rental-revenue/unrecorded ->', url);

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
        console.error('[API Proxy] Error fetching staff unrecorded rentals:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch unrecorded rentals' },
            { status: 500 }
        );
    }
}
