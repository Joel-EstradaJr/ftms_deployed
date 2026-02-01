import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

/**
 * GET /api/admin/other-expense/vendors
 * Proxy to backend: GET /api/v1/admin/other-expense/vendors OR /api/v1/admin/suppliers/vendors
 * Returns unified vendor list for dropdown
 */
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');

        // Try the suppliers endpoint first (dedicated vendors endpoint)
        let res = await fetch(`${BACKEND_URL}/api/v1/admin/suppliers/vendors`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader && { Authorization: authHeader }),
            },
            cache: 'no-store',
        });

        // Fallback to other-expense/vendors if suppliers endpoint doesn't exist
        if (res.status === 404) {
            res = await fetch(`${BACKEND_URL}/api/v1/admin/other-expense/vendors`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authHeader && { Authorization: authHeader }),
                },
                cache: 'no-store',
            });
        }

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error: any) {
        console.error('[API Proxy] Error fetching vendors:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch vendors', error: error.message },
            { status: 500 }
        );
    }
}
