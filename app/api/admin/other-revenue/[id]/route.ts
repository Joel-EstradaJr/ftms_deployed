/**
 * Other Revenue Item API Proxy Route
 * 
 * Proxies requests to the ftms_backend API at:
 * GET http://localhost:4000/api/v1/admin/other-revenue/:id
 * PATCH http://localhost:4000/api/v1/admin/other-revenue/:id
 */

import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const backendUrl = `${BACKEND_URL}/api/v1/admin/other-revenue/${id}`;

        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Forward authorization header if present
                ...(request.headers.get('authorization') && {
                    'Authorization': request.headers.get('authorization')!,
                }),
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
        console.error('[API Proxy] Other Revenue GET by ID error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to connect to backend' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const response = await fetch(`${BACKEND_URL}/api/v1/admin/other-revenue/${id}`, {
            method: 'PATCH',
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
        console.error('[API Proxy] Other Revenue PATCH error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to connect to backend' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const response = await fetch(`${BACKEND_URL}/api/v1/admin/other-revenue/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                // Forward authorization header if present
                ...(request.headers.get('authorization') && {
                    'Authorization': request.headers.get('authorization')!,
                }),
            }
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });

    } catch (error) {
        console.error('[API Proxy] Other Revenue DELETE error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to connect to backend' },
            { status: 500 }
        );
    }
}
