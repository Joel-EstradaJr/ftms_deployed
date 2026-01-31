/**
 * Next.js API Route: /api/admin/revenue/config
 * Proxies requests to backend bus-trip-revenue config endpoints
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
  try {
    const url = `${BACKEND_URL}/api/v1/admin/bus-trip-revenue/config`;

    console.log('[API Proxy] GET /api/admin/revenue/config ->', url);

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

    // Map backend field names to frontend field names
    if (data.success && data.data) {
      const mappedData = {
        minimum_wage: data.data.minimum_wage,
        duration_to_late: data.data.duration_to_receivable_hours,
        receivable_due_date: data.data.receivable_due_date_days,
        driver_share: data.data.driver_share_percentage,
        conductor_share: data.data.conductor_share_percentage,
        default_frequency: data.data.default_frequency,
        default_number_of_payments: data.data.default_number_of_payments,
      };
      return NextResponse.json({ success: true, data: mappedData }, { status: 200 });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Proxy] Error fetching config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Map frontend field names to backend field names
    const backendBody = {
      minimum_wage: body.minimum_wage,
      duration_to_receivable_hours: body.duration_to_late,
      receivable_due_date_days: body.receivable_due_date,
      driver_share_percentage: body.driver_share,
      conductor_share_percentage: body.conductor_share,
      default_frequency: body.default_frequency,
      default_number_of_payments: body.default_number_of_payments,
    };

    const url = `${BACKEND_URL}/api/v1/admin/bus-trip-revenue/config`;

    console.log('[API Proxy] PUT /api/admin/revenue/config ->', url);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!,
        }),
      },
      body: JSON.stringify(backendBody),
    });

    const data = await response.json();

    // Map backend response back to frontend format
    if (data.success && data.data) {
      const mappedData = {
        minimum_wage: data.data.minimum_wage,
        duration_to_late: data.data.duration_to_receivable_hours,
        receivable_due_date: data.data.receivable_due_date_days,
        driver_share: data.data.driver_share_percentage,
        conductor_share: data.data.conductor_share_percentage,
        default_frequency: data.data.default_frequency,
        default_number_of_payments: data.data.default_number_of_payments,
      };
      return NextResponse.json({ success: true, data: mappedData }, { status: 200 });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Proxy] Error updating config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
