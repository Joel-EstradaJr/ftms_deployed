import { NextRequest, NextResponse } from 'next/server';

// Agila Audit Microservice Backend URL
const AUDIT_API_URL = process.env.AUDIT_LOGS_API_URL || 'https://agilaaudit-production.up.railway.app';
const API_KEY = process.env.AUDIT_LOGS_API_KEY || 'FINANCE_DEFAULT_KEY';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = `${AUDIT_API_URL}/api/audit-logs/${id}`;

    const response = await fetch(url, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: `Audit API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying to audit logs API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to connect to audit logs service' },
      { status: 500 }
    );
  }
}
