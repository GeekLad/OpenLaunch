import { NextRequest, NextResponse } from 'next/server';
import { validateLaunchParams } from '@/lib/validation/feeValidation';

/**
 * API Route: POST /api/tokens/validate
 *
 * Server-side validation of launch parameters before on-chain submission.
 * Uses Meteora SDK constructors to enforce SDK-specific constraints.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = validateLaunchParams(body);

    if (result.valid) {
      return NextResponse.json({ valid: true });
    } else {
      return NextResponse.json(
        { valid: false, errors: result.errors },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API] Validation error:', error);
    return NextResponse.json(
      {
        valid: false,
        error: 'Internal validation error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
