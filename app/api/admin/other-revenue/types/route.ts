/**
 * Other Revenue Types API Proxy Route
 * 
 * Proxies requests to the ftms_backend API at:
 * GET http://localhost:4000/api/v1/admin/other-revenue/types
 */

import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export async function GET() {
    try {
        const backendUrl = `${BACKEND_URL}/api/v1/admin/other-revenue/types`;

        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { status: 'error', message: errorData.message || 'Backend request failed' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('[API Proxy] Other Revenue Types error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to connect to backend' },
            { status: 500 }
        );
    }
}
