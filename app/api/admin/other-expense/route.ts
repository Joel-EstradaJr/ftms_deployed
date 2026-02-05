/**
 * Next.js API Route: /api/admin/other-expense
 * Proxies requests to backend /api/v1/admin/other-expense
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const BACKEND_ENDPOINT = '/api/v1/admin/other-expense';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const queryString = searchParams.toString();
        const url = `${BACKEND_URL}${BACKEND_ENDPOINT}${queryString ? `?${queryString}` : ''}`;

        console.log('[API Proxy] GET /api/admin/other-expense ->', url);

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
            { success: false, error: 'Failed to fetch administrative expenses' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const url = `${BACKEND_URL}${BACKEND_ENDPOINT}`;

        console.log('[API Proxy] POST /api/admin/other-expense ->', url);

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
        console.error('[API Proxy] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create administrative expense' },
            { status: 500 }
        );
    }
}
