/**
 * Next.js API Route: /api/staff/other-expense/payment-methods
 * Proxies GET to backend /api/v1/staff/other-expense/payment-methods
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const BACKEND_ENDPOINT = '/api/v1/staff/other-expense/payment-methods';

export async function GET(request: NextRequest) {
    try {
        const url = `${BACKEND_URL}${BACKEND_ENDPOINT}`;

        console.log('[API Proxy] GET /api/staff/other-expense/payment-methods ->', url);

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
        console.error('[API Proxy] Error fetching staff payment methods:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch payment methods' },
            { status: 500 }
        );
    }
}
