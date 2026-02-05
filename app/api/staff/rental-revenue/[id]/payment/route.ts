/**
 * Next.js API Route: /api/staff/rental-revenue/[id]/payment
 * Proxies POST requests to backend /api/v1/staff/rental-revenue/:id/pay-balance
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const url = `${BACKEND_URL}/api/v1/staff/rental-revenue/${id}/pay-balance`;

        console.log('[API Proxy] POST /api/staff/rental-revenue/[id]/payment ->', url);

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
        console.error('[API Proxy] Error processing staff rental payment:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process rental payment' },
            { status: 500 }
        );
    }
}
