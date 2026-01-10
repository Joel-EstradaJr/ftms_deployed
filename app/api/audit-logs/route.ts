import { NextRequest, NextResponse } from 'next/server';

// Agila Audit Microservice Backend URL
const AUDIT_API_URL = process.env.AUDIT_LOGS_API_URL || 'https://agilaaudit-production.up.railway.app';
const API_KEY = process.env.AUDIT_LOGS_API_KEY || 'FINANCE_DEFAULT_KEY';

export async function GET(request: NextRequest) {
  try {
    // Forward query parameters
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${AUDIT_API_URL}/api/audit-logs${searchParams ? `?${searchParams}` : ''}`;

    console.log('Proxying audit logs request to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Audit API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, message: `Audit API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying to audit logs API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to connect to audit logs service', error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${AUDIT_API_URL}/api/audit-logs`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Audit API POST error:', response.status, errorText);
      return NextResponse.json(
        { success: false, message: `Audit API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying to audit logs API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to connect to audit logs service', error: String(error) },
      { status: 500 }
    );
  }
}
