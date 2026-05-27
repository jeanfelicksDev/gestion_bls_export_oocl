/**
 * API Response Helpers
 * Standardized API response formatting
 */

import { NextResponse } from "next/server";
import { ApiResponse, ApiError } from "./types";
import { logger } from "./logger";

export const successResponse = <T>(
  data: T,
  message: string = "Succès"
): NextResponse<ApiResponse<T>> => {
  return NextResponse.json({
    data,
    message,
  });
};

export const errorResponse = (
  error: string,
  status: number = 500,
  code?: string
): NextResponse<ApiError> => {
  return NextResponse.json(
    {
      error,
      code,
      status,
    },
    { status }
  );
};

export const handleApiError = (
  context: string,
  error: unknown,
  defaultStatus: number = 500
) => {
  if (error instanceof Error) {
    // Prisma errors
    if ((error as any).code === "P2002") {
      logger.warn(context, "Duplicate entry error", (error as any).meta);
      return errorResponse(
        "Cette entrée existe déjà",
        409,
        "DUPLICATE_ENTRY"
      );
    }

    if ((error as any).code === "P2025") {
      logger.warn(context, "Record not found", (error as any).meta);
      return errorResponse(
        "Enregistrement non trouvé",
        404,
        "NOT_FOUND"
      );
    }

    if ((error as any).code?.startsWith("P")) {
      logger.error(context, "Database error", error, (error as any).meta);
      return errorResponse(
        "Erreur base de données",
        500,
        "DATABASE_ERROR"
      );
    }

    logger.error(context, "Unexpected error", error);
  }

  return errorResponse("Erreur interne du serveur", defaultStatus);
};
