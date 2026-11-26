
import { useRef, useState } from "react";

import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

import { ApiError } from "../api/client";

import {
  updateLocationPlantStatus,
  updateLocationAreaStatus,
  updateLocationProductionLineStatus,
} from "../services/locations.service";

import type {
  LocationKind,
  LocationStatusConfig,
} from "../types/locations";

interface LocationStatusDialogProps {
  config: LocationStatusConfig;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const LOCATION_LABELS: Record<LocationKind, string> = {
  plant: "planta",
  area: "área",
  "production-line": "línea de producción",
};

function getStatusDescription(
  kind: LocationKind,
  nextStatus: boolean
): string {
  if (nextStatus) {
    if (kind === "plant") {
      return (
        "La planta recuperará su disponibilidad. " +
        "Las áreas y líneas activas recuperarán su " +
        "disponibilidad cuando corresponda."
      );
    }

    return (
      "Se reactivará la ubicación. Su disponibilidad " +
      "dependerá también del estado de sus " +
      "ubicaciones superiores."
    );
  }

  switch (kind) {
    case "plant":
      return (
        "Las áreas y líneas de producción asociadas " +
        "dejarán de estar disponibles, pero conservarán " +
        "su estado individual."
      );

    case "area":
      return (
        "Las líneas de producción asociadas dejarán " +
        "de estar disponibles, pero conservarán " +
        "su estado individual."
      );

    case "production-line":
      return (
        "La línea de producción dejará de estar " +
        "disponible para nuevas operaciones."
      );
  }
}

export default function LocationStatusDialog({
  config,
  onClose,
  onSaved,
}: LocationStatusDialogProps) {
  const [saving, setSaving] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const savingRef = useRef(false);

  const nextStatus = !config.status;

  const locationLabel =
    LOCATION_LABELS[config.kind];

  const actionLabel = nextStatus
    ? "Reactivar"
    : "Desactivar";

  function handleClose() {
    if (savingRef.current) {
      return;
    }

    onClose();
  }

  async function handleSave() {
    if (savingRef.current) {
      return;
    }

    savingRef.current = true;

    setSaving(true);
    setError(null);

    try {
      const input = {
        status: nextStatus,
      };

      switch (config.kind) {
        case "plant":
          await updateLocationPlantStatus(
            config.id,
            input
          );
          break;

        case "area":
          await updateLocationAreaStatus(
            config.id,
            input
          );
          break;

        case "production-line":
          await updateLocationProductionLineStatus(
            config.id,
            input
          );
          break;
      }

      const message = nextStatus
        ? `Se reactivó correctamente: ${config.name}.`
        : `Se desactivó correctamente: ${config.name}.`;

      onSaved(message);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No fue posible actualizar el estado de la ubicación."
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      fullWidth
      maxWidth="xs"
      onClose={handleClose}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          color: "#16324F",
        }}
      >
        {actionLabel} {locationLabel}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2">
            ¿Confirmas que deseas{" "}
            {actionLabel.toLowerCase()}{" "}
            <strong>{config.name}</strong>?
          </Typography>

          <Alert
            severity={
              nextStatus ? "info" : "warning"
            }
          >
            {getStatusDescription(
              config.kind,
              nextStatus
            )}
          </Alert>

          {!nextStatus && (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
              }}
            >
              Se conservarán las asignaciones,
              inspecciones y registros históricos.
            </Typography>
          )}

          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          disabled={saving}
          onClick={handleClose}
        >
          Cancelar
        </Button>

        <Button
          variant="contained"
          color={
            nextStatus ? "success" : "error"
          }
          disabled={saving}
          startIcon={
            saving ? (
              <CircularProgress
                size={18}
                color="inherit"
              />
            ) : undefined
          }
          onClick={() => void handleSave()}
        >
          {saving
            ? "Procesando..."
            : actionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
