import {
  useState,
} from "react";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import {
  AdminPanelSettings,
  Business,
  CheckCircle,
  ExpandMore,
  Groups,
  Lock,
  Search,
  Security,
} from "@mui/icons-material";

import {
  PROFILE_PERMISSION_GROUPS,
  KNOWN_PROFILE_PERMISSION_KEYS,
} from "../../constants/profilePermissions";

import type {
  ProfileMembership,
} from "../../types/profile.types";

/* =====================================================
   TIPOS
   ===================================================== */

interface ProfileOrganizationAccessProps {
  membership: ProfileMembership;
}

interface SummaryCardProps {
  label: string;
  value: number;
}

/* =====================================================
   NORMALIZAR BÚSQUEDA
   ===================================================== */

function normalizeSearch(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* =====================================================
   TARJETA DE RESUMEN
   ===================================================== */

function SummaryCard({
  label,
  value,
}: SummaryCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: "100%",
        borderColor: "#DCE6EE",
        bgcolor: "#F8FAFC",
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
          mt: 1,
          color: "#16324F",
          fontWeight: 700,
        }}
      >
        {value}
      </Typography>
    </Paper>
  );
}

/* =====================================================
   COMPONENTE PRINCIPAL
   ===================================================== */

export default function ProfileOrganizationAccess({
  membership,
}: ProfileOrganizationAccessProps) {
  const [search, setSearch] =
    useState("");

  const [
    showUnassignedPermissions,
    setShowUnassignedPermissions,
  ] = useState(false);

  /* ===================================================
     INFORMACIÓN DE MEMBRESÍA
     =================================================== */

  const organization =
    membership.organization;

  const membershipActive =
    membership.membership.status === "active";

  const activeRoles =
    membership.roles.filter(
      (role) => role.status
    );

  const inactiveRoles =
    membership.roles.filter(
      (role) => !role.status
    );

  const sortedRoles = [
    ...activeRoles,
    ...inactiveRoles,
  ];

  /* ===================================================
     PERMISOS EFECTIVOS
     =================================================== */

  const effectivePermissions =
    new Set<string>(
      membership.permissions
    );

  const unknownPermissions =
    Array.from(effectivePermissions)
      .filter(
        (permission) =>
          !KNOWN_PROFILE_PERMISSION_KEYS.has(
            permission
          )
      )
      .sort();

  const normalizedSearch =
    normalizeSearch(search);

  /* ===================================================
     FILTRAR PERMISOS
     =================================================== */

  const visibleGroups =
    PROFILE_PERMISSION_GROUPS.map(
      (group) => {
        const groupMatches =
          normalizeSearch(group.label)
            .includes(normalizedSearch);

        const permissions =
          group.permissions.filter(
            (permission) => {
              const granted =
                effectivePermissions.has(
                  permission.key
                );

              if (
                !showUnassignedPermissions &&
                !granted
              ) {
                return false;
              }

              const matchesSearch =
                !normalizedSearch ||
                groupMatches ||
                normalizeSearch(
                  permission.label
                ).includes(normalizedSearch) ||
                normalizeSearch(
                  permission.key
                ).includes(normalizedSearch) ||
                normalizeSearch(
                  permission.description
                ).includes(normalizedSearch);

              return matchesSearch;
            }
          );

        const grantedCount =
          group.permissions.filter(
            (permission) =>
              effectivePermissions.has(
                permission.key
              )
          ).length;

        return {
          ...group,
          permissions,
          grantedCount,
          totalCount:
            group.permissions.length,
        };
      }
    ).filter(
      (group) =>
        group.permissions.length > 0
    );

  const visibleUnknownPermissions =
    unknownPermissions.filter(
      (permission) =>
        !normalizedSearch ||
        normalizeSearch(permission)
          .includes(normalizedSearch)
    );

  const hasVisiblePermissions =
    visibleGroups.length > 0 ||
    visibleUnknownPermissions.length > 0;

  /* ===================================================
     INTERFAZ
     =================================================== */

  return (
    <Stack spacing={3}>
      {/* ENCABEZADO */}

      <Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: "#16324F",
          }}
        >
          Accesos organizacionales
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "#81909D",
            mt: 0.5,
          }}
        >
          Consulta los roles y permisos asociados
          a tu membresía en la organización actual.
        </Typography>
      </Box>

      <Divider />

      {/* ORGANIZACIÓN ACTIVA */}

      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderColor: "#DCE6EE",
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
            <Business
              sx={{
                fontSize: 30,
                color: "#16324F",
              }}
            />
          </Box>

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
              Organización activa
            </Typography>

            <Typography
              variant="h6"
              sx={{
                color: "#16324F",
                fontWeight: 600,
                overflowWrap: "anywhere",
              }}
            >
              {organization.name}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                overflowWrap: "anywhere",
              }}
            >
              Código: {organization.code}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              Organización cliente
            </Typography>
          </Box>

          <Chip
            size="small"
            label={
              organization.status
                ? "Organización activa"
                : "Organización inactiva"
            }
            color={
              organization.status
                ? "success"
                : "default"
            }
            variant="outlined"
          />
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* ESTADO DE MEMBRESÍA */}

        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: {
              xs: "flex-start",
              sm: "center",
            },
          }}
        >
          <Box>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: "#16324F",
              }}
            >
              Estado de membresía
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              Relación de tu cuenta con esta
              organización.
            </Typography>
          </Box>

          <Chip
            size="small"
            icon={
              membershipActive
                ? <CheckCircle />
                : <Lock />
            }
            label={
              membershipActive
                ? "Membresía activa"
                : "Membresía no activa"
            }
            color={
              membershipActive
                ? "success"
                : "default"
            }
          />
        </Stack>
      </Paper>

      {/* RESUMEN DE ACCESOS */}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryCard
            label="Roles asignados"
            value={membership.roles.length}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryCard
            label="Roles activos"
            value={activeRoles.length}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryCard
            label="Permisos efectivos"
            value={effectivePermissions.size}
          />
        </Grid>
      </Grid>

      {/* ROLES ASIGNADOS */}

      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
          }}
        >
          <Groups
            sx={{
              color: "#16324F",
            }}
          />

          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              color: "#16324F",
            }}
          >
            Roles asignados
          </Typography>
        </Stack>

        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
          }}
        >
          Los roles determinan los permisos que
          puedes recibir dentro de esta organización.
          Los roles inactivos no conceden permisos.
        </Typography>

        {sortedRoles.length === 0 ? (
          <Alert severity="info">
            No tienes roles asignados en
            esta organización.
          </Alert>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              borderColor: "#DCE6EE",
              overflow: "hidden",
            }}
          >
            {sortedRoles.map(
              (role, index) => (
                <Box key={role.id}>
                  {index > 0 && <Divider />}

                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{
                      p: 2,
                      alignItems: "center",
                    }}
                  >
                    <AdminPanelSettings
                      sx={{
                        color: role.status
                          ? "#16324F"
                          : "text.disabled",
                      }}
                    />

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
                          color: role.status
                            ? "#16324F"
                            : "text.secondary",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {role.name}
                      </Typography>

                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                        }}
                      >
                        {role.status
                          ? "Rol habilitado"
                          : "No concede permisos"}
                      </Typography>
                    </Box>

                    <Chip
                      size="small"
                      label={
                        role.status
                          ? "Activo"
                          : "Inactivo"
                      }
                      color={
                        role.status
                          ? "success"
                          : "default"
                      }
                      variant="outlined"
                    />
                  </Stack>
                </Box>
              )
            )}
          </Paper>
        )}

        {activeRoles.length === 0 &&
          sortedRoles.length > 0 && (
            <Alert severity="warning">
              Tienes roles asignados, pero
              ninguno se encuentra activo.
            </Alert>
          )}
      </Stack>

      <Divider />

      {/* PERMISOS EFECTIVOS */}

      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
          }}
        >
          <Security
            sx={{
              color: "#16324F",
            }}
          />

          <Typography
            variant="subtitle1"
            sx={{
              color: "#16324F",
              fontWeight: 600,
            }}
          >
            Permisos efectivos
          </Typography>
        </Stack>

        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
          }}
        >
          Estos son los permisos que tu cuenta
          tiene concedidos en la organización
          seleccionada.
        </Typography>

        {effectivePermissions.size === 0 && (
          <Alert severity="info">
            Actualmente no tienes permisos
            efectivos en esta organización.
          </Alert>
        )}

        {/* FILTROS */}

        <Stack
          direction={{
            xs: "column",
            md: "row",
          }}
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
            size="small"
            fullWidth
            label="Buscar permisos"
            placeholder="Nombre, módulo o clave"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            sx={{
              maxWidth: {
                md: 380,
              },
            }}
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

          <FormControlLabel
            control={
              <Switch
                checked={
                  showUnassignedPermissions
                }
                onChange={(event) =>
                  setShowUnassignedPermissions(
                    event.target.checked
                  )
                }
              />
            }
            label="Mostrar permisos no concedidos"
          />
        </Stack>

        {/* GRUPOS DE PERMISOS */}

        {visibleGroups.map(
          (group) => (
            <Accordion
              key={group.id}
              defaultExpanded
              disableGutters
              elevation={0}
              sx={{
                border: "1px solid #DCE6EE",
                borderRadius: "8px !important",
                overflow: "hidden",
                "&::before": {
                  display: "none",
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                id={`profile-permissions-${group.id}`}
                aria-controls={
                  `profile-permissions-content-${group.id}`
                }
                sx={{
                  bgcolor: "#F8FAFC",
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    width: "100%",
                    pr: 1,
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#16324F",
                      fontWeight: 600,
                    }}
                  >
                    {group.label}
                  </Typography>

                  <Chip
                    size="small"
                    variant="outlined"
                    label={
                      `${group.grantedCount} / ${group.totalCount}`
                    }
                    color={
                      group.grantedCount > 0
                        ? "primary"
                        : "default"
                    }
                  />
                </Stack>
              </AccordionSummary>

              <AccordionDetails
                sx={{ p: 0 }}
              >
                {group.permissions.map(
                  (permission, index) => {
                    const granted =
                      effectivePermissions.has(
                        permission.key
                      );

                    return (
                      <Box
                        key={permission.key}
                      >
                        {index > 0 && (
                          <Divider />
                        )}

                        <Stack
                          direction="row"
                          spacing={2}
                          sx={{
                            p: 2,
                            alignItems: "flex-start",
                          }}
                        >
                          {granted ? (
                            <CheckCircle
                              sx={{
                                color: "success.main",
                                fontSize: 20,
                                mt: 0.25,
                              }}
                            />
                          ) : (
                            <Lock
                              sx={{
                                color: "text.disabled",
                                fontSize: 20,
                                mt: 0.25,
                              }}
                            />
                          )}

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
                                color: granted
                                  ? "#16324F"
                                  : "text.secondary",
                              }}
                            >
                              {permission.label}
                            </Typography>

                            <Typography
                              variant="body2"
                              sx={{
                                color: "text.secondary",
                                mt: 0.5,
                              }}
                            >
                              {permission.description}
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                mt: 0.5,
                                color: "text.secondary",
                                fontFamily: "monospace",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {permission.key}
                            </Typography>
                          </Box>

                          <Chip
                            size="small"
                            label={
                              granted
                                ? "Concedido"
                                : "No concedido"
                            }
                            color={
                              granted
                                ? "success"
                                : "default"
                            }
                            variant="outlined"
                            sx={{
                              flexShrink: 0,
                            }}
                          />
                        </Stack>
                      </Box>
                    );
                  }
                )}
              </AccordionDetails>
            </Accordion>
          )
        )}

        {/* PERMISOS NO INCLUIDOS EN EL CATÁLOGO */}

        {visibleUnknownPermissions.length > 0 && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderColor: "#DCE6EE",
            }}
          >
            <Stack spacing={2}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: "#16324F",
                  fontWeight: 600,
                }}
              >
                Otros permisos
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                }}
              >
                Permisos reconocidos por el servidor
                que todavía no tienen una descripción
                en el catálogo de esta aplicación.
              </Typography>

              {visibleUnknownPermissions.map(
                (permission) => (
                  <Stack
                    key={permission}
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: "center",
                    }}
                  >
                    <CheckCircle
                      sx={{
                        fontSize: 18,
                        color: "success.main",
                      }}
                    />

                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        fontFamily: "monospace",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {permission}
                    </Typography>

                    <Chip
                      label="Concedido"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  </Stack>
                )
              )}
            </Stack>
          </Paper>
        )}

        {/* SIN RESULTADOS */}

        {!hasVisiblePermissions && (
          <Alert severity="info">
            {normalizedSearch
              ? "No se encontraron permisos que coincidan con la búsqueda."
              : "No hay permisos concedidos para mostrar."}
          </Alert>
        )}
      </Stack>

      <Divider />

      {/* INFORMACIÓN DE SEGURIDAD */}

      <Alert severity="info">
        Los roles y permisos son administrados por
        los usuarios autorizados de tu organización.
        Algunos permisos requieren condiciones
        adicionales o están sujetos al alcance de
        las ubicaciones asignadas. No puedes modificar
        tus accesos desde este apartado.
      </Alert>
    </Stack>
  );
}