
import { apiRequest } from "../api/client";

import type {
  LocationHierarchyResponse,
  LocationPlant,
  LocationAreaOption,
  LocationResponse,
  PlantDetails,
  AreaDetails,
  ProductionLineDetails,
  PlantCreateInput,
  AreaCreateInput,
  ProductionLineCreateInput,
  PlantUpdateInput,
  AreaUpdateInput,
  ProductionLineUpdateInput,
  LocationStatusInput,
} from "../types/locations";

// =====================================================
// CONSULTA JERÁRQUICA
// =====================================================

export interface GetLocationHierarchyParams {
  page?: number;
  perPage?: number;
  plantId?: string;
  areaId?: string;
}

export function getLocationHierarchy(
  filters: GetLocationHierarchyParams = {},
  signal?: AbortSignal
): Promise<LocationHierarchyResponse> {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    per_page: String(filters.perPage ?? 15),
  });

  if (filters.plantId) {
    params.set("plant_id", filters.plantId);
  }

  if (filters.areaId) {
    params.set("area_id", filters.areaId);
  }

  return apiRequest<LocationHierarchyResponse>(
    `/locations/hierarchy?${params.toString()}`,
    {
      method: "GET",
      signal,
    }
  );
}

export async function getAllLocationPlants(
  signal?: AbortSignal
): Promise<LocationPlant[]> {
  const plants: LocationPlant[] = [];

  let page = 1;
  let lastPage = 1;

  do {
    const response = await getLocationHierarchy(
      {
        page,
        perPage: 15,
      },
      signal
    );

    plants.push(...response.data);

    lastPage = response.meta.last_page;
    page += 1;
  } while (page <= lastPage);

  return plants;
}

export async function getLocationAreas(
  signal?: AbortSignal
): Promise<LocationAreaOption[]> {
  const plants = await getAllLocationPlants(signal);

  return plants
    .flatMap((plant) =>
      plant.areas.map((area) => ({
        id: area.id,
        name: area.name,
        plant_id: plant.id,
        plant_name: plant.name,
        status: area.status,
      }))
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "es") ||
        a.plant_name.localeCompare(b.plant_name, "es")
    );
}

// =====================================================
// ADMINISTRACIÓN DE PLANTAS
// =====================================================

export function getLocationPlant(
  plantId: string,
  signal?: AbortSignal
): Promise<LocationResponse<PlantDetails>> {
  return apiRequest<LocationResponse<PlantDetails>>(
    `/plants/${encodeURIComponent(plantId)}`,
    {
      method: "GET",
      signal,
    }
  );
}

export function createLocationPlant(
  input: PlantCreateInput
): Promise<LocationResponse<PlantDetails>> {
  return apiRequest<LocationResponse<PlantDetails>>(
    "/plants",
    {
      method: "POST",
      body: input,
    }
  );
}

export function updateLocationPlant(
  plantId: string,
  input: PlantUpdateInput
): Promise<LocationResponse<PlantDetails>> {
  return apiRequest<LocationResponse<PlantDetails>>(
    `/plants/${encodeURIComponent(plantId)}`,
    {
      method: "PATCH",
      body: input,
    }
  );
}

// =====================================================
// ADMINISTRACIÓN DE ÁREAS
// =====================================================

export function getLocationArea(
  areaId: string,
  signal?: AbortSignal
): Promise<LocationResponse<AreaDetails>> {
  return apiRequest<LocationResponse<AreaDetails>>(
    `/areas/${encodeURIComponent(areaId)}`,
    {
      method: "GET",
      signal,
    }
  );
}

export function createLocationArea(
  plantId: string,
  input: AreaCreateInput
): Promise<LocationResponse<AreaDetails>> {
  return apiRequest<LocationResponse<AreaDetails>>(
    `/plants/${encodeURIComponent(plantId)}/areas`,
    {
      method: "POST",
      body: input,
    }
  );
}

export function updateLocationArea(
  areaId: string,
  input: AreaUpdateInput
): Promise<LocationResponse<AreaDetails>> {
  return apiRequest<LocationResponse<AreaDetails>>(
    `/areas/${encodeURIComponent(areaId)}`,
    {
      method: "PATCH",
      body: input,
    }
  );
}

// =====================================================
// ADMINISTRACIÓN DE LÍNEAS DE PRODUCCIÓN
// =====================================================

export function getLocationProductionLine(
  lineId: string,
  signal?: AbortSignal
): Promise<LocationResponse<ProductionLineDetails>> {
  return apiRequest<
    LocationResponse<ProductionLineDetails>
  >(
    `/production-lines/${encodeURIComponent(lineId)}`,
    {
      method: "GET",
      signal,
    }
  );
}

export function createLocationProductionLine(
  areaId: string,
  input: ProductionLineCreateInput
): Promise<LocationResponse<ProductionLineDetails>> {
  return apiRequest<
    LocationResponse<ProductionLineDetails>
  >(
    `/areas/${encodeURIComponent(areaId)}/lines`,
    {
      method: "POST",
      body: input,
    }
  );
}

export function updateLocationProductionLine(
  lineId: string,
  input: ProductionLineUpdateInput
): Promise<LocationResponse<ProductionLineDetails>> {
  return apiRequest<
    LocationResponse<ProductionLineDetails>
  >(
    `/production-lines/${encodeURIComponent(lineId)}`,
    {
      method: "PATCH",
      body: input,
    }
  );
}

// =====================================================
// ACTIVACIÓN Y DESACTIVACIÓN DE UBICACIONES
// =====================================================

export function updateLocationPlantStatus(
  plantId: string,
  input: LocationStatusInput
): Promise<LocationResponse<PlantDetails>> {
  return apiRequest<LocationResponse<PlantDetails>>(
    `/plants/${encodeURIComponent(plantId)}/status`,
    {
      method: "PATCH",
      body: input,
    }
  );
}

export function updateLocationAreaStatus(
  areaId: string,
  input: LocationStatusInput
): Promise<LocationResponse<AreaDetails>> {
  return apiRequest<LocationResponse<AreaDetails>>(
    `/areas/${encodeURIComponent(areaId)}/status`,
    {
      method: "PATCH",
      body: input,
    }
  );
}

export function updateLocationProductionLineStatus(
  lineId: string,
  input: LocationStatusInput
): Promise<LocationResponse<ProductionLineDetails>> {
  return apiRequest<LocationResponse<ProductionLineDetails>>(
    `/production-lines/${encodeURIComponent(lineId)}/status`,
    {
      method: "PATCH",
      body: input,
    }
  );
}