import { useEffect, useRef, useState } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

import {
  getAuthToken,
  getOrganizationId,
} from "../api/client";

import { reviewInspection } from "../services/inspections.service";
import type {
  InspectionDetail,
  InspectionReviewInput,
} from "../types/inspections";

interface InspectionReviewActionsProps {
  inspection: InspectionDetail;
  canReview: boolean;
  onReviewed: (inspection: InspectionDetail) => void;
  onSavingChange: (saving: boolean) => void;
}

type ReviewAction = "confirm" | "reject";

const MAX_OBSERVATION_BYTES = 65535;

export default function InspectionReviewActions({
  inspection,
  canReview,
  onReviewed,
  onSavingChange,
}: InspectionReviewActionsProps) {
  const [action, setAction] =
    useState<ReviewAction | null>(null);

  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  const observationBytes = new TextEncoder().encode(
    observations
  ).length;

  const validObservations =
    observations.trim().length > 0 &&
    observationBytes <= MAX_OBSERVATION_BYTES;

  const reviewAvailable =
    canReview &&
    inspection.status === "completed" &&
    inspection.supervisor_id === null &&
    inspection.supervisor_confirmed_at == null &&
    inspection.rejected_at == null &&
    inspection.supervisor_observations == null;

  function openReview(nextAction: ReviewAction) {
    if (requestRef.current || !reviewAvailable) return;

    setError("");
    setObservations("");
    setAction(nextAction);
  }

  function closeReview() {
    if (requestRef.current) return;

    setAction(null);
    setObservations("");
    setError("");
  }

  async function submitReview() {
    if (
      !action ||
      !reviewAvailable ||
      requestRef.current
    ) {
      return;
    }

    if (action === "reject" && !validObservations) {
      setError(
        "Debes proporcionar observaciones válidas para rechazar la inspección."
      );
      return;
    }

    const token = getAuthToken();
    const organizationId = getOrganizationId();

    if (
      !token ||
      !organizationId ||
      organizationId !== inspection.organization_id
    ) {
      setError("El contexto de la sesión ya no es válido.");
      return;
    }

    const payload: InspectionReviewInput =
      action === "confirm"
        ? {
            action: "confirm",
          }
        : {
            action: "reject",
            supervisor_observations: observations.trim(),
          };

    const controller = new AbortController();

    requestRef.current = controller;

    setSaving(true);
    setError("");
    onSavingChange(true);

    try {
      const response = await reviewInspection(
        inspection.id,
        payload,
        controller.signal
      );

      if (
        controller.signal.aborted ||
        getAuthToken() !== token ||
        getOrganizationId() !== organizationId
      ) {
        return;
      }

      setAction(null);
      setObservations("");

      onReviewed(response.data);
    } catch (err) {
      if (controller.signal.aborted) return;

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible revisar la inspección."
      );
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;

        if (!controller.signal.aborted) {
          setSaving(false);
          onSavingChange(false);
        }
      }
    }
  }

  if (!reviewAvailable) {
    return null;
  }

  return (
    <>
      <Box
        sx={{
          p: 2.5,
          border: "1px solid #DCE6EE",
          borderRadius: 2,
          bgcolor: "#F8FAFC",
        }}
      >
        <Typography
          sx={{
            color: "#16324F",
            fontWeight: 700,
            mb: 1,
          }}
        >
          Revisión del supervisor
        </Typography>

        <Typography
          sx={{
            color: "#526477",
            fontSize: 14,
            mb: 2,
          }}
        >
          Esta inspección ha sido completada y se
          encuentra pendiente de revisión. Verifica
          sus respuestas antes de emitir una resolución.
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ justifyContent: "flex-end" }}
        >
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            disabled={saving}
            onClick={() => openReview("reject")}
            sx={{ textTransform: "none" }}
          >
            Rechazar inspección
          </Button>

          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            disabled={saving}
            onClick={() => openReview("confirm")}
            sx={{
              bgcolor: "#0F9D8A",
              textTransform: "none",
              "&:hover": {
                bgcolor: "#0C8878",
              },
            }}
          >
            Confirmar inspección
          </Button>
        </Stack>
      </Box>

      <Dialog
        open={action !== null}
        onClose={closeReview}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            color: "#16324F",
            fontWeight: 700,
          }}
        >
          {action === "confirm"
            ? "Confirmar inspección"
            : "Rechazar inspección"}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2}>
            {error && (
              <Alert severity="error">{error}</Alert>
            )}

            <Alert severity="warning">
              Esta operación es definitiva. Una vez
              revisada, la inspección no podrá volver
              al estado completado mediante este proceso.
            </Alert>

            {action === "confirm" ? (
              <Typography sx={{ color: "#526477" }}>
                ¿Confirmas que has revisado las respuestas
                y los resultados de esta inspección?
              </Typography>
            ) : (
              <TextField
                label="Observaciones del supervisor"
                placeholder="Describe los motivos del rechazo..."
                value={observations}
                onChange={(event) => {
                  setObservations(event.target.value);
                  setError("");
                }}
                multiline
                minRows={4}
                fullWidth
                required
                disabled={saving}
                error={
                  observationBytes > MAX_OBSERVATION_BYTES
                }
                helperText={
                  observationBytes > MAX_OBSERVATION_BYTES
                    ? "Las observaciones superan el tamaño permitido."
                    : "Explica los motivos por los que se rechaza la inspección."
                }
              />
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={closeReview}
            disabled={saving}
            sx={{ textTransform: "none" }}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            color={action === "reject" ? "error" : "success"}
            onClick={() => void submitReview()}
            disabled={
              saving ||
              (action === "reject" && !validObservations)
            }
            startIcon={
              saving ? (
                <CircularProgress
                  size={16}
                  color="inherit"
                />
              ) : action === "confirm" ? (
                <CheckCircleIcon />
              ) : (
                <CancelIcon />
              )
            }
            sx={{ textTransform: "none" }}
          >
            {saving
              ? "Guardando..."
              : action === "confirm"
                ? "Confirmar"
                : "Rechazar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}