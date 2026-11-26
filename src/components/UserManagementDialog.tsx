
import { useEffect, useRef, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  Person,
  Security,
  Save,
  Refresh,
} from "@mui/icons-material";

import UserLocationsEditor from "./UserLocationsEditor";

import { ApiError } from "../api/client";

import {
  getAdministrationUser,
  updateAdministrationUserRoles,
  updateAdministrationMembershipStatus,
} from "../services/users.services";

import {
  getAdministrationRoles,
} from "../services/roles.service";

import type {
  AdministrationUser,
  AdministrationRole,
  MembershipStatus,
} from "../types/administration";

// =====================================================
// TIPOS
// =====================================================

interface UserManagementDialogProps {
  userId: string;
  onClose: () => void;
  onSaved: (
    user: AdministrationUser,
    message: string
  ) => void;
}

interface AvailableRole {
  id: string;
  name: string;
  description: string | null;
  status: boolean;
  system_key: string | null;
}

interface OperationFeedback {
  severity: "success" | "error";
  message: string;
}

type SavingOperation =
  | "roles"
  | "locations"
  | "membership"
  | null;

// =====================================================
// CONSULTAR TODOS LOS ROLES
// =====================================================

async function loadAllRoles(
  signal: AbortSignal
): Promise<AdministrationRole[]> {
  const roles: AdministrationRole[] = [];

  let page = 1;
  let lastPage = 1;

  do {
    const response =
      await getAdministrationRoles(
        {
          page,
          perPage: 100,
        },
        signal
      );

    roles.push(...response.data);

    lastPage = response.meta.last_page;
    page += 1;
  } while (
    page <= lastPage &&
    !signal.aborted
  );

  return roles;
}

// =====================================================
// ERRORES DE LA API
// =====================================================

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (error instanceof ApiError) {
    if (
      error.status === 422 &&
      error.details &&
      typeof error.details === "object" &&
      "errors" in error.details
    ) {
      const errors = error.details.errors;

      if (
        errors &&
        typeof errors === "object"
      ) {
        const messages = Object.values(
          errors
        ).flatMap((value) => {
          if (Array.isArray(value)) {
            return value.filter(
              (item): item is string =>
                typeof item === "string"
            );
          }

          return typeof value === "string"
            ? [value]
            : [];
        });

        if (messages.length > 0) {
          return messages.join(" ");
        }
      }
    }

    return error.message || fallback;
  }

  return error instanceof Error
    ? error.message
    : fallback;
}

// =====================================================
// ENCABEZADO DE SECCIÓN
// =====================================================

interface SectionHeaderProps {
  title: string;
  description: string;
}

function SectionHeader({
  title,
  description,
}: SectionHeaderProps) {
  return (
    <Box>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          color: "#16324F",
        }}
      >
        {title}
      </Typography>

      <Typography
        variant="body2"
        sx={{ color: "#81909D" }}
      >
        {description}
      </Typography>
    </Box>
  );
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function UserManagementDialog({
  userId,
  onClose,
  onSaved,
}: UserManagementDialogProps) {
  const [user, setUser] =
    useState<AdministrationUser | null>(null);

  const [roles, setRoles] =
    useState<AvailableRole[]>([]);

  const [selectedRoleIds, setSelectedRoleIds] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [rolesError, setRolesError] =
    useState<string | null>(null);

  const [rolesFeedback, setRolesFeedback] =
    useState<OperationFeedback | null>(null);

  const [membershipFeedback, setMembershipFeedback] =
    useState<OperationFeedback | null>(null);

  const [saving, setSaving] =
    useState<SavingOperation>(null);

  const savingRef = useRef(false);
  const [locationsChanged, setLocationsChanged] = useState(false);

  const [refreshVersion, setRefreshVersion] =
    useState(0);

  const [
    pendingMembershipStatus,
    setPendingMembershipStatus,
  ] = useState<MembershipStatus | null>(null);

  // ===================================================
  // CARGAR USUARIO Y ROLES
  // ===================================================

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLocationsChanged(false);
      setLoading(true);
      setError(null);
      setRolesError(null);
      setRolesFeedback(null);
      setMembershipFeedback(null);
      setUser(null);
      setRoles([]);
      setSelectedRoleIds([]);

      try {
        const [
          userResult,
          rolesResult,
        ] = await Promise.allSettled([
          getAdministrationUser(
            userId,
            controller.signal
          ),

          loadAllRoles(
            controller.signal
          ),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        if (
          userResult.status === "rejected"
        ) {
          throw userResult.reason;
        }

        const currentUser =
          userResult.value.data;

        setUser(currentUser);

        setSelectedRoleIds(
          currentUser.roles.map(
            (role) => role.id
          )
        );

        if (
          rolesResult.status === "fulfilled"
        ) {
          const availableRoles: AvailableRole[] =
            rolesResult.value.map((role) => ({
              id: role.id,
              name: role.name,
              description: role.description,
              status: role.status,
              system_key: role.system_key,
            }));

          // Conservar roles asignados que no
          // aparezcan en el catálogo recuperado.

          for (const role of currentUser.roles) {
            if (
              !availableRoles.some(
                (item) => item.id === role.id
              )
            ) {
              availableRoles.push({
                id: role.id,
                name: role.name,
                description: null,
                status: role.status,
                system_key: role.system_key,
              });
            }
          }

          setRoles(
            availableRoles.sort(
              (a, b) =>
                a.name.localeCompare(
                  b.name,
                  "es"
                )
            )
          );
        } else {
          setRolesError(
            getErrorMessage(
              rolesResult.reason,
              "No fue posible consultar los roles."
            )
          );

          setRoles(
            currentUser.roles.map((role) => ({
              id: role.id,
              name: role.name,
              description: null,
              status: role.status,
              system_key: role.system_key,
            }))
          );
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            getErrorMessage(
              err,
              "No fue posible consultar el usuario."
            )
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => controller.abort();
  }, [userId, refreshVersion]);

  // ===================================================
  // ESTADO DE ROLES
  // ===================================================

  const originalRoleIds =
    user?.roles.map(
      (role) => role.id
    ) ?? [];

  const rolesChanged =
    selectedRoleIds.length !==
      originalRoleIds.length ||
    selectedRoleIds.some(
      (id) => !originalRoleIds.includes(id)
    );

  const canEditRoles =
    Boolean(user) &&
    user?.account_status === true &&
    user?.membership.status === "active" &&
    !rolesError;

  // ===================================================
  // SELECCIONAR ROL
  // ===================================================

  function toggleRole(role: AvailableRole) {
    if (
      !canEditRoles ||
      locationsChanged ||
      savingRef.current
    ) {
      return;
    }

    const selected =
      selectedRoleIds.includes(role.id);

    const originallyAssigned =
      originalRoleIds.includes(role.id);

    if (
      !role.status &&
      !selected &&
      !originallyAssigned
    ) {
      return;
    }

    setSelectedRoleIds((current) =>
      current.includes(role.id)
        ? current.filter(
            (id) => id !== role.id
          )
        : [...current, role.id]
    );

    setRolesFeedback(null);
  }

  // ===================================================
  // GUARDAR ROLES
  // ===================================================

  async function saveRoles() {
    if (
      !user ||
      !canEditRoles ||
      !rolesChanged ||
      locationsChanged ||
      savingRef.current
    ) {
      return;
    }

    savingRef.current = true;

    setSaving("roles");
    setRolesFeedback(null);

    try {
      const response =
        await updateAdministrationUserRoles(
          user.id,
          {
            role_ids: selectedRoleIds,
          }
        );

      const updatedUser = response.data;

      setUser(updatedUser);

      setSelectedRoleIds(
        updatedUser.roles.map(
          (role) => role.id
        )
      );

      const message =
        "Los roles se actualizaron correctamente.";

      setRolesFeedback({ severity: "success", message });

      onSaved(
        updatedUser,
        message
      );
    } catch (err) {
      setRolesFeedback({
        severity: "error",
        message: getErrorMessage(err, "No fue posible actualizar los roles."),
      });
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  }

  // ===================================================
  // RESTAURAR SELECCIÓN
  // ===================================================

  function resetRoles() {
    if (savingRef.current) {
      return;
    }

    setSelectedRoleIds([
      ...originalRoleIds,
    ]);

    setRolesFeedback(null);
  }

  // ===================================================
  // CAMBIAR ESTADO DE MEMBRESÍA
  // ===================================================

  async function saveMembershipStatus() {
    if (
      !user ||
      !pendingMembershipStatus ||
      savingRef.current ||
      rolesChanged || locationsChanged
    ) {
      return;
    }

    savingRef.current = true;

    setSaving("membership");
    setMembershipFeedback(null);

    try {
      const response =
        await updateAdministrationMembershipStatus(
          user.id,
          {
            status:
              pendingMembershipStatus,
          }
        );

      const updatedUser = response.data;

      setUser(updatedUser);

      setSelectedRoleIds(
        updatedUser.roles.map(
          (role) => role.id
        )
      );

      const message =
        updatedUser.membership.status ===
        "active"
          ? "La membresía se reactivó correctamente."
          : "La membresía se revocó correctamente.";

      setPendingMembershipStatus(null);

      setMembershipFeedback({ severity: "success", message });

      onSaved(
        updatedUser,
        message
      );
    } catch (err) {
      setPendingMembershipStatus(null);

      setMembershipFeedback({
        severity: "error",
        message: getErrorMessage(err, "No fue posible modificar la membresía."),
      });
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  }

  // ===================================================
  // CERRAR DIÁLOGO
  // ===================================================

  function handleClose() {
    if (
      savingRef.current ||
      rolesChanged || locationsChanged
    ) {
      return;
    }

    onClose();
  }

  // ===================================================
  // INTERFAZ
  // ===================================================

  return (
    <>
      <Dialog
        open
        onClose={handleClose}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: "center" }}
            >
              <Person
                sx={{ color: "#16324F" }}
              />

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: "#16324F",
                }}
              >
                Administrar usuario
              </Typography>
            </Stack>

            <Button
              size="small"
              startIcon={<Refresh />}
              disabled={
                loading ||
                Boolean(saving) ||
                rolesChanged || locationsChanged
              }
              onClick={() =>
                setRefreshVersion(
                  (current) => current + 1
                )
              }
            >
              Actualizar
            </Button>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
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
                sx={{
                  color: "text.secondary",
                }}
              >
                Cargando usuario...
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={3}>
              {error && (
                <Alert severity="error">
                  {error}
                </Alert>
              )}

              {user && (
                <>
                  {/* INFORMACIÓN GENERAL */}

                  <SectionHeader
                    title="Información del usuario"
                    description="Identidad y estado de la cuenta."
                  />

                  <Grid container spacing={2}>
                    <Grid
                      size={{ xs: 12, md: 6 }}
                    >
                      <TextField
                        fullWidth
                        label="Nombre completo"
                        value={user.name}
                        slotProps={{
                          htmlInput: {
                            readOnly: true,
                          },
                        }}
                      />
                    </Grid>

                    <Grid
                      size={{ xs: 12, md: 6 }}
                    >
                      <TextField
                        fullWidth
                        label="Correo electrónico"
                        value={user.email}
                        slotProps={{
                          htmlInput: {
                            readOnly: true,
                          },
                        }}
                      />
                    </Grid>
                  </Grid>

                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{
                      flexWrap: "wrap",
                    }}
                  >
                    <Chip
                      label={
                        user.account_status
                          ? "Cuenta activa"
                          : "Cuenta inactiva"
                      }
                      color={
                        user.account_status
                          ? "success"
                          : "default"
                      }
                      size="small"
                    />

                    <Chip
                      label={
                        user.membership.status ===
                        "active"
                          ? "Membresía activa"
                          : "Membresía revocada"
                      }
                      color={
                        user.membership.status ===
                        "active"
                          ? "success"
                          : "default"
                      }
                      size="small"
                    />
                  </Stack>

                  <Divider />

                  {/* ROLES */}

                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: "center" }}
                  >
                    <Security
                      sx={{ color: "#0F9D8A" }}
                    />

                    <SectionHeader
                      title="Roles asignados"
                      description="Selecciona los roles que tendrá el usuario dentro de esta organización."
                    />
                  </Stack>

                  {rolesError && (
                    <Alert severity="warning">
                      {rolesError}
                      {" "}
                      La asignación de roles
                      no está disponible.
                    </Alert>
                  )}

                  {!user.account_status ||
                  user.membership.status !==
                    "active" ? (
                    <Alert severity="info">
                      La cuenta y la membresía
                      deben estar activas para
                      modificar los roles.
                    </Alert>
                  ) : null}

                  {roles.length === 0 ? (
                    <Alert severity="info">
                      No hay roles disponibles.
                    </Alert>
                  ) : (
                    <Stack spacing={1}>
                      {roles.map((role) => {
                        const selected =
                          selectedRoleIds.includes(
                            role.id
                          );

                        const originallyAssigned =
                          originalRoleIds.includes(
                            role.id
                          );

                        const disabled =
                          !canEditRoles ||
                          Boolean(saving) ||
                          (
                            !role.status &&
                            !selected &&
                            !originallyAssigned
                          );

                        return (
                          <Box
                            key={role.id}
                            sx={{
                              border: "1px solid",
                              borderColor:
                                selected
                                  ? "#0F9D8A"
                                  : "divider",
                              borderRadius: 2,
                              p: 1.5,
                              backgroundColor:
                                selected
                                  ? "#F0F9F7"
                                  : "transparent",
                            }}
                          >
                            <FormControlLabel
                              sx={{
                                width: "100%",
                                m: 0,
                                alignItems:
                                  "flex-start",
                              }}
                              control={
                                <Checkbox
                                  checked={selected}
                                  disabled={disabled}
                                  onChange={() =>
                                    toggleRole(role)
                                  }
                                />
                              }
                              label={
                                <Stack
                                  spacing={0.75}
                                  sx={{ py: 0.75 }}
                                >
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    useFlexGap
                                    sx={{
                                      alignItems:
                                        "center",
                                      flexWrap:
                                        "wrap",
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: 700,
                                        color: "#16324F",
                                      }}
                                    >
                                      {role.name}
                                    </Typography>

                                    {!role.status && (
                                      <Chip
                                        label="Inactivo"
                                        size="small"
                                      />
                                    )}

                                    {role.system_key && (
                                      <Chip
                                        label="Rol del sistema"
                                        size="small"
                                        variant="outlined"
                                      />
                                    )}
                                  </Stack>

                                  {role.description && (
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color:
                                          "text.secondary",
                                      }}
                                    >
                                      {role.description}
                                    </Typography>
                                  )}
                                </Stack>
                              }
                            />
                          </Box>
                        );
                      })}
                    </Stack>
                  )}

                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    Roles seleccionados:{" "}
                    {selectedRoleIds.length}
                  </Typography>

                  {rolesChanged && (
                    <Alert severity="warning">
                      Tienes cambios de roles
                      pendientes de guardar.
                    </Alert>
                  )}

                  {rolesFeedback && (
                    <Alert
                      severity={rolesFeedback.severity}
                      onClose={() => setRolesFeedback(null)}
                    >
                      {rolesFeedback.message}
                    </Alert>
                  )}

                  <Stack
                    direction="row"
                    spacing={2}
                    useFlexGap
                    sx={{
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                    }}
                  >
                    <Button
                      disabled={
                        !rolesChanged ||
                        Boolean(saving)
                      }
                      onClick={resetRoles}
                    >
                      Descartar cambios
                    </Button>

                    <Button
                      variant="contained"
                      disabled={
                        !canEditRoles ||
                        locationsChanged ||
                        !rolesChanged ||
                        Boolean(saving)
                      }
                      startIcon={
                        saving === "roles" ? (
                          <CircularProgress
                            size={18}
                            color="inherit"
                          />
                        ) : (
                          <Save />
                        )
                      }
                      onClick={() =>
                        void saveRoles()
                      }
                    >
                      {saving === "roles"
                        ? "Guardando..."
                        : "Guardar roles"}
                    </Button>
                  </Stack>

                  <Divider />

                  <UserLocationsEditor
                    key={user.id}
                    user={user}
                    disabled={Boolean(saving) || rolesChanged || pendingMembershipStatus !== null}
                    onDirtyChange={setLocationsChanged}
                    onSavingChange={(active) => {
                      savingRef.current = active;
                      setSaving(active ? "locations" : null);
                    }}
                    onSaved={(updatedUser, message) => {
                      setUser(updatedUser);
                      onSaved(updatedUser, message);
                    }}
                  />

                  <Divider />

                  {/* MEMBRESÍA */}

                  <SectionHeader
                    title="Administración de membresía"
                    description="Controla el acceso del usuario a la organización actual."
                  />

                  {user.membership.status ===
                  "active" ? (
                    <Alert severity="warning">
                      Revocar la membresía impide
                      el acceso del usuario a esta
                      organización, pero conserva
                      su cuenta, roles, ubicaciones
                      e historial.
                    </Alert>
                  ) : (
                    <Alert severity="info">
                      La membresía está revocada.
                      Puedes solicitar su
                      reactivación si cumple las
                      restricciones del sistema.
                    </Alert>
                  )}

                  {membershipFeedback && (
                    <Alert
                      severity={membershipFeedback.severity}
                      onClose={() => setMembershipFeedback(null)}
                    >
                      {membershipFeedback.message}
                    </Alert>
                  )}

                  <Box>
                    <Button
                      variant="outlined"
                      color={
                        user.membership.status ===
                        "active"
                          ? "error"
                          : "success"
                      }
                      disabled={
                        Boolean(saving) ||
                        rolesChanged || locationsChanged ||
                        (
                          user.membership.status ===
                            "revoked" &&
                          !user.account_status
                        )
                      }
                      onClick={() =>
                        setPendingMembershipStatus(
                          user.membership.status ===
                            "active"
                            ? "revoked"
                            : "active"
                        )
                      }
                    >
                      {user.membership.status ===
                      "active"
                        ? "Revocar membresía"
                        : "Reactivar membresía"}
                    </Button>
                  </Box>

                  {user.membership.status ===
                    "revoked" &&
                    !user.account_status && (
                      <Alert severity="warning">
                        No es posible reactivar
                        una membresía mientras
                        la cuenta esté inactiva.
                      </Alert>
                    )}
                </>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleClose}
            disabled={
              Boolean(saving) ||
              rolesChanged || locationsChanged
            }
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* CONFIRMACIÓN DE MEMBRESÍA */}

      {pendingMembershipStatus && user && (
        <Dialog
          open
          fullWidth
          maxWidth="xs"
          onClose={() => {
            if (!savingRef.current) {
              setPendingMembershipStatus(null);
            }
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 700,
              color: "#16324F",
            }}
          >
            {pendingMembershipStatus ===
            "revoked"
              ? "Revocar membresía"
              : "Reactivar membresía"}
          </DialogTitle>

          <DialogContent dividers>
            <Stack spacing={2}>
              <Typography variant="body2">
                ¿Confirmas que deseas{" "}
                {pendingMembershipStatus ===
                "revoked"
                  ? "revocar"
                  : "reactivar"}{" "}
                la membresía de{" "}
                <strong>{user.name}</strong>?
              </Typography>

              <Alert
                severity={
                  pendingMembershipStatus ===
                  "revoked"
                    ? "warning"
                    : "info"
                }
              >
                {pendingMembershipStatus ===
                "revoked"
                  ? "El usuario perderá el acceso a esta organización."
                  : "El sistema validará que el usuario pueda recuperar el acceso."}
              </Alert>
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button
              disabled={Boolean(saving)}
              onClick={() =>
                setPendingMembershipStatus(null)
              }
            >
              Cancelar
            </Button>

            <Button
              variant="contained"
              color={
                pendingMembershipStatus ===
                "revoked"
                  ? "error"
                  : "success"
              }
              disabled={Boolean(saving)}
              onClick={() =>
                void saveMembershipStatus()
              }
            >
              {saving === "membership"
                ? "Procesando..."
                : "Confirmar"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
