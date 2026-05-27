/**
 * API Route Template with Full Error Handling
 * Copy this template for new API routes
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { validators, ValidationError } from "@/lib/validation";
// import { requireAuth, checkRateLimit } from "@/lib/auth"; // Uncomment to add auth

const CONTEXT = "API_EXAMPLE";

/**
 * GET /api/example
 * Get all items with pagination
 */
export async function GET(request: NextRequest) {
  try {
    // const ip = request.headers.get("x-forwarded-for") || "unknown";
    // if (!checkRateLimit(ip, 100, 60000)) {
    //   return NextResponse.json(
    //     { error: "Trop de requêtes. Réessayez plus tard." },
    //     { status: 429 }
    //   );
    // }

    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get("skip") || "0");
    const take = parseInt(searchParams.get("take") || "50");

    logger.debug(CONTEXT, "GET request", { skip, take });

    // Example: Get items with pagination
    // const [items, total] = await Promise.all([
    //   prisma.exampleModel.findMany({
    //     skip,
    //     take,
    //     orderBy: { createdAt: "desc" },
    //   }),
    //   prisma.exampleModel.count(),
    // ]);

    // logger.info(CONTEXT, `Retrieved ${items.length} items`);

    // return successResponse({
    //   data: items,
    //   total,
    //   skip,
    //   take,
    //   hasMore: skip + take < total,
    // });
  } catch (error) {
    logger.error(CONTEXT, "GET error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}

/**
 * POST /api/example
 * Create a new item
 */
export async function POST(req: NextRequest) {
  try {
    // // Check authentication
    // const authError = await requireAuth(req);
    // if (authError) return authError;

    const body: unknown = await req.json();

    // Validate input
    // if (!body || typeof body !== "object") {
    //   throw new ValidationError(
    //     "VALIDATION_ERROR" as any,
    //     "Corps de requête invalide"
    //   );
    // }

    // const data = body as Record<string, unknown>;

    logger.debug(CONTEXT, "POST creating item", body);

    // const item = await prisma.exampleModel.create({
    //   data: {
    //     name: String(data.name),
    //     // ... other fields
    //   },
    // });

    // logger.info(CONTEXT, "Item created", { itemId: item.id });
    // return successResponse(item, "Item créé avec succès");
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn(CONTEXT, "Validation error", error as Error);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    logger.error(CONTEXT, "POST error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}

/**
 * PATCH /api/example/[id]
 * Update an item
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // const authError = await requireAuth(req);
    // if (authError) return authError;

    const { id } = await params;

    if (!validators.isValidId(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const body: unknown = await req.json();
    logger.debug(CONTEXT, "PATCH updating item", { id, body });

    // Update logic here

    // return successResponse(item, "Item mis à jour avec succès");
  } catch (error) {
    logger.error(CONTEXT, "PATCH error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}

/**
 * DELETE /api/example/[id]
 * Delete an item
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // const authError = await requireAuth(req);
    // if (authError) return authError;

    const { id } = await params;

    if (!validators.isValidId(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    logger.debug(CONTEXT, "DELETE item", { id });

    // Delete logic here

    // return successResponse({ success: true }, "Item supprimé avec succès");
  } catch (error) {
    logger.error(CONTEXT, "DELETE error", error as Error);
    return handleApiError(CONTEXT, error);
  }
}
