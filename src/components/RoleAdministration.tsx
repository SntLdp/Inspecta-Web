
import { useEffect, useRef, useState } from "react";

import {
    Alert,
    Checkbox,
    FormControlLabel,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Pagination,
    Select,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import {
    Security,
    Add,
    Edit,
    Search,
    Refresh,
    Visibility,
    CheckCircle,
    LockOutlined,
} from "@mui/icons-material";

import { ApiError } from "../api/client";

import {
    getAdministrationRoles,
    getAdministrationRole,
    getAdministrationPermissions,
    updateAdministrationRolePermissions,
    updateAdministrationRoleStatus,
} from "../services/roles.service";

import type {
    AdministrationRole,
    AdministrationPermission,
    AdministrationPermissionKey,
} from "../types/administration";

import RoleFormDialog from "./RoleFormDialog";

const PER_PAGE = 15;

type StatusFilter = "all" | "active" | "inactive";

// =====================================================
// NOMBRES DE PERMISOS
// =====================================================

const PERMISSION_LABELS: Record<
    AdministrationPermissionKey,
    string
> = {
    "plants.view": "Consultar ubicaciones",
    "locations.view_all": "Consultar todas las ubicaciones",
    "plants.manage": "Administrar ubicaciones",

    "users.manage": "Administrar usuarios",
    "roles.manage": "Administrar roles y permisos",
    "memberships.manage": "Administrar membresías",

    "checklists.view": "Consultar checklists",
    "checklists.manage": "Administrar checklists",

    "norms.view": "Consultar normativas",
    "norms.manage": "Administrar normativas",

    "inspections.manage": "Administrar inspecciones",
    "inspections.execute": "Ejecutar inspecciones",

    "findings.register": "Registrar incidencias",
    "findings.close": "Cerrar incidencias",

    "corrective_actions.manage":
        "Administrar acciones correctivas",

    "corrective_actions.verify":
        "Verificar acciones correctivas",

    "reports.view": "Consultar reportes",
    "reports.view_own": "Consultar reportes propios",
};

// =====================================================
// AGRUPACIÓN DE PERMISOS
// =====================================================

interface PermissionGroup {
    title: string;
    permissions: AdministrationPermissionKey[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
    {
        title: "Ubicaciones",
        permissions: [
            "plants.view",
            "locations.view_all",
            "plants.manage",
        ],
    },
    {
        title: "Administración",
        permissions: [
            "users.manage",
            "roles.manage",
            "memberships.manage",
        ],
    },
    {
        title: "Checklists",
        permissions: [
            "checklists.view",
            "checklists.manage",
        ],
    },
    {
        title: "Normativas",
        permissions: [
            "norms.view",
            "norms.manage",
        ],
    },
    {
        title: "Inspecciones",
        permissions: [
            "inspections.manage",
            "inspections.execute",
        ],
    },
    {
        title: "Incidencias",
        permissions: [
            "findings.register",
            "findings.close",
        ],
    },
    {
        title: "Acciones correctivas",
        permissions: [
            "corrective_actions.manage",
            "corrective_actions.verify",
        ],
    },
    {
        title: "Reportes",
        permissions: [
            "reports.view",
            "reports.view_own",
        ],
    },
];

// =====================================================
// TARJETA DE ROL
// =====================================================

interface RoleCardProps {
    role: AdministrationRole;
    onView: (roleId: string) => void;
    onEdit: (role: AdministrationRole) => void;
    canManage: boolean;
}

function RoleCard({
    role,
    onView,
    onEdit,
    canManage,
}: RoleCardProps) {
    return (
        <Card
            variant="outlined"
            sx={{
                height: "100%",
                boxShadow: "none",
            }}
        >
            <CardContent
                sx={{
                    height: "100%",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Box
                        sx={{
                            width: 42,
                            height: 42,
                            borderRadius: 2,
                            backgroundColor: "#E8F5F2",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Security
                            sx={{ color: "#0F9D8A" }}
                        />
                    </Box>

                    <Chip
                        label={`${role.users_count} usuarios`}
                        size="small"
                    />
                </Stack>

                <Typography
                    variant="h6"
                    sx={{
                        mt: 2,
                        fontWeight: 700,
                        color: "#16324F",
                    }}
                >
                    {role.name}
                </Typography>

                <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{
                        mt: 1,
                        flexWrap: "wrap",
                    }}
                >
                    <Chip
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
                        size="small"
                    />

                    {role.system_key && (
                        <Chip
                            label="Rol del sistema"
                            size="small"
                            variant="outlined"
                            icon={<LockOutlined />}
                        />
                    )}
                </Stack>

                <Typography
                    variant="body2"
                    sx={{
                        color: "#81909D",
                        mt: 2,
                        mb: 2,
                        flex: 1,
                    }}
                >
                    {role.description ||
                        "Sin descripción registrada."}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        color: "#16324F",
                    }}
                >
                    {role.permissions.length} permisos asignados
                </Typography>

                <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => onView(role.id)}
                    sx={{
                        mt: 2,
                        alignSelf: "flex-start",
                    }}
                >
                    Ver permisos
                </Button>
                {canManage && !role.system_key && (
                    <Button size="small" startIcon={<Edit />} onClick={() => onEdit(role)} sx={{ alignSelf: "flex-start" }}>
                        Editar rol
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

// =====================================================
// DIÁLOGO DE DETALLES
// =====================================================

interface RoleDetailsDialogProps {
    roleId: string | null;
    onClose: () => void;
    catalog: AdministrationPermission[] | null;
    onSaved: () => void;
}

function RoleDetailsDialog({
    roleId,
    onClose,
    catalog,
    onSaved,
}: RoleDetailsDialogProps) {
    const [role, setRole] =
        useState<AdministrationRole | null>(null);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [refreshVersion, setRefreshVersion] =
        useState(0);

    useEffect(() => {
        if (!roleId) {
            return;
        }

        const currentRoleId = roleId;
        const controller = new AbortController();

        async function loadRole() {
            setLoading(true);
            setError(null);
            setRole(null);

            try {
                const response =
                    await getAdministrationRole(
                        currentRoleId,
                        controller.signal
                    );

                if (!controller.signal.aborted) {
                    setRole(response.data);
                }
            } catch (err) {
                if (controller.signal.aborted) {
                    return;
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : "No fue posible consultar el rol."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadRole();

        return () => controller.abort();
    }, [roleId, refreshVersion]);

    const [selected, setSelected] = useState<AdministrationPermissionKey[]>([]);
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);
    const [confirmStatus, setConfirmStatus] = useState(false);
    const [permissionFeedback, setPermissionFeedback] = useState<{ severity: "success" | "error"; message: string } | null>(null);
    const [statusFeedback, setStatusFeedback] = useState<{ severity: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        setSelected(role?.permissions ?? []);
    }, [role]);

    const assignable = new Set(catalog?.filter(p => p.assignable).map(p => p.key) ?? []);
    const canManage = Boolean(role && !role.system_key && catalog && role.permissions.every(p => assignable.has(p)));
    const changed = Boolean(role && (selected.length !== role.permissions.length || selected.some(p => !role.permissions.includes(p))));

    async function savePermissions() {
        if (!role || !canManage || !changed || savingRef.current || selected.some(p => !assignable.has(p))) return;
        savingRef.current = true;
        setSaving(true);
        setPermissionFeedback(null);
        try {
            const response = await updateAdministrationRolePermissions(role.id, { permissions: selected });
            setRole(response.data);
            setSelected(response.data.permissions);
            setPermissionFeedback({ severity: "success", message: "Permisos actualizados correctamente." });
            onSaved();
        } catch (err) {
            setPermissionFeedback({ severity: "error", message: err instanceof Error ? err.message : "No fue posible guardar los permisos." });
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }

    async function saveStatus() {
        if (!role || !canManage || changed || savingRef.current || !confirmStatus) return;
        savingRef.current = true;
        setSaving(true);
        setStatusFeedback(null);
        try {
            const response = await updateAdministrationRoleStatus(role.id, { status: !role.status });
            setRole(response.data);
            setStatusFeedback({ severity: "success", message: response.data.status ? "Rol activado correctamente." : "Rol desactivado correctamente." });
            onSaved();
        } catch (err) {
            setStatusFeedback({ severity: "error", message: err instanceof Error ? err.message : "No fue posible cambiar el estado." });
        } finally {
            setConfirmStatus(false);
            savingRef.current = false;
            setSaving(false);
        }
    }

    function handleClose() {
        if (!savingRef.current && (!changed || !canManage)) onClose();
    }

    if (!roleId) return null;

    return (
        <Dialog
            open
            onClose={handleClose}
            fullWidth
            maxWidth="md"
        >
            <DialogTitle
                sx={{
                    fontWeight: 700,
                    color: "#16324F",
                }}
            >
                {role
                    ? `Permisos de ${role.name}`
                    : "Permisos del rol"}
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
                            sx={{ color: "text.secondary" }}
                        >
                            Cargando permisos...
                        </Typography>
                    </Stack>
                ) : error ? (
                    <Alert
                        severity="error"
                        action={
                            <Button
                                color="inherit"
                                size="small"
                                onClick={() =>
                                    setRefreshVersion(
                                        (current) => current + 1
                                    )
                                }
                            >
                                Reintentar
                            </Button>
                        }
                    >
                        {error}
                    </Alert>
                ) : role ? (
                    <Stack spacing={3}>
                        <Box>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: "text.secondary",
                                    mb: 2,
                                }}
                            >
                                {role.description ||
                                    "Sin descripción registrada."}
                            </Typography>

                            <Stack
                                direction="row"
                                spacing={1}
                                useFlexGap
                                sx={{ flexWrap: "wrap" }}
                            >
                                <Chip
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
                                    size="small"
                                />

                                <Chip
                                    label={`${role.users_count} usuarios`}
                                    size="small"
                                />

                                <Chip
                                    label={`${role.permissions.length} permisos`}
                                    size="small"
                                />

                                {role.system_key && (
                                    <Chip
                                        label="Rol del sistema"
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                            </Stack>
                        </Box>

                        <Divider />

                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 700 }}
                        >
                            Permisos asignados
                        </Typography>

                        {role.permissions.length === 0 ? (
                            <Alert severity="info">
                                Este rol no tiene permisos asignados.
                            </Alert>
                        ) : (
                            <Grid container spacing={2}>
                                {PERMISSION_GROUPS.map((group) => {
                                    const assigned =
                                        group.permissions.filter(
                                            (permission) =>
                                                role.permissions.includes(
                                                    permission
                                                )
                                        );

                                    if (assigned.length === 0) {
                                        return null;
                                    }

                                    return (
                                        <Grid
                                            key={group.title}
                                            size={{ xs: 12, sm: 6 }}
                                        >
                                            <Card
                                                variant="outlined"
                                                sx={{ height: "100%" }}
                                            >
                                                <CardContent>
                                                    <Typography
                                                        variant="subtitle2"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: "#16324F",
                                                            mb: 2,
                                                        }}
                                                    >
                                                        {group.title}
                                                    </Typography>

                                                    <Stack spacing={1.5}>
                                                        {assigned.map(
                                                            (permission) => (
                                                                <Stack
                                                                    key={permission}
                                                                    direction="row"
                                                                    spacing={1}
                                                                    sx={{
                                                                        alignItems:
                                                                            "flex-start",
                                                                    }}
                                                                >
                                                                    <CheckCircle
                                                                        fontSize="small"
                                                                        color="success"
                                                                    />

                                                                    <Box>
                                                                        <Typography
                                                                            variant="body2"
                                                                        >
                                                                            {
                                                                                PERMISSION_LABELS[
                                                                                permission
                                                                                ]
                                                                            }
                                                                        </Typography>

                                                                        <Typography
                                                                            variant="caption"
                                                                            sx={{
                                                                                color:
                                                                                    "text.secondary",
                                                                            }}
                                                                        >
                                                                            {permission}
                                                                        </Typography>
                                                                    </Box>
                                                                </Stack>
                                                            )
                                                        )}
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        )}

                        {role.system_key ? (
                            <Alert severity="info">Los roles del sistema están protegidos.</Alert>
                        ) : !canManage ? (
                            <Alert severity="info">No puedes modificar este rol con tus permisos actuales.</Alert>
                        ) : (
                            <>
                                <Divider />
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Configurar permisos</Typography>
                                {PERMISSION_GROUPS.map(group => (
                                    <Box key={group.title}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{group.title}</Typography>
                                        <Stack>
                                            {catalog?.filter(p => group.permissions.includes(p.key)).map(p => (
                                                <FormControlLabel key={p.key} control={<Checkbox checked={selected.includes(p.key)} disabled={saving || confirmStatus || !p.assignable} onChange={() => {
                                                    setPermissionFeedback(null);
                                                    setSelected(current => current.includes(p.key) ? current.filter(key => key !== p.key) : [...current, p.key]);
                                                }} />} label={`${PERMISSION_LABELS[p.key] ?? p.key}${p.assignable ? "" : " (No asignable)"}`} />
                                            ))}
                                        </Stack>
                                    </Box>
                                ))}
                                {catalog?.filter(p => !PERMISSION_GROUPS.some(g => g.permissions.includes(p.key))).map(p => (
                                    <FormControlLabel key={p.key} control={<Checkbox checked={selected.includes(p.key)} disabled={saving || confirmStatus || !p.assignable} onChange={() => {
                                        setPermissionFeedback(null);
                                        setSelected(current => current.includes(p.key) ? current.filter(key => key !== p.key) : [...current, p.key]);
                                    }} />} label={p.key} />
                                ))}
                                {permissionFeedback && <Alert severity={permissionFeedback.severity} onClose={() => setPermissionFeedback(null)}>{permissionFeedback.message}</Alert>}
                                <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end" }}>
                                    <Button disabled={!changed || saving} onClick={() => { setSelected(role.permissions); setPermissionFeedback(null); }}>Descartar cambios</Button>
                                    <Button variant="contained" disabled={!changed || saving || confirmStatus} onClick={() => void savePermissions()}>Guardar permisos</Button>
                                </Stack>
                                <Divider />
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Estado del rol</Typography>
                                <Alert severity="info">Desactivar un rol conserva sus asignaciones. El backend valida las restricciones de acceso.</Alert>
                                {statusFeedback && <Alert severity={statusFeedback.severity} onClose={() => setStatusFeedback(null)}>{statusFeedback.message}</Alert>}
                                {confirmStatus ? (
                                    <Stack spacing={2}>
                                        <Alert severity="warning">¿Confirmas que deseas {role.status ? "desactivar" : "activar"} este rol?</Alert>
                                        <Stack direction="row" spacing={2}>
                                            <Button disabled={saving} onClick={() => setConfirmStatus(false)}>Cancelar</Button>
                                            <Button variant="contained" color={role.status ? "error" : "success"} disabled={saving || changed} onClick={() => void saveStatus()}>{saving ? "Procesando..." : "Confirmar"}</Button>
                                        </Stack>
                                    </Stack>
                                ) : <Box><Button variant="outlined" color={role.status ? "error" : "success"} disabled={saving || changed} onClick={() => { setStatusFeedback(null); setConfirmStatus(true); }}>{role.status ? "Desactivar rol" : "Activar rol"}</Button></Box>}
                            </>
                        )}
                    </Stack>
                ) : null}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={handleClose} disabled={saving || (changed && canManage)}>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// =====================================================
// CATÁLOGO DE PERMISOS
// =====================================================

interface PermissionCatalogDialogProps {
    open: boolean;
    onClose: () => void;
}

function PermissionCatalogDialog({
    open,
    onClose,
}: PermissionCatalogDialogProps) {
    const [permissions, setPermissions] =
        useState<AdministrationPermission[]>([]);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [refreshVersion, setRefreshVersion] =
        useState(0);

    useEffect(() => {
        if (!open) {
            return;
        }

        const controller = new AbortController();

        async function loadPermissions() {
            setLoading(true);
            setError(null);
            setPermissions([]);

            try {
                const response =
                    await getAdministrationPermissions(
                        controller.signal
                    );

                if (!controller.signal.aborted) {
                    setPermissions(response.data);
                }
            } catch (err) {
                if (controller.signal.aborted) {
                    return;
                }

                if (
                    err instanceof ApiError &&
                    err.status === 403
                ) {
                    setError(
                        "No tienes permisos para consultar " +
                        "el catálogo de permisos."
                    );
                } else {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "No fue posible consultar los permisos."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadPermissions();

        return () => controller.abort();
    }, [open, refreshVersion]);

    if (!open) {
        return null;
    }

    return (
        <Dialog
            open
            onClose={onClose}
            fullWidth
            maxWidth="md"
        >
            <DialogTitle
                sx={{
                    fontWeight: 700,
                    color: "#16324F",
                }}
            >
                Catálogo de permisos
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
                            sx={{ color: "text.secondary" }}
                        >
                            Cargando catálogo...
                        </Typography>
                    </Stack>
                ) : error ? (
                    <Alert
                        severity="error"
                        action={
                            <Button
                                color="inherit"
                                size="small"
                                onClick={() =>
                                    setRefreshVersion(
                                        (current) => current + 1
                                    )
                                }
                            >
                                Reintentar
                            </Button>
                        }
                    >
                        {error}
                    </Alert>
                ) : (
                    <Stack spacing={3}>
                        <Typography
                            variant="body2"
                            sx={{ color: "text.secondary" }}
                        >
                            Permisos disponibles en INSPECTA:{" "}
                            {permissions.length}
                        </Typography>

                        <Alert severity="info">
                            La etiqueta Asignable indica que posees
                            ese permiso. Su asignación efectiva está
                            sujeta a las restricciones del sistema.
                        </Alert>

                        {permissions.length === 0 ? (
                            <Alert severity="info">
                                No se encontraron permisos.
                            </Alert>
                        ) : (
                            PERMISSION_GROUPS.map((group) => {
                                const items = permissions.filter(
                                    (permission) =>
                                        group.permissions.includes(
                                            permission.key
                                        )
                                );

                                if (items.length === 0) {
                                    return null;
                                }

                                return (
                                    <Box key={group.title}>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                fontWeight: 700,
                                                color: "#16324F",
                                                mb: 1.5,
                                            }}
                                        >
                                            {group.title}
                                        </Typography>

                                        <Stack spacing={1}>
                                            {items.map((permission) => (
                                                <Box
                                                    key={permission.key}
                                                    sx={{
                                                        border: "1px solid",
                                                        borderColor: "divider",
                                                        borderRadius: 2,
                                                        p: 1.5,
                                                    }}
                                                >
                                                    <Stack
                                                        direction="row"
                                                        spacing={2}
                                                        sx={{
                                                            justifyContent:
                                                                "space-between",
                                                            alignItems: "center",
                                                        }}
                                                    >
                                                        <Box>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                {
                                                                    PERMISSION_LABELS[
                                                                    permission.key
                                                                    ]
                                                                }
                                                            </Typography>

                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color:
                                                                        "text.secondary",
                                                                }}
                                                            >
                                                                {permission.key}
                                                            </Typography>
                                                        </Box>

                                                        <Chip
                                                            label={
                                                                permission.assignable
                                                                    ? "Asignable"
                                                                    : "No asignable"
                                                            }
                                                            size="small"
                                                            color={
                                                                permission.assignable
                                                                    ? "success"
                                                                    : "default"
                                                            }
                                                        />
                                                    </Stack>
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Box>
                                );
                            })
                        )}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose}>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function RoleAdministration() {
    const [roles, setRoles] =
        useState<AdministrationRole[]>([]);

    const [search, setSearch] = useState("");

    const [debouncedSearch, setDebouncedSearch] =
        useState("");

    const [status, setStatus] =
        useState<StatusFilter>("all");

    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    const [refreshVersion, setRefreshVersion] =
        useState(0);

    const [selectedRoleId, setSelectedRoleId] =
        useState<string | null>(null);

    const [catalogOpen, setCatalogOpen] = useState(false);
    const [catalog, setCatalog] = useState<AdministrationPermission[] | null>(null);
    const [form, setForm] = useState<{ role?: AdministrationRole } | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        getAdministrationPermissions(controller.signal).then(response => {
            if (!controller.signal.aborted) setCatalog(response.data);
        }).catch(() => {
            if (!controller.signal.aborted) setCatalog(null);
        });
        return () => controller.abort();
    }, [refreshVersion]);

    // ===================================================
    // BÚSQUEDA
    // ===================================================

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 400);

        return () => window.clearTimeout(timeout);
    }, [search]);

    // ===================================================
    // CONSULTAR ROLES
    // ===================================================

    useEffect(() => {
        const controller = new AbortController();

        async function loadRoles() {
            setLoading(true);
            setError(null);

            try {
                const response =
                    await getAdministrationRoles(
                        {
                            page,
                            perPage: PER_PAGE,
                            q: debouncedSearch,
                            status:
                                status === "all"
                                    ? undefined
                                    : status === "active",
                        },
                        controller.signal
                    );

                if (controller.signal.aborted) {
                    return;
                }

                const nextLastPage = Math.max(
                    1,
                    response.meta.last_page
                );

                if (page > nextLastPage) {
                    setPage(nextLastPage);
                    return;
                }

                setRoles(response.data);
                setTotal(response.meta.total);
                setLastPage(nextLastPage);
            } catch (err) {
                if (controller.signal.aborted) {
                    return;
                }

                setRoles([]);
                setTotal(0);
                setLastPage(1);

                if (
                    err instanceof ApiError &&
                    err.status === 403
                ) {
                    setError(
                        "No tienes permisos para consultar " +
                        "los roles de esta organización."
                    );
                } else {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "No fue posible consultar los roles."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadRoles();

        return () => controller.abort();
    }, [
        page,
        status,
        debouncedSearch,
        refreshVersion,
    ]);

    function refresh() {
        setRefreshVersion(
            (current) => current + 1
        );
    }

    // ===================================================
    // INTERFAZ
    // ===================================================

    return (
        <Stack spacing={3}>
            {/* ENCABEZADO */}

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
                <Box>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 700,
                            color: "#16324F",
                        }}
                    >
                        Roles y permisos
                    </Typography>

                    <Typography
                        variant="body2"
                        sx={{ color: "#81909D" }}
                    >
                        Consulta los roles de la organización
                        y sus niveles de acceso.
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                {catalog !== null && <Button variant="contained" startIcon={<Add />} onClick={() => setForm({})}>Nuevo rol</Button>}
                <Button
                    variant="outlined"
                    startIcon={<Security />}
                    onClick={() => setCatalogOpen(true)}
                >
                    Catálogo de permisos
                </Button>
                </Stack>
            </Stack>

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
                    placeholder="Buscar rol..."
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
                    <FormControl sx={{ minWidth: 180 }}>
                        <InputLabel>Estado</InputLabel>

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
                                Activos
                            </MenuItem>

                            <MenuItem value="inactive">
                                Inactivos
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

            {feedback && <Alert severity="success" onClose={() => setFeedback(null)}>{feedback}</Alert>}

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
                        sx={{ color: "text.secondary" }}
                    >
                        Cargando roles...
                    </Typography>
                </Stack>
            ) : !error ? (
                <>
                    <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                    >
                        Roles encontrados: {total}
                    </Typography>

                    {roles.length === 0 ? (
                        <Alert severity="info">
                            No se encontraron roles con
                            los filtros seleccionados.
                        </Alert>
                    ) : (
                        <Grid container spacing={2}>
                            {roles.map((role) => (
                                <Grid
                                    key={role.id}
                                    size={{ xs: 12, sm: 6, md: 4 }}
                                >
                                    <RoleCard
                                        role={role}
                                        onView={setSelectedRoleId}
                                        canManage={catalog !== null && role.permissions.every(p => catalog.some(item => item.key === p && item.assignable))}
                                        onEdit={(item) => setForm({ role: item })}
                                    />
                                </Grid>
                            ))}
                        </Grid>
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

            {/* DETALLES DEL ROL */}

            <RoleDetailsDialog
                key={`role-details-${selectedRoleId ?? "closed"}`}
                roleId={selectedRoleId}
                catalog={catalog}
                onSaved={refresh}
                onClose={() =>
                    setSelectedRoleId(null)
                }
            />

            {form && <RoleFormDialog role={form.role} onClose={() => setForm(null)} onSaved={(_, message) => { setForm(null); setFeedback(message); refresh(); }} />}

            {/* CATÁLOGO DE PERMISOS */}

            <PermissionCatalogDialog
                key={`permission-catalog-${catalogOpen ? "open" : "closed"}`}
                open={catalogOpen}
                onClose={() =>
                    setCatalogOpen(false)
                }
            />
        </Stack>
    );
}
