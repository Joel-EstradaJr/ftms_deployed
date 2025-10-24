interface AuditLogParams {
  action: string;
  table_affected: 'RevenueRecord' | 'ExpenseRecord' | 'Revenue AND Expense' | 'Reimbursement';
  record_id: string;
  performed_by: string;
  details: string;
}

export async function logAuditToServer(params: AuditLogParams): Promise<void> {
  try {
    // TODO: Replace with ftms_backend API call when backend is ready
    // Example: const response = await fetch('http://localhost:4000/api/audit', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${getAuthToken()}`
    //   },
    //   body: JSON.stringify(params),
    // });
    
    console.warn('Audit logging temporarily disabled - waiting for ftms_backend API');
    
    // TEMPORARY: Commented out until ftms_backend /api/audit endpoint is created
    // const response = await fetch('/api/audit', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(params),
    // });
    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // }
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}