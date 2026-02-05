/**
 * Next.js API Route: /api/admin/operational-expenses/sync
 * Proxies sync action to backend for auto-generating expense records
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const BACKEND_ENDPOINT = '/api/v1/admin/operational-expenses';

export async function POST(request: NextRequest) {
    try {
        const url = `${BACKEND_URL}${BACKEND_ENDPOINT}/sync`;

        console.log('[API Proxy] POST /api/admin/operational-expenses/sync ->', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(request.headers.get('authorization') && {
                    'Authorization': request.headers.get('authorization')!,
                }),
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[API Proxy] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to sync expenses' },
            { status: 500 }
        );
    }
}
