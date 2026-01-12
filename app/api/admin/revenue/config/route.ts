/**
 * Trip Revenue Configuration API Route
 * 
 * Handles GET and PUT requests for trip revenue configuration settings.
 * 
 * GET /api/admin/revenue/config
 * - Retrieves the current configuration from the database
 * 
 * PUT /api/admin/revenue/config
 * - Updates the configuration in the database
 * 
 * Configuration Fields (stored in single row):
 * - minimum_wage: Minimum wage per employee (decimal)
 * - duration_to_late: Hours until remittance is considered late (integer)
 * - receivable_due_date: Days until receivable is due (integer)
 * - driver_share: Default percentage share for driver (0-100)
 * - conductor_share: Default percentage share for conductor (0-100)
 * - default_frequency: Default installment frequency ('DAILY' | 'WEEKLY' | 'MONTHLY')
 * - default_number_of_payments: Default number of installments (1-12)
 */

import { NextRequest, NextResponse } from 'next/server';

// Default configuration values
const DEFAULT_CONFIG = {
  minimum_wage: 600,
  duration_to_late: 168, // 7 days in hours
  receivable_due_date: 30, // 30 days
  driver_share: 50,
  conductor_share: 50,
  default_frequency: 'WEEKLY' as const,
  default_number_of_payments: 3,
};

// Type for configuration data
interface ConfigData {
  minimum_wage: number;
  duration_to_late: number;
  receivable_due_date: number;
  driver_share: number;
  conductor_share: number;
  default_frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  default_number_of_payments: number;
}

/**
 * GET /api/admin/revenue/config
 * 
 * Retrieves the current trip revenue configuration.
 * Returns default values if no configuration exists in the database.
 */
export async function GET() {
  try {
    // TODO: Replace with actual database query
    // Example Prisma query:
    // const config = await prisma.trip_revenue_config.findFirst({
    //   orderBy: { id: 'desc' }
    // });
    
    // For now, return default config (mock implementation)
    // In production, this should query the database
    const config = DEFAULT_CONFIG;

    return NextResponse.json({
      success: true,
      data: config,
      message: 'Configuration retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching trip revenue config:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/revenue/config
 * 
 * Updates the trip revenue configuration.
 * Validates that driver_share + conductor_share = 100
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'minimum_wage',
      'duration_to_late',
      'receivable_due_date',
      'driver_share',
      'conductor_share',
      'default_frequency',
      'default_number_of_payments'
    ];
    
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required field: ${field}`
          },
          { status: 400 }
        );
      }
    }

    // Validate data types and ranges
    const config: ConfigData = {
      minimum_wage: Number(body.minimum_wage),
      duration_to_late: Number(body.duration_to_late),
      receivable_due_date: Number(body.receivable_due_date),
      driver_share: Number(body.driver_share),
      conductor_share: Number(body.conductor_share),
      default_frequency: body.default_frequency,
      default_number_of_payments: Number(body.default_number_of_payments)
    };

    // Validation rules
    if (config.minimum_wage <= 0) {
      return NextResponse.json(
        { success: false, error: 'Minimum wage must be greater than 0' },
        { status: 400 }
      );
    }

    if (config.duration_to_late <= 0) {
      return NextResponse.json(
        { success: false, error: 'Duration to late must be greater than 0' },
        { status: 400 }
      );
    }

    if (config.receivable_due_date <= 0 || config.receivable_due_date > 365) {
      return NextResponse.json(
        { success: false, error: 'Receivable due date must be between 1 and 365 days' },
        { status: 400 }
      );
    }

    if (config.driver_share < 0 || config.driver_share > 100) {
      return NextResponse.json(
        { success: false, error: 'Driver share must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (config.conductor_share < 0 || config.conductor_share > 100) {
      return NextResponse.json(
        { success: false, error: 'Conductor share must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (config.driver_share + config.conductor_share !== 100) {
      return NextResponse.json(
        { success: false, error: 'Driver and conductor shares must add up to 100%' },
        { status: 400 }
      );
    }

    if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(config.default_frequency)) {
      return NextResponse.json(
        { success: false, error: 'Invalid frequency. Must be DAILY, WEEKLY, or MONTHLY' },
        { status: 400 }
      );
    }

    if (config.default_number_of_payments < 1 || config.default_number_of_payments > 12) {
      return NextResponse.json(
        { success: false, error: 'Number of payments must be between 1 and 12' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database update
    // Example Prisma upsert:
    // const updatedConfig = await prisma.trip_revenue_config.upsert({
    //   where: { id: 1 }, // Single row config table
    //   update: {
    //     minimum_wage: config.minimum_wage,
    //     duration_to_late: config.duration_to_late,
    //     receivable_due_date: config.receivable_due_date,
    //     driver_share: config.driver_share,
    //     conductor_share: config.conductor_share,
    //     default_frequency: config.default_frequency,
    //     default_number_of_payments: config.default_number_of_payments,
    //     updated_at: new Date(),
    //     updated_by: 'current_user_id'
    //   },
    //   create: {
    //     ...config,
    //     created_by: 'current_user_id'
    //   }
    // });

    // For now, return the config as-is (mock implementation)
    console.log('Trip Revenue Config Updated:', config);

    return NextResponse.json({
      success: true,
      data: config,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating trip revenue config:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
