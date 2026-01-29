/**
 * Next.js API Route: /api/admin/rental-revenue/analytics
 * Proxies GET requests to backend /api/v1/admin/rental-revenue/analytics
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const queryString = searchParams.toString();
        const url = `${BACKEND_URL}/api/v1/admin/rental-revenue/analytics${queryString ? `?${queryString}` : ''}`;

        console.log('[API Proxy] GET /api/admin/rental-revenue/analytics ->', url);

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
        console.error('[API Proxy] Error fetching analytics:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch rental analytics' },
            { status: 500 }
        );
    }
}
