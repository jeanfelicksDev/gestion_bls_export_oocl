/**
 * Global Type Definitions
 * Central place for all API types and database models
 */

// ============= API Response Types =============
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  error: string;
  code?: string;
  status: number;
}

// ============= BL (Bill of Lading) Types =============
export interface IBLInput {
  booking: string;
  voyageId?: string | null;
  pod?: string | null;
  shipper?: string | null;
  statut?: string | null;
  typeConnaissement?: string | null;
  tender?: string | null;
  freighting?: string | null;
  valeurFret?: string | null;
  montantFret?: string | null;
  deviseFret?: string | null;
  dateRetrait?: string | Date | null;
  statutFret?: string | null;
  numTimbre?: string | null;
  statutCorrection?: string | null;
  commentaire?: string | null;
  raisonRetour?: string | null;
  dateRetour?: string | Date | null;
  numFactureRetour?: string | null;
  isORG?: boolean;
  isNNG?: boolean;
  isSWB?: boolean;
  isScanne?: boolean;
  isNoteTraitee?: boolean;
  urlORG?: string | null;
  urlNNG?: string | null;
  urlSWB?: string | null;
  urlScanne?: string | null;
  autresCharges?: IAutreChargeInput[];
}

export interface IBL extends IBLInput {
  id: string;
  booking: string;
  createdAt: Date;
  updatedAt: Date;
  autresCharges: IAutreCharge[];
}

// ============= Autres Charges (Additional Charges) Types =============
export interface IAutreChargeInput {
  type: string;
  montant: string | number;
  observation?: string | null;
}

export interface IAutreCharge extends IAutreChargeInput {
  id: string;
  blId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============= Voyage Types =============
export interface IVoyageInput {
  navireId: string;
  numero: string;
  eta?: string | Date | null;
  etd?: string | Date | null;
  tauxDollar?: string | number | null;
  etdConfirmed?: boolean;
}

export interface IVoyage extends IVoyageInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  bls?: IBL[];
  navire?: INavireWithCoque | null;
}

export interface IVoyageWithBLs extends IVoyage {
  bls: IBL[];
  navire: INavireWithCoque | null;
}

// ============= Navire (Ship) Types =============
export interface INavireInput {
  nom: string;
  coqueId?: string | null;
}

export interface INavire extends INavireInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  voyages?: IVoyage[];
  coque?: ICoque | null;
}

/** Navire avec relation coque incluse (retourné par l'API avec include) */
export interface INavireWithCoque extends INavire {
  coque: ICoque | null;
}

// ============= Coque (Hull) Types =============
export interface ICoqueInput {
  nom: string;
}

export interface ICoque extends ICoqueInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  navires?: INavire[];
}

// ============= Type Charge Types =============
export interface ITypeChargeInput {
  nom: string;
}

export interface ITypeCharge extends ITypeChargeInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============= Raison Retour (Return Reason) Types =============
export interface IRaisonRetourInput {
  nom: string;
}

export interface IRaisonRetour extends IRaisonRetourInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============= Error Codes =============
export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  DATABASE_ERROR = "DATABASE_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

// ============= Pagination =============
export interface IPaginationParams {
  skip?: number;
  take?: number;
}

export interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}
