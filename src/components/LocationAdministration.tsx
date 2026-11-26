import { useCallback, useEffect, useRef, useState } from "react";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Pagination,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";

import {
  Add,
  Business,
  Edit,
  ExpandMore,
  Factory,
  Refresh,
  Settings,
} from "@mui/icons-material";

import { getLocationHierarchy } from "../services/locations.service";

import LocationFormDialog from "./LocationFormDialog";
import LocationStatusDialog from "./LocationStatusDialog";

import type {
  LocationPlant,
  LocationArea,
  LocationProductionLine,
  LocationFormConfig,
  LocationStatusConfig,
} from "../types/locations";

const PER_PAGE = 10;

// =====================================================
// INDICADOR DE DISPONIBILIDAD
// =====================================================

interface LocationStatusProps {
  status: boolean;
  available: boolean;
}

function LocationStatus({
  status,
  available,
}: LocationStatusProps) {
  if (!status) {
    return (
      <Chip
        label="Inactiva"
        size="small"
        color="default"
      />
    );
  }

  if (!available) {
    return (
      <Chip
        label="No disponible"
        size="small"
        color="warning"
      />
    );
  }

  return (
    <Chip
      label="Activa"
      size="small"
      color="success"
    />
  );
}

// =====================================================
// LÍNEA DE PRODUCCIÓN
// =====================================================

interface ProductionLineItemProps {
  line: LocationProductionLine;
  onOpenForm: (config: LocationFormConfig) => void;
  onOpenStatus: (config: LocationStatusConfig) => void;
  disabled: boolean;
}

function ProductionLineItem({
  line,
  onOpenForm,
  onOpenStatus,
  disabled,
}: ProductionLineItemProps) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          alignItems: {
            xs: "stretch",
            sm: "center",
          },
        }}
      >
        <Settings
          sx={{ color: "text.secondary" }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600 }}
          >
            {line.name}
          </Typography>

          <Typography
            variant="caption"
            sx={{ color: "text.secondary" }}
          >
            {line.code}
          </Typography>
        </Box>

        <LocationStatus
          status={line.status}
          available={line.available}
        />

        <Button
          size="small"
          variant="outlined"
          startIcon={<Edit />}
              disabled={disabled}
          onClick={() =>
            onOpenForm({
              mode: "edit",
              kind: "production-line",
              id: line.id,
            })
          }
        >
          Editar
        </Button>

        <Button
          size="small"
          variant="outlined"
          color={line.status ? "error" : "success"}
              disabled={disabled}
          onClick={() =>
            onOpenStatus({
              kind: "production-line",
              id: line.id,
              name: line.name,
              status: line.status,
            })
          }
        >
          {line.status ? "Desactivar" : "Reactivar"}
        </Button>
      </Stack>
    </Box>
  );
}

// =====================================================
// ÁREA
// =====================================================

interface AreaItemProps {
  area: LocationArea;
  onOpenForm: (config: LocationFormConfig) => void;
  onOpenStatus: (config: LocationStatusConfig) => void;
  disabled: boolean;
}

function AreaItem({
  area,
  onOpenForm,
  onOpenStatus,
  disabled,
}: AreaItemProps) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "8px !important",
        "&::before": {
          display: "none",
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore />}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: "center",
            width: "100%",
            pr: 1,
          }}
        >
          <Business
            sx={{ color: "#2673C9" }}
          />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600 }}
            >
              {area.name}
            </Typography>

            <Typography
              variant="caption"
              sx={{ color: "text.secondary" }}
            >
              {area.code}
              {area.type ? ` · ${area.type}` : ""}
              {" · "}
              {area.production_lines.length} líneas
            </Typography>
          </Box>

          <LocationStatus
            status={area.status}
            available={area.available}
          />
        </Stack>
      </AccordionSummary>

      <AccordionDetails>
        <Stack spacing={2}>
          {!area.available && (
            <Alert severity="warning">
              Esta área no está disponible para
              nuevas operaciones.
            </Alert>
          )}

          {/* ACCIONES DEL ÁREA */}

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <Button
              size="small"
              variant="outlined"
              startIcon={<Edit />}
              disabled={disabled}
              onClick={() =>
                onOpenForm({
                  mode: "edit",
                  kind: "area",
                  id: area.id,
                })
              }
            >
              Editar área
            </Button>

            <Button
              size="small"
              variant="outlined"
              color={area.status ? "error" : "success"}
              disabled={disabled}
              onClick={() =>
                onOpenStatus({
                  kind: "area",
                  id: area.id,
                  name: area.name,
                  status: area.status,
                })
              }
            >
              {area.status ? "Desactivar" : "Reactivar"}
            </Button>

            <Button
              size="small"
              variant="contained"
              startIcon={<Add />}
              disabled={disabled || !area.available}
              onClick={() =>
                onOpenForm({
                  mode: "create",
                  kind: "production-line",
                  parentId: area.id,
                  parentName: area.name,
                })
              }
              sx={{
                backgroundColor: "#16324F",
                "&:hover": {
                  backgroundColor: "#244766",
                },
              }}
            >
              Nueva línea
            </Button>
          </Stack>

          <Divider />

          {/* LÍNEAS DE PRODUCCIÓN */}

          <Typography
            variant="subtitle2"
            sx={{ color: "text.secondary" }}
          >
            Líneas de producción
          </Typography>

          {area.production_lines.length === 0 ? (
            <Typography
              variant="body2"
              sx={{ color: "text.secondary" }}
            >
              No hay líneas de producción registradas.
            </Typography>
          ) : (
            area.production_lines.map((line) => (
              <ProductionLineItem
                key={line.id}
                line={line}
                onOpenForm={onOpenForm}
                onOpenStatus={onOpenStatus}
                disabled={disabled}
              />
            ))
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

// =====================================================
// PLANTA
// =====================================================

interface PlantItemProps {
  plant: LocationPlant;
  onOpenForm: (config: LocationFormConfig) => void;
  onOpenStatus: (config: LocationStatusConfig) => void;
  disabled: boolean;
}

function PlantItem({
  plant,
  onOpenForm,
  onOpenStatus,
  disabled,
}: PlantItemProps) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "8px !important",
        "&::before": {
          display: "none",
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore />}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: "center",
            width: "100%",
            pr: 1,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: 2,
              backgroundColor: "#E8F0F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Factory
              sx={{ color: "#16324F" }}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700 }}
            >
              {plant.name}
            </Typography>

            <Typography
              variant="caption"
              sx={{ color: "text.secondary" }}
            >
              {plant.code} · {plant.areas.length} áreas
            </Typography>
          </Box>

          <LocationStatus
            status={plant.status}
            available={plant.available}
          />
        </Stack>
      </AccordionSummary>

      <AccordionDetails>
        <Stack spacing={2}>
          {!plant.available && (
            <Alert severity="warning">
              Esta planta no está disponible.
              Sus áreas y líneas tampoco estarán
              disponibles para nuevas operaciones,
              aunque mantengan su estado activo.
            </Alert>
          )}

          {/* ACCIONES DE LA PLANTA */}

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <Button
              size="small"
              variant="outlined"
              startIcon={<Edit />}
              disabled={disabled}
              onClick={() =>
                onOpenForm({
                  mode: "edit",
                  kind: "plant",
                  id: plant.id,
                })
              }
            >
              Editar planta
            </Button>

            <Button
              size="small"
              variant="outlined"
              color={plant.status ? "error" : "success"}
              disabled={disabled}
              onClick={() =>
                onOpenStatus({
                  kind: "plant",
                  id: plant.id,
                  name: plant.name,
                  status: plant.status,
                })
              }
            >
              {plant.status ? "Desactivar" : "Reactivar"}
            </Button>

            <Button
              size="small"
              variant="contained"
              startIcon={<Add />}
              disabled={disabled || !plant.available}
              onClick={() =>
                onOpenForm({
                  mode: "create",
                  kind: "area",
                  parentId: plant.id,
                  parentName: plant.name,
                })
              }
              sx={{
                backgroundColor: "#16324F",
                "&:hover": {
                  backgroundColor: "#244766",
                },
              }}
            >
              Nueva área
            </Button>
          </Stack>

          <Divider />

          {/* ÁREAS DE LA PLANTA */}

          <Typography
            variant="subtitle2"
            sx={{ color: "text.secondary" }}
          >
            Áreas de la planta
          </Typography>

          {plant.areas.length === 0 ? (
            <Typography
              variant="body2"
              sx={{ color: "text.secondary" }}
            >
              No hay áreas registradas.
            </Typography>
          ) : (
            plant.areas.map((area) => (
              <AreaItem
                key={area.id}
                area={area}
                onOpenForm={onOpenForm}
                onOpenStatus={onOpenStatus}
                disabled={disabled}
              />
            ))
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function LocationAdministration() {
  // ===================================================
  // ESTADOS
  // ===================================================

  const [plants, setPlants] =
    useState<LocationPlant[]>([]);

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [formConfig, setFormConfig] =
    useState<LocationFormConfig | null>(null);

  const [statusConfig, setStatusConfig] =
    useState<LocationStatusConfig | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [refreshVersion, setRefreshVersion] =
    useState(0);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const loadedPage = useRef<number | null>(null);
  const requestPending = useRef(false);

  const refresh = useCallback(() => {
    if (requestPending.current) return;
    requestPending.current = true;
    setRefreshing(true);
    setRefreshVersion((current) => current + 1);
  }, []);

  function handleFormSaved(message: string) {
    setFormConfig(null);
    setSuccessMessage(message);
    refresh();
  }

  function handleStatusSaved(message: string) {
    setStatusConfig(null);
    setSuccessMessage(message);
    refresh();
  }

  function handleFormClose() {
    setFormConfig(null);
  }

  // Una sola consulta activa: las actualizaciones de la misma
  // página conservan el listado y los acordeones montados.
  useEffect(() => {
    const controller = new AbortController();
    const silent = loadedPage.current === page;
    requestPending.current = true;
    setLoading(!silent);
    setRefreshing(silent);
    setError(null);
    setRefreshError(null);

    async function loadLocations() {
      try {
        const response = await getLocationHierarchy(
          { page, perPage: PER_PAGE },
          controller.signal
        );
        if (controller.signal.aborted) return;

        const nextLastPage = Math.max(1, response.meta.last_page);
        if (page > nextLastPage) {
          setPage(nextLastPage);
          return;
        }

        setPlants(response.data);
        setLastPage(nextLastPage);
        setTotal(response.meta.total);
        loadedPage.current = page;
        setHasLoaded(true);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error
          ? err.message
          : "No fue posible consultar las ubicaciones.";
        if (silent) {
          setRefreshError(`No fue posible actualizar el listado. Los datos mostrados podrían estar desactualizados: ${message}`);
        } else {
          setError(message);
        }
      } finally {
        if (!controller.signal.aborted) {
          requestPending.current = false;
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadLocations();
    return () => controller.abort();
  }, [page, refreshVersion]);

  const actionsDisabled = loading || refreshing || Boolean(refreshError) || Boolean(error);

  // ===================================================
  // INTERFAZ
  // ===================================================

  return (
    <Stack spacing={3}>
      {/* ENCABEZADO */}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          alignItems: {
            xs: "stretch",
            sm: "center",
          },
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "#16324F",
            }}
          >
            Ubicaciones de la organización
          </Typography>

          <Typography
            variant="body2"
            sx={{ color: "text.secondary" }}
          >
            Consulta y administra las plantas,
            áreas y líneas de producción
            de la organización.
          </Typography>
        </Box>

        {/* ACCIONES PRINCIPALES */}

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: "wrap" }}
        >
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={18} color="inherit" /> : <Refresh />}
            onClick={refresh}
            disabled={loading || refreshing}
          >
            Actualizar
          </Button>

          <Button
            variant="contained"
            startIcon={<Add />}
            disabled={actionsDisabled}
            onClick={() =>
              setFormConfig({
                mode: "create",
                kind: "plant",
              })
            }
            sx={{
              backgroundColor: "#16324F",
              "&:hover": {
                backgroundColor: "#244766",
              },
            }}
          >
            Nueva planta
          </Button>
        </Stack>
      </Stack>

      {/* LEYENDA DE ESTADOS */}

      <Card
        variant="outlined"
        sx={{ p: 2 }}
      >
        <Stack spacing={1.5}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600 }}
          >
            Estados de disponibilidad
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <Chip
              label="Activa"
              color="success"
              size="small"
            />

            <Chip
              label="Inactiva"
              color="default"
              size="small"
            />

            <Chip
              label="No disponible"
              color="warning"
              size="small"
            />
          </Stack>

          <Typography
            variant="caption"
            sx={{ color: "text.secondary" }}
          >
            Una ubicación activa puede no estar
            disponible si alguna ubicación superior
            se encuentra inactiva.
          </Typography>
        </Stack>
      </Card>

      {/* MENSAJE DE ERROR */}

      {error && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={refresh}
            >
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {refreshError && (
        <Alert severity="warning" action={
          <Button color="inherit" size="small" disabled={refreshing} onClick={refresh}>
            Reintentar
          </Button>
        }>
          {refreshError}
        </Alert>
      )}

      {/* ESTADO DE CARGA */}

      {loading ? (
        <Stack
          spacing={2}
          sx={{
            alignItems: "center",
            py: 5,
          }}
        >
          <CircularProgress size={32} />

          <Typography
            variant="body2"
            sx={{ color: "text.secondary" }}
          >
            Cargando ubicaciones...
          </Typography>
        </Stack>
      ) : !error && hasLoaded ? (
        <>
          {/* TOTAL DE REGISTROS */}

          <Typography
            variant="body2"
            sx={{ color: "text.secondary" }}
          >
            Plantas encontradas: {total}
          </Typography>

          {/* LISTADO DE PLANTAS */}

          {plants.length === 0 ? (
            <Alert severity="info">
              No se encontraron ubicaciones accesibles
              para la organización actual.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {plants.map((plant) => (
                <PlantItem
                  key={plant.id}
                  plant={plant}
                  onOpenForm={setFormConfig}
                  onOpenStatus={setStatusConfig}
                  disabled={actionsDisabled}
                />
              ))}
            </Stack>
          )}

          {/* PAGINACIÓN */}

          {lastPage > 1 && (
            <>
              <Divider />

              <Stack
                sx={{ alignItems: "center" }}
              >
                <Pagination
                  count={lastPage}
                  disabled={loading || refreshing}
                  page={page}
                  onChange={(_, value) =>
                    setPage(value)
                  }
                  color="primary"
                  shape="rounded"
                />
              </Stack>
            </>
          )}
        </>
      ) : null}

      {/* FORMULARIO DE CREACIÓN Y EDICIÓN */}

      <LocationFormDialog
        config={formConfig}
        onClose={handleFormClose}
        onSaved={handleFormSaved}
      />

      {/* CONFIRMACIÓN DE CAMBIO DE ESTADO */}

      {statusConfig && (
        <LocationStatusDialog
          key={`${statusConfig.kind}-${statusConfig.id}`}
          config={statusConfig}
          onClose={() => setStatusConfig(null)}
          onSaved={handleStatusSaved}
        />
      )}

      {/* NOTIFICACIÓN DE ÉXITO */}

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={5000}
        onClose={(_, reason) => {
          if (reason !== "clickaway") {
            setSuccessMessage(null);
          }
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSuccessMessage(null)}
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
