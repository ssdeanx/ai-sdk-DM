import { NextResponse } from "next/server";
import { seedDefaultModels } from "@/lib/services/model-service";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * Seed default models from the model registry
 * @route POST /api/models/seed
 */
export async function POST(request: Request) {
  try {
    // Get provider from request body
    const body = await request.json();
    const { provider } = body;
    
    // Seed models
    const count = await seedDefaultModels(provider);
    
    return NextResponse.json({
      success: true,
      message: `Seeded ${count} models${provider ? ` for provider ${provider}` : ''}`,
      count
    });
  } catch (error) {
    return handleApiError(error);
  }
}
