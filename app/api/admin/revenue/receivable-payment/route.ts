/**
 * Next.js API Route: /api/admin/revenue/receivable-payment
 * Proxies requests to backend /api/v1/admin/bus-trip-revenue/receivable-payment
 * - POST: Record a receivable payment
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
    try {
        const url = `${BACKEND_URL}/api/v1/admin/bus-trip-revenue/receivable-payment`;
        const body = await request.json();

        console.log('[API Proxy] POST /api/admin/revenue/receivable-payment ->', url);
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
        console.error('[API Proxy] Error recording receivable payment:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to record receivable payment' },
            { status: 500 }
        );
    }
}
