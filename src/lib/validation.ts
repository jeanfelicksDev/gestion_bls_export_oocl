/**
 * Validation Utilities
 * Centralized validation logic
 */

import { ApiError, ErrorCode } from "./types";

export class ValidationError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export const validators = {
  isNonEmptyString: (value: unknown): value is string => {
    return typeof value === "string" && value.trim().length > 0;
  },

  isValidBooking: (booking: unknown): booking is string => {
    return (
      typeof booking === "string" &&
      booking.trim().length > 0 &&
      booking.length <= 20
    );
  },

  isValidDate: (date: unknown): boolean => {
    if (!date) return true; // Optional field
    const d = new Date(date as string | number);
    return !isNaN(d.getTime());
  },

  isValidVoyageNumber: (numero: unknown): numero is string => {
    return typeof numero === "string" && numero.trim().length > 0;
  },

  isValidId: (id: unknown): id is string => {
    return typeof id === "string" && id.trim().length > 0;
  },

  isValidMoney: (value: unknown): value is string | number => {
    if (value === null || value === undefined) return true;
    const num = Number(value);
    return !isNaN(num) && num >= 0;
  },
};

export const validateBLInput = (body: unknown): void => {
  if (!body || typeof body !== "object") {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "Corps de requête invalide"
    );
  }

  const data = body as Record<string, unknown>;

  if (!validators.isValidBooking(data.booking)) {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "Numéro de booking invalide ou manquant"
    );
  }

  if (!validators.isValidId(data.voyageId)) {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "VoyageId invalide ou manquant"
    );
  }

  if (!validators.isValidDate(data.dateRetrait)) {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "Format de date invalide pour dateRetrait"
    );
  }

  if (!validators.isValidDate(data.dateRetour)) {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "Format de date invalide pour dateRetour"
    );
  }

  if (!validators.isValidMoney(data.montantFret)) {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "Montant fret invalide"
    );
  }

  if (!validators.isValidMoney(data.valeurFret)) {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "Valeur fret invalide"
    );
  }
};

export const validateVoyageInput = (body: unknown): void => {
  if (!body || typeof body !== "object") {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "Corps de requête invalide"
    );
  }

  const data = body as Record<string, unknown>;

  if (!validators.isValidId(data.navireId)) {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "NavireId invalide ou manquant"
    );
  }

  if (!validators.isValidVoyageNumber(data.numero)) {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "Numéro de voyage invalide ou manquant"
    );
  }

  if (!validators.isValidDate(data.eta)) {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "Format de date invalide pour ETA"
    );
  }

  if (!validators.isValidDate(data.etd)) {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "Format de date invalide pour ETD"
    );
  }

  if (!validators.isValidMoney(data.tauxDollar)) {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "Taux dollar invalide"
    );
  }
};

export const validateNavireInput = (body: unknown): void => {
  if (!body || typeof body !== "object") {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "Corps de requête invalide"
    );
  }

  const data = body as Record<string, unknown>;

  if (!validators.isNonEmptyString(data.nom)) {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "Nom du navire invalide ou manquant"
    );
  }
};

export const formatApiError = (
  error: unknown
): { error: string; code?: string; status: number } => {
  if (error instanceof ValidationError) {
    return {
      error: error.message,
      code: error.code,
      status: error.status,
    };
  }

  if (error instanceof Error) {
    // Prisma errors have a 'code' property
    const prismaError = error as Error & { code?: string };

    // Prisma unique constraint error
    if (prismaError.code === "P2002") {
      return {
        error: "Cette entrée existe déjà",
        code: ErrorCode.DUPLICATE_ENTRY,
        status: 409,
      };
    }

    // Prisma record not found
    if (prismaError.code === "P2025") {
      return {
        error: "Enregistrement non trouvé",
        code: ErrorCode.NOT_FOUND,
        status: 404,
      };
    }

    // Database error
    if (prismaError.code?.startsWith("P")) {
      return {
        error: "Erreur base de données",
        code: ErrorCode.DATABASE_ERROR,
        status: 500,
      };
    }
  }

  return {
    error: "Erreur interne du serveur",
    code: ErrorCode.INTERNAL_ERROR,
    status: 500,
  };
};
