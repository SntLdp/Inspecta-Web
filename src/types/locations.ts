
export interface LocationProductionLine {
  id: string;
  name: string;
  code: string;
  status: boolean;
  available: boolean;
}

export interface LocationArea {
  id: string;
  name: string;
  code: string;
  type: string | null;
  status: boolean;
  available: boolean;
  production_lines: LocationProductionLine[];
}

export interface LocationPlant {
  id: string;
  name: string;
  code: string;
  status: boolean;
  available: boolean;
  areas: LocationArea[];
}

export interface LocationHierarchyResponse {
  data: LocationPlant[];

  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface LocationAreaOption {
  id: string;
  name: string;
  plant_id: string;
  plant_name: string;
  status: boolean;
}


// =====================================================
// ADMINISTRACIÓN DE UBICACIONES
// =====================================================

export type LocationKind =
  | "plant"
  | "area"
  | "production-line";

export interface LocationDetails {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  status: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PlantDetails extends LocationDetails {
  address: string | null;
}

export interface AreaDetails extends LocationDetails {
  plant_id: string;
  type: string | null;
}

export interface ProductionLineDetails extends LocationDetails {
  area_id: string;
}

export interface LocationResponse<T> {
  data: T;
}

// =====================================================
// CREACIÓN
// =====================================================

export interface LocationCreateInput {
  name: string;
  code: string;
  description?: string | null;
}

export interface PlantCreateInput extends LocationCreateInput {
  address?: string | null;
}

export interface AreaCreateInput extends LocationCreateInput {
  type?: string | null;
}

export type ProductionLineCreateInput =
  LocationCreateInput;

// =====================================================
// ACTUALIZACIÓN
// =====================================================

export type PlantUpdateInput =
  Partial<PlantCreateInput>;

export type AreaUpdateInput =
  Partial<AreaCreateInput>;

export type ProductionLineUpdateInput =
  Partial<ProductionLineCreateInput>;

// =====================================================
// CONFIGURACIÓN DEL FORMULARIO
// =====================================================

export type LocationFormConfig =
  | {
    mode: "create";
    kind: "plant";
  }
  | {
    mode: "create";
    kind: "area" | "production-line";
    parentId: string;
    parentName: string;
  }
  | {
    mode: "edit";
    kind: LocationKind;
    id: string;
  };

// =====================================================
// ACTUALIZACIÓN DE ESTADO
// =====================================================

export interface LocationStatusInput {
  status: boolean;
}

export interface LocationStatusConfig {
  kind: LocationKind;
  id: string;
  name: string;
  status: boolean;
}