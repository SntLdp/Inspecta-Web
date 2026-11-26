
import { useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  Edit,
  Refresh,
  Search,
} from "@mui/icons-material";

import { ApiError } from "../api/client";

import {
  getAdministrationUsers,
} from "../services/users.services";

import UserManagementDialog
  from "./UserManagementDialog";

import type {
  AdministrationUser,
  MembershipStatus,
} from "../types/administration";

// =====================================================
// TIPOS
// =====================================================

const PER_PAGE = 15;

type StatusFilter =
  | "all"
  | MembershipStatus;

interface UserAdministrationProps {
  onChanged?: () => void;
}

// =====================================================
// ESTADO DEL USUARIO
// =====================================================

function UserStatus({
  user,
}: {
  user: AdministrationUser;
}) {
  if (
    user.membership.status === "revoked"
  ) {
    return (
      <Chip
        label="Membresía revocada"
        size="small"
        color="default"
      />
    );
  }

  if (!user.account_status) {
    return (
      <Chip
        label="Cuenta inactiva"
        size="small"
        color="warning"
      />
    );
  }

  return (
    <Chip
      label="Activo"
      size="small"
      color="success"
    />
  );
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function UserAdministration({
  onChanged,
}: UserAdministrationProps) {
  const [users, setUsers] =
    useState<AdministrationUser[]>([]);

  const [search, setSearch] =
    useState("");

  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState("");

  const [status, setStatus] =
    useState<StatusFilter>("all");

  const [page, setPage] =
    useState(1);

  const [lastPage, setLastPage] =
    useState(1);

  const [total, setTotal] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    refreshVersion,
    setRefreshVersion,
  ] = useState(0);

  const [
    selectedUserId,
    setSelectedUserId,
  ] = useState<string | null>(null);

  // ===================================================
  // BÚSQUEDA
  // ===================================================

  useEffect(() => {
    const timeout = window.setTimeout(
      () => {
        setDebouncedSearch(
          search.trim()
        );

        setPage(1);
      },
      400
    );

    return () =>
      window.clearTimeout(timeout);
  }, [search]);

  // ===================================================
  // CONSULTAR USUARIOS
  // ===================================================

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadUsers() {
      setLoading(true);
      setError(null);

      try {
        const response =
          await getAdministrationUsers(
            {
              page,
              perPage: PER_PAGE,
              q: debouncedSearch,
              status:
                status === "all"
                  ? undefined
                  : status,
            },
            controller.signal
          );

        if (controller.signal.aborted) {
          return;
        }

        const nextLastPage =
          Math.max(
            1,
            response.meta.last_page
          );

        if (page > nextLastPage) {
          setPage(nextLastPage);
          return;
        }

        setUsers(response.data);
        setTotal(response.meta.total);
        setLastPage(nextLastPage);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setUsers([]);
        setTotal(0);
        setLastPage(1);

        if (
          err instanceof ApiError &&
          err.status === 403
        ) {
          setError(
            "No tienes permisos para consultar " +
              "los usuarios de esta organización."
          );
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible consultar los usuarios."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadUsers();

    return () => controller.abort();
  }, [
    page,
    status,
    debouncedSearch,
    refreshVersion,
  ]);

  // ===================================================
  // ACTUALIZAR LISTADO
  // ===================================================

  function refresh() {
    setRefreshVersion(
      (current) => current + 1
    );
  }

  // ===================================================
  // USUARIO MODIFICADO
  // ===================================================

  function handleUserSaved(
    updatedUser: AdministrationUser
  ) {
    setUsers((current) =>
      current.map((user) =>
        user.id === updatedUser.id
          ? updatedUser
          : user
      )
    );

    refresh();

    onChanged?.();
  }

  // ===================================================
  // INTERFAZ
  // ===================================================

  return (
    <Stack spacing={3}>
      {/* ENCABEZADO */}

      <Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: "#16324F",
          }}
        >
          Usuarios
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: "#81909D" }}
        >
          Consulta y administra los usuarios
          de la organización.
        </Typography>
      </Box>

      {/* FILTROS */}

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: {
            xs: "stretch",
            md: "center",
          },
        }}
      >
        <TextField
          fullWidth
          placeholder="Buscar usuario..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          slotProps={{
            input: {
              startAdornment: (
                <Search
                  sx={{
                    color: "#81909D",
                    mr: 1,
                  }}
                />
              ),
            },
            htmlInput: {
              maxLength: 100,
            },
          }}
          sx={{
            maxWidth: { md: 420 },
          }}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
        >
          <FormControl
            sx={{ minWidth: 190 }}
          >
            <InputLabel>
              Estado
            </InputLabel>

            <Select
              value={status}
              label="Estado"
              onChange={(event) => {
                setStatus(
                  event.target.value as StatusFilter
                );

                setPage(1);
              }}
            >
              <MenuItem value="all">
                Todos
              </MenuItem>

              <MenuItem value="active">
                Membresías activas
              </MenuItem>

              <MenuItem value="revoked">
                Membresías revocadas
              </MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={refresh}
            disabled={loading}
          >
            Actualizar
          </Button>
        </Stack>
      </Stack>

      {/* ERRORES */}

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

      {/* LISTADO */}

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
            Cargando usuarios...
          </Typography>
        </Stack>
      ) : !error ? (
        <>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            Usuarios encontrados: {total}
          </Typography>

          {users.length === 0 ? (
            <Alert severity="info">
              No se encontraron usuarios
              con los filtros seleccionados.
            </Alert>
          ) : (
            <Box
              sx={{
                overflowX: "auto",
                border: "1px solid #DCE6EE",
                borderRadius: 2,
              }}
            >
              <Box
                component="table"
                sx={{
                  width: "100%",
                  minWidth: 850,
                  borderCollapse: "collapse",

                  "& th": {
                    textAlign: "left",
                    backgroundColor: "#F4F7FA",
                    color: "#16324F",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    p: 2,
                    whiteSpace: "nowrap",
                  },

                  "& td": {
                    p: 2,
                    borderTop:
                      "1px solid #DCE6EE",
                    verticalAlign: "middle",
                  },
                }}
              >
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Plantas</th>
                    <th>Áreas</th>
                    <th>Roles</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      {/* USUARIO */}

                      <td>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: "#16324F",
                          }}
                        >
                          {user.name}
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{
                            color: "#81909D",
                          }}
                        >
                          {user.email}
                        </Typography>
                      </td>

                      {/* PLANTAS */}

                      <td>
                        <Typography
                          variant="body2"
                          sx={{
                            color:
                              user.locations.plants
                                .length === 0
                                ? "text.secondary"
                                : "#16324F",
                          }}
                        >
                          {user.locations.plants
                            .length > 0
                            ? user.locations.plants
                                .map(
                                  (plant) =>
                                    plant.name
                                )
                                .join(", ")
                            : "Sin plantas visibles"}
                        </Typography>
                      </td>

                      {/* ÁREAS */}

                      <td>
                        <Typography
                          variant="body2"
                          sx={{
                            color:
                              user.locations.areas
                                .length === 0
                                ? "text.secondary"
                                : "#16324F",
                          }}
                        >
                          {user.locations.areas
                            .length > 0
                            ? user.locations.areas
                                .map(
                                  (area) =>
                                    area.name
                                )
                                .join(", ")
                            : "Sin áreas visibles"}
                        </Typography>
                      </td>

                      {/* ROLES */}

                      <td>
                        {user.roles.length === 0 ? (
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                "text.secondary",
                            }}
                          >
                            Sin roles asignados
                          </Typography>
                        ) : (
                          <Stack
                            direction="row"
                            spacing={0.75}
                            useFlexGap
                            sx={{
                              flexWrap: "wrap",
                            }}
                          >
                            {user.roles.map(
                              (role) => (
                                <Chip
                                  key={role.id}
                                  label={
                                    role.status
                                      ? role.name
                                      : `${role.name} (inactivo)`
                                  }
                                  size="small"
                                  variant="outlined"
                                />
                              )
                            )}
                          </Stack>
                        )}
                      </td>

                      {/* ESTADO */}

                      <td>
                        <UserStatus user={user} />
                      </td>

                      {/* ACCIONES */}

                      <td>
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() =>
                            setSelectedUserId(
                              user.id
                            )
                          }
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Box>
          )}

          {lastPage > 1 && (
            <Stack
              sx={{
                alignItems: "center",
                pt: 1,
              }}
            >
              <Pagination
                count={lastPage}
                page={page}
                onChange={(_, value) =>
                  setPage(value)
                }
                color="primary"
                shape="rounded"
              />
            </Stack>
          )}
        </>
      ) : null}

      {/* ADMINISTRACIÓN DEL USUARIO */}

      {selectedUserId && (
        <UserManagementDialog
          key={`manage-user-${selectedUserId}`}
          userId={selectedUserId}
          onClose={() =>
            setSelectedUserId(null)
          }
          onSaved={handleUserSaved}
        />
      )}
    </Stack>
  );
}
