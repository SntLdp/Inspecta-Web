import { useState } from "react";

import {
  Alert,
  Box,
  Chip,
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  Business,
  Factory,
  Layers,
  LocationOn,
  Lock,
  Public,
  Search,
} from "@mui/icons-material";

import type {
  ProfileMembership,
} from "../../types/profile.types";

/* =====================================================
   TIPOS
   ===================================================== */

interface ProfileAssignedLocationsProps {
  locations: ProfileMembership["locations"];
}

type AvailabilityFilter =
  | "all"
  | "available"
  | "unavailable";

interface LocationStatusProps {
  status: boolean;
  available: boolean;
}

interface SummaryCardProps {
  label: string;
  value: number;
  description: string;
}

interface LocationItemProps {
  name: string;
  code: string;
  status: boolean;
  available: boolean;
  type: "plant" | "area";
  plantName?: string;
}

/* =====================================================
   NORMALIZAR BÚSQUEDA
   ===================================================== */

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* =====================================================
   FILTRAR DISPONIBILIDAD
   ===================================================== */

function matchesAvailability(
  available: boolean,
  filter: AvailabilityFilter
): boolean {
  switch (filter) {
    case "available":
      return available;

    case "unavailable":
      return !available;

    default:
      return true;
  }
}

/* =====================================================
   TARJETA DE RESUMEN
   ===================================================== */

function SummaryCard({
  label,
  value,
  description,
}: SummaryCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: "100%",
        bgcolor: "#F8FAFC",
        borderColor: "#DCE6EE",
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
        }}
      >
        {label}
      </Typography>

      <Typography
        variant="h4"
        sx={{
          color: "#16324F",
          fontWeight: 700,
          my: 1,
        }}
      >
        {value}
      </Typography>

      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
        }}
      >
        {description}
      </Typography>
    </Paper>
  );
}

/* =====================================================
   ESTADO Y DISPONIBILIDAD
   ===================================================== */

function LocationStatus({
  status,
  available,
}: LocationStatusProps) {
  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        flexWrap: "wrap",
      }}
    >
      <Chip
        size="small"
        variant="outlined"
        label={status ? "Activa" : "Inactiva"}
        color={status ? "success" : "default"}
      />

      <Chip
        size="small"
        variant="outlined"
        label={
          available
            ? "Disponible"
            : "No disponible"
        }
        color={
          available
            ? "success"
            : "warning"
        }
      />
    </Stack>
  );
}

/* =====================================================
   ELEMENTO DE UBICACIÓN
   ===================================================== */

function LocationItem({
  name,
  code,
  status,
  available,
  type,
  plantName,
}: LocationItemProps) {
  return (
    <Stack
      direction={{
        xs: "column",
        sm: "row",
      }}
      spacing={2}
      sx={{
        p: 2,
        alignItems: {
          xs: "flex-start",
          sm: "center",
        },
      }}
    >
      {/* ICONO */}

      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          bgcolor: available
            ? "#E8F0F6"
            : "#F1F3F5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {type === "plant" ? (
          <Factory
            sx={{
              color: available
                ? "#16324F"
                : "text.disabled",
            }}
          />
        ) : (
          <Layers
            sx={{
              color: available
                ? "#16324F"
                : "text.disabled",
            }}
          />
        )}
      </Box>

      {/* INFORMACIÓN */}

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: available
              ? "#16324F"
              : "text.secondary",
            overflowWrap: "anywhere",
          }}
        >
          {name}
        </Typography>

        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block",
            overflowWrap: "anywhere",
          }}
        >
          Código: {code}
        </Typography>

        {plantName && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: "block",
              overflowWrap: "anywhere",
            }}
          >
            Planta: {plantName}
          </Typography>
        )}

        {/* UBICACIÓN INACTIVA */}

        {!status && (
          <Typography
            variant="caption"
            sx={{
              color: "warning.main",
              display: "block",
              mt: 0.5,
            }}
          >
            Esta ubicación se encuentra inactiva.
          </Typography>
        )}

        {/* ÁREA ACTIVA CON PLANTA INACTIVA */}

        {type === "area" &&
          status &&
          !available && (
            <Typography
              variant="caption"
              sx={{
                color: "warning.main",
                display: "block",
                mt: 0.5,
              }}
            >
              El área está activa, pero su planta
              no se encuentra disponible.
            </Typography>
          )}

        {type === "plant" &&
          status &&
          !available && (
            <Typography
              variant="caption"
              sx={{
                color: "warning.main",
                display: "block",
                mt: 0.5,
              }}
            >
              La planta no se encuentra disponible.
            </Typography>
          )}
      </Box>

      {/* ESTADOS */}

      <LocationStatus
        status={status}
        available={available}
      />
    </Stack>
  );
}

/* =====================================================
   COMPONENTE PRINCIPAL
   ===================================================== */

export default function ProfileAssignedLocations({
  locations,
}: ProfileAssignedLocationsProps) {
  const [search, setSearch] =
    useState("");

  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("all");

  /* ===================================================
     VALIDAR ALCANCE
     =================================================== */

  const canView =
    locations.can_view;

  const viewAll =
    canView && locations.view_all;

  const plants =
    canView ? locations.plants : [];

  const areas =
    canView ? locations.areas : [];

  /* ===================================================
     RESUMEN DE ASIGNACIONES
     =================================================== */

  const availablePlants =
    plants.filter(
      (plant) => plant.available
    ).length;

  const availableAreas =
    areas.filter(
      (area) => area.available
    ).length;

  const unavailableCount =
    plants.length -
    availablePlants +
    areas.length -
    availableAreas;

  const hasAssignments =
    plants.length > 0 ||
    areas.length > 0;

  /* ===================================================
     FILTRAR PLANTAS
     =================================================== */

  const normalizedSearch =
    normalizeSearch(search);

  const filteredPlants =
    plants.filter((plant) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeSearch(plant.name)
          .includes(normalizedSearch) ||
        normalizeSearch(plant.code)
          .includes(normalizedSearch);

      return (
        matchesSearch &&
        matchesAvailability(
          plant.available,
          availabilityFilter
        )
      );
    });

  /* ===================================================
     FILTRAR ÁREAS
     =================================================== */

  const filteredAreas =
    areas.filter((area) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeSearch(area.name)
          .includes(normalizedSearch) ||
        normalizeSearch(area.code)
          .includes(normalizedSearch) ||
        normalizeSearch(area.plant_name)
          .includes(normalizedSearch);

      return (
        matchesSearch &&
        matchesAvailability(
          area.available,
          availabilityFilter
        )
      );
    });

  /* ===================================================
     AGRUPAR ÁREAS POR PLANTA
     =================================================== */

  const areaGroups = new Map<
    string,
    {
      plantId: string;
      plantName: string;
      areas: typeof filteredAreas;
    }
  >();

  for (const area of filteredAreas) {
    const existingGroup =
      areaGroups.get(area.plant_id);

    if (existingGroup) {
      existingGroup.areas.push(area);
    } else {
      areaGroups.set(area.plant_id, {
        plantId: area.plant_id,
        plantName: area.plant_name,
        areas: [area],
      });
    }
  }

  const groupedAreas =
    Array.from(areaGroups.values());

  const hasFilters =
    Boolean(normalizedSearch) ||
    availabilityFilter !== "all";

  /* ===================================================
     USUARIO SIN PERMISO DE CONSULTA
     =================================================== */

  if (!canView) {
    return (
      <Stack spacing={3}>
        <Box>
          <Typography
            variant="h6"
            sx={{
              color: "#16324F",
              fontWeight: 600,
            }}
          >
            Ubicaciones asignadas
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "#81909D",
              mt: 0.5,
            }}
          >
            Consulta el alcance de ubicaciones
            asociado a tu membresía.
          </Typography>
        </Box>

        <Divider />

        <Paper
          variant="outlined"
          sx={{
            p: 4,
            borderColor: "#DCE6EE",
            textAlign: "center",
          }}
        >
          <Stack
            spacing={2}
            sx={{
              alignItems: "center",
            }}
          >
            <Lock
              sx={{
                fontSize: 48,
                color: "text.disabled",
              }}
            />

            <Typography
              variant="h6"
              sx={{
                color: "#16324F",
                fontWeight: 600,
              }}
            >
              Consulta de ubicaciones restringida
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                maxWidth: 500,
              }}
            >
              Tu cuenta no dispone del permiso
              necesario para consultar las plantas
              y áreas de esta organización.
            </Typography>

            <Chip
              label="Sin permiso de consulta"
              variant="outlined"
              icon={<Lock />}
            />
          </Stack>
        </Paper>

        <Alert severity="info">
          Si necesitas consultar ubicaciones,
          contacta con un administrador autorizado
          de tu organización.
        </Alert>
      </Stack>
    );
  }

  /* ===================================================
     INTERFAZ PRINCIPAL
     =================================================== */

  return (
    <Stack spacing={3}>
      {/* ENCABEZADO */}

      <Box>
        <Typography
          variant="h6"
          sx={{
            color: "#16324F",
            fontWeight: 600,
          }}
        >
          Ubicaciones asignadas
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "#81909D",
            mt: 0.5,
          }}
        >
          Consulta las plantas y áreas asociadas
          a tu membresía organizacional.
        </Typography>
      </Box>

      <Divider />

      {/* ALCANCE ORGANIZACIONAL */}

      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderColor: "#DCE6EE",
          bgcolor: "#F8FAFC",
        }}
      >
        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={2}
          sx={{
            alignItems: {
              xs: "flex-start",
              sm: "center",
            },
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: "#E8F0F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {viewAll ? (
              <Public
                sx={{
                  fontSize: 30,
                  color: "#16324F",
                }}
              />
            ) : (
              <LocationOn
                sx={{
                  fontSize: 30,
                  color: "#16324F",
                }}
              />
            )}
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                color: "#16324F",
                fontWeight: 600,
              }}
            >
              {viewAll
                ? "Alcance global de ubicaciones"
                : "Alcance por asignaciones"}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mt: 0.5,
              }}
            >
              {viewAll
                ? "Puedes consultar ubicaciones de toda la organización, conforme a las reglas de autorización aplicables."
                : "Tu alcance está determinado por las plantas y áreas asignadas y las reglas de acceso correspondientes."}
            </Typography>
          </Box>

          <Chip
            label={
              viewAll
                ? "Alcance global"
                : "Alcance restringido"
            }
            color={
              viewAll
                ? "primary"
                : "default"
            }
            variant="outlined"
            size="small"
          />
        </Stack>
      </Paper>

      {/* RESUMEN DE UBICACIONES */}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryCard
            label="Plantas asignadas"
            value={plants.length}
            description={
              `${availablePlants} disponibles`
            }
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryCard
            label="Áreas asignadas"
            value={areas.length}
            description={
              `${availableAreas} disponibles`
            }
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryCard
            label="No disponibles"
            value={unavailableCount}
            description="Asignaciones sin disponibilidad"
          />
        </Grid>
      </Grid>

      {/* INFORMACIÓN SOBRE ALCANCE GLOBAL */}

      {viewAll && (
        <Alert severity="info">
          Tu cuenta dispone de alcance global.
          Las ubicaciones mostradas a continuación
          corresponden únicamente a tus asignaciones
          directas y no representan el catálogo
          completo de la organización.
        </Alert>
      )}

      {/* SIN ASIGNACIONES */}

      {!hasAssignments && (
        <Alert
          severity={
            viewAll ? "info" : "warning"
          }
        >
          {viewAll
            ? "No tienes ubicaciones asignadas directamente. Esto no limita tu alcance global de consulta."
            : "No tienes plantas ni áreas asignadas directamente. Consulta con un administrador si necesitas acceso a ubicaciones."}
        </Alert>
      )}

      {/* FILTROS */}

      {hasAssignments && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <TextField
              fullWidth
              size="small"
              label="Buscar ubicación"
              placeholder="Nombre, código o planta"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Disponibilidad"
              value={availabilityFilter}
              onChange={(event) =>
                setAvailabilityFilter(
                  event.target.value as AvailabilityFilter
                )
              }
            >
              <MenuItem value="all">
                Todas
              </MenuItem>

              <MenuItem value="available">
                Disponibles
              </MenuItem>

              <MenuItem value="unavailable">
                No disponibles
              </MenuItem>
            </TextField>
          </Grid>
        </Grid>
      )}

      {/* PLANTAS ASIGNADAS */}

      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
          }}
        >
          <Factory
            sx={{
              color: "#16324F",
            }}
          />

          <Typography
            variant="subtitle1"
            sx={{
              color: "#16324F",
              fontWeight: 600,
              flex: 1,
            }}
          >
            Plantas asignadas directamente
          </Typography>

          <Chip
            size="small"
            variant="outlined"
            label={
              `${filteredPlants.length} / ${plants.length}`
            }
          />
        </Stack>

        {plants.length === 0 ? (
          <Alert severity="info">
            No tienes plantas asignadas directamente.
          </Alert>
        ) : filteredPlants.length === 0 ? (
          <Alert severity="info">
            No se encontraron plantas que
            coincidan con los filtros.
          </Alert>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              borderColor: "#DCE6EE",
              overflow: "hidden",
            }}
          >
            {filteredPlants.map(
              (plant, index) => (
                <Box key={plant.id}>
                  {index > 0 && <Divider />}

                  <LocationItem
                    type="plant"
                    name={plant.name}
                    code={plant.code}
                    status={plant.status}
                    available={plant.available}
                  />
                </Box>
              )
            )}
          </Paper>
        )}
      </Stack>

      <Divider />

      {/* ÁREAS ASIGNADAS */}

      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
          }}
        >
          <Layers
            sx={{
              color: "#16324F",
            }}
          />

          <Typography
            variant="subtitle1"
            sx={{
              color: "#16324F",
              fontWeight: 600,
              flex: 1,
            }}
          >
            Áreas asignadas directamente
          </Typography>

          <Chip
            size="small"
            variant="outlined"
            label={
              `${filteredAreas.length} / ${areas.length}`
            }
          />
        </Stack>

        {areas.length === 0 ? (
          <Alert severity="info">
            No tienes áreas asignadas directamente.
          </Alert>
        ) : filteredAreas.length === 0 ? (
          <Alert severity="info">
            No se encontraron áreas que
            coincidan con los filtros.
          </Alert>
        ) : (
          groupedAreas.map((group) => (
            <Paper
              key={group.plantId}
              variant="outlined"
              sx={{
                borderColor: "#DCE6EE",
                overflow: "hidden",
              }}
            >
              {/* PLANTA DE LAS ÁREAS */}

              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  p: 2,
                  bgcolor: "#F8FAFC",
                  alignItems: "center",
                }}
              >
                <Business
                  sx={{
                    color: "#16324F",
                  }}
                />

                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    Planta
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      color: "#16324F",
                      fontWeight: 600,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {group.plantName}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    `${group.areas.length} ${
                      group.areas.length === 1
                        ? "área"
                        : "áreas"
                    }`
                  }
                />
              </Stack>

              <Divider />

              {/* ÁREAS DE LA PLANTA */}

              {group.areas.map(
                (area, index) => (
                  <Box key={area.id}>
                    {index > 0 && <Divider />}

                    <LocationItem
                      type="area"
                      name={area.name}
                      code={area.code}
                      status={area.status}
                      available={area.available}
                      plantName={area.plant_name}
                    />
                  </Box>
                )
              )}
            </Paper>
          ))
        )}
      </Stack>

      {/* RESULTADOS DE FILTRADO */}

      {hasFilters && hasAssignments && (
        <Typography
          variant="caption"
          aria-live="polite"
          sx={{
            color: "text.secondary",
          }}
        >
          Mostrando{" "}
          {filteredPlants.length +
            filteredAreas.length}{" "}
          de {plants.length + areas.length}{" "}
          asignaciones directas.
        </Typography>
      )}

      <Divider />

      {/* ACLARACIÓN DE ALCANCE */}

      <Alert severity="info">
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
          }}
        >
          Acerca de tus asignaciones
        </Typography>

        <Typography
          variant="body2"
          sx={{ mt: 0.5 }}
        >
          Las plantas y áreas mostradas corresponden
          a asignaciones directas. Una planta
          asignada puede proporcionar acceso a sus
          áreas mediante las reglas de alcance
          establecidas en el sistema.
        </Typography>

        <Typography
          variant="body2"
          sx={{ mt: 1 }}
        >
          La disponibilidad de una ubicación no
          garantiza autorización para todas las
          operaciones. Los permisos de cada módulo
          y las restricciones del backend continúan
          aplicándose.
        </Typography>
      </Alert>
    </Stack>
  );
}