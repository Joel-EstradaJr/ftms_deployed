import { NextRequest, NextResponse } from 'next/server';

// Agila Audit Microservice Backend URL
const AUDIT_API_URL = process.env.AUDIT_LOGS_API_URL || 'https://agilaaudit-production.up.railway.app';
const API_KEY = process.env.AUDIT_LOGS_API_KEY || 'FINANCE_DEFAULT_KEY';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${AUDIT_API_URL}/api/generate-export-id`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Fallback: generate export ID locally if the endpoint doesn't exist
      const exportId = `EXP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      return NextResponse.json({ exportId });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating export ID:', error);
    // Fallback: generate export ID locally
    const exportId = `EXP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return NextResponse.json({ exportId });
  }
}
