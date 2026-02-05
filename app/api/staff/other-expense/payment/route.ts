'use server';

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const token = request.headers.get('authorization') || '';

        const response = await fetch(`${API_BASE_URL}/api/v1/staff/other-expense/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[Staff Payment Proxy Error]:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to record payment' },
            { status: 500 }
        );
    }
}
