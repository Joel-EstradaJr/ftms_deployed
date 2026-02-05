/**
 * Other Revenue Payment API Proxy Route
 * 
 * Proxies requests to the ftms_backend API at:
 * POST http://localhost:3001/api/v1/admin/other-revenue/payment
 */

import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const response = await fetch(`${BACKEND_URL}/api/v1/admin/other-revenue/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Forward authorization header if present
                ...(request.headers.get('authorization') && {
                    'Authorization': request.headers.get('authorization')!,
                }),
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });

    } catch (error) {
        console.error('[API Proxy] Other Revenue Payment POST error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to connect to backend' },
            { status: 500 }
        );
    }
}
