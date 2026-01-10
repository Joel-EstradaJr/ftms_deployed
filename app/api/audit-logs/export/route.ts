import { NextRequest, NextResponse } from 'next/server';

// Agila Audit Microservice Backend URL
const AUDIT_API_URL = process.env.AUDIT_LOGS_API_URL || 'https://agilaaudit-production.up.railway.app';
const API_KEY = process.env.AUDIT_LOGS_API_KEY || 'FINANCE_DEFAULT_KEY';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${AUDIT_API_URL}/api/audit-logs/export`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
    console.error('Error proxying to audit logs export API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to connect to audit logs service' },
      { status: 500 }
    );
  }
}
