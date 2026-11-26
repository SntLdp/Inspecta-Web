import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getIncident, type Incident } from "../services/incidents.service";
import { getCorrectiveActions, getCorrectiveAction, recordCorrectiveActionUpdate, type CorrectiveAction, type CorrectiveActionDetail, type CorrectiveActionStatus, type CorrectiveActionPriority } from "../services/correctiveActions.service";
import { apiRequest } from "../api/client";
import type { ApiResponse } from "../types/inspections";

const NAVY = "#16324F";
const GREEN = "#0F9D8A";
const STATUS: Record<CorrectiveActionStatus, string> = { pending: "Pendiente", in_progress: "En proceso", completed: "Completada", verified: "Verificada" };
const PRIORITY: Record<CorrectiveActionPriority, string> = { low: "Baja", medium: "Media", high: "Alta", critical: "Crítica" };
const NEXT: Partial<Record<CorrectiveActionStatus, Exclude<CorrectiveActionStatus, "pending">>> = { pending: "in_progress", in_progress: "completed", completed: "verified" };

function overdue(action: CorrectiveAction): boolean {
  return Boolean(action.due_date && action.due_date < new Date().toLocaleDateString("en-CA") && !["completed", "verified"].includes(action.status));
}
function dateText(value?: string | null): string {
  if (!value) return "Sin fecha";
  const d = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function errorText(error: unknown): string { return error instanceof Error ? error.message : "No fue posible completar la solicitud."; }
function statusColor(status: CorrectiveActionStatus): "warning" | "info" | "success" { return status === "pending" ? "warning" : status === "in_progress" ? "info" : "success"; }
function priorityColor(priority: CorrectiveActionPriority): "info" | "warning" | "error" { return priority === "low" ? "info" : priority === "medium" ? "warning" : "error"; }
function SummaryCard({ title, value, icon, color, description }: { title: string; value: number; icon: ReactNode; color: string; description: string }) {
  return <Card sx={{ flex: 1, minWidth: 180, borderRadius: 3, boxShadow: "none" }}><CardContent sx={{ p: 2.5 }}><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Box><Typography sx={{ fontSize: 13, color: "text.secondary" }}>{title}</Typography><Typography sx={{ fontSize: 29, fontWeight: 700, color: NAVY }}>{value}</Typography><Typography sx={{ fontSize: 12, color: "text.secondary" }}>{description}</Typography></Box><Box sx={{ width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", color, bgcolor: `${color}18` }}>{icon}</Box></Box></CardContent></Card>;
}

export default function AccionesCorrectivas() {
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [incidents, setIncidents] = useState<Record<string, Incident>>({});
  const [areas, setAreas] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CorrectiveActionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [comment, setComment] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  async function loadActions() {
    setLoading(true); setError("");
    try {
      const first = await getCorrectiveActions({ perPage: 100 });
      const all = [...first.data];
      for (let p = 2; p <= first.meta.last_page; p++) {
        const next = await getCorrectiveActions({ page: p, perPage: 100 });
        all.push(...next.data);
      }
      setActions(all);
      const ids = [...new Set(all.map(a => a.incident_id))];
      const results = await Promise.allSettled(ids.map(id => getIncident(id)));
      const incidentMap: Record<string, Incident> = {};
      results.forEach((r, i) => { if (r.status === "fulfilled") incidentMap[ids[i]] = r.value.data; });
      setIncidents(incidentMap);
      const areaIds = [...new Set(Object.values(incidentMap).map(i => i.area_id))];
      const areaResults = await Promise.allSettled(areaIds.map(id => apiRequest<ApiResponse<{ name: string }>>(`/areas/${encodeURIComponent(id)}`, { method: "GET" })));
      const areaMap: Record<string, string> = {};
      areaResults.forEach((r, i) => { if (r.status === "fulfilled") areaMap[areaIds[i]] = r.value.data.name; });
      setAreas(areaMap);
    } catch (e) { setError(errorText(e)); setActions([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadActions(); }, []);
  useEffect(() => {
    let active = true;
    setDetail(null); setDetailError(""); setSuccessMessage(""); setComment(""); setConfirm(false);
    if (!selectedId) return () => { active = false; };
    setDetailLoading(true);
    getCorrectiveAction(selectedId).then(r => { if (active) setDetail(r.data); }).catch(e => { if (active) setDetailError(errorText(e)); }).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  const summary = useMemo(() => ({ total: actions.length, pending: actions.filter(a => a.status === "pending").length, progress: actions.filter(a => a.status === "in_progress").length, completed: actions.filter(a => a.status === "completed").length, verified: actions.filter(a => a.status === "verified").length, overdue: actions.filter(overdue).length }), [actions]);
  const filtered = useMemo(() => actions.filter(a => {
    const incident = incidents[a.incident_id];
    const area = incident ? areas[incident.area_id] ?? "" : "";
    const term = search.trim().toLowerCase();
    const matches = !term || [a.id, a.description, a.incident_id, incident?.title ?? "", area, a.assigned_to].some(s => s.toLowerCase().includes(term));
    return matches && (filterStatus === "all" || (filterStatus === "overdue" ? overdue(a) : a.status === filterStatus)) && (filterPriority === "all" || a.priority === filterPriority);
  }), [actions, incidents, areas, search, filterStatus, filterPriority]);

  async function changeStatus() {
    if (!detail) return;

    const next = NEXT[detail.status];

    if (!next) return;

    setSaving(true);
    setDetailError("");
    setSuccessMessage("");

    try {
      await recordCorrectiveActionUpdate(
        detail.id,
        next,
        comment.trim() || null
      );

      const refreshed = await getCorrectiveAction(detail.id);

      setDetail(refreshed.data);

      setActions(old =>
        old.map(a =>
          a.id === detail.id ? refreshed.data : a
        )
      );

      setComment("");
      setConfirm(false);

      setSuccessMessage(
        `Estado actualizado a ${STATUS[next]}.`
      );

    } catch (e) {
      const message = errorText(e);

      const forbidden =
        /403|forbidden|no tienes permiso|no autorizado/i.test(message);

      if (forbidden && next === "verified") {
        setDetailError(
          "No tienes autorización para verificar esta acción correctiva. " +
          "La verificación debe realizarla un usuario autorizado que no sea " +
          "el responsable asignado ni quien registró su finalización."
        );
      } else if (forbidden) {
        setDetailError(
          "No tienes los permisos necesarios para registrar este avance."
        );
      } else {
        setDetailError(message);
      }

      console.error("Error al registrar avance:", e);

    } finally {
      setSaving(false);
    }
  }

  async function generatePDF() {
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(22, 50, 79);
      doc.text("INSPECTA | Reporte de acciones correctivas", 14, 18);
      doc.setFontSize(9); doc.text(`Generado: ${new Date().toLocaleString("es-MX")} | Registros: ${filtered.length}`, 14, 26);
      autoTable(doc, {
        startY: 34,
        head: [["Acción (ID)", "Descripción", "Incidencia", "Prioridad", "Responsable (ID)", "Área", "Fecha límite", "Estado"]],
        body: filtered.map(a => { const inc = incidents[a.incident_id]; return [a.id, a.description, inc?.title ?? a.incident_id, PRIORITY[a.priority], a.assignee_name || "Nombre no disponible", inc ? areas[inc.area_id] ?? inc.area_id : "No disponible", dateText(a.due_date), `${STATUS[a.status]}${overdue(a) ? " (Vencida)" : ""}`]; }),
        theme: "grid", headStyles: { fillColor: [22, 50, 79] }, styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" }, margin: { left: 14, right: 14 },
      });
      doc.save(`INSPECTA_Acciones_Correctivas_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) { setError(errorText(e)); }
    finally { setExporting(false); }
  }

  const selectedIncident = detail ? incidents[detail.incident_id] : undefined;
  const selectedArea = selectedIncident ? areas[selectedIncident.area_id] ?? selectedIncident.area_id : "No disponible";
  const next = detail ? NEXT[detail.status] : undefined;

  return <Box sx={{ width: "100%" }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 4 }}>
      <Box><Typography sx={{ color: GREEN, fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>GESTIÓN OPERATIVA</Typography><Typography variant="h4" sx={{ color: NAVY, fontWeight: 800, mt: 0.5 }}>Acciones correctivas</Typography><Typography sx={{ color: "text.secondary", fontSize: 14, mt: 0.5 }}>Seguimiento y control de las medidas derivadas de incidencias.</Typography></Box>
      <Button variant="contained" startIcon={<PictureAsPdfIcon />} disabled={loading || exporting || !filtered.length} onClick={() => void generatePDF()} sx={{ bgcolor: GREEN, "&:hover": { bgcolor: "#0B8171" }, whiteSpace: "nowrap", textTransform: "none", fontWeight: 700, py: 1.5, px: 2.5 }}>{exporting ? "Generando..." : "Generar PDF"}</Button>
    </Box>
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
      <SummaryCard title="Total" value={summary.total} icon={<AssignmentTurnedInIcon />} color={NAVY} description="Acciones accesibles" />
      <SummaryCard title="Pendientes" value={summary.pending} icon={<PendingActionsIcon />} color="#C28B00" description="Sin iniciar" />
      <SummaryCard title="En proceso" value={summary.progress} icon={<AutorenewIcon />} color="#2673C9" description="En atención" />
      <SummaryCard title="Completadas" value={summary.completed} icon={<CheckCircleIcon />} color="#16803C" description="Por verificar" />
      <SummaryCard title="Vencidas" value={summary.overdue} icon={<WarningAmberIcon />} color="#B42318" description="Fuera de plazo" />
    </Box>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Card sx={{ borderRadius: 3, boxShadow: "none", mb: 2 }}><CardContent sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
      <TextField size="small" fullWidth sx={{ flex: "1 1 350px" }} placeholder="Buscar por ID, acción, incidencia, área o responsable..." value={search} onChange={e => setSearch(e.target.value)} slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} /> } }} />
      <FormControl size="small" sx={{ minWidth: 190 }}><InputLabel>Estado</InputLabel><Select label="Estado" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><MenuItem value="all">Todos los estados</MenuItem>{Object.entries(STATUS).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}<MenuItem value="overdue">Vencidas</MenuItem></Select></FormControl>
      <FormControl size="small" sx={{ minWidth: 170 }}><InputLabel>Prioridad</InputLabel><Select label="Prioridad" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}><MenuItem value="all">Todas</MenuItem>{Object.entries(PRIORITY).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</Select></FormControl>
    </CardContent></Card>
    <Card sx={{ borderRadius: 3, boxShadow: "none" }}><Box sx={{ overflowX: "auto" }}><Box sx={{ minWidth: 1100 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "190px minmax(230px, 1fr) 170px 150px 100px 130px 110px 100px", gap: 2, p: 2, bgcolor: "#F4F7FA" }}>{["ID", "Acción correctiva", "Incidencia", "Responsable", "Prioridad", "Fecha límite", "Estado", "Detalle"].map(h => <Typography key={h} sx={{ fontWeight: 700, fontSize: 12, color: NAVY }}>{h}</Typography>)}</Box>
      <Divider />
      {loading ? <Box sx={{ p: 5, textAlign: "center" }}><CircularProgress /></Box> : filtered.length === 0 ? <Typography sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>No se encontraron acciones correctivas.</Typography> : filtered.map(a => <Box key={a.id}><Box sx={{ display: "grid", gridTemplateColumns: "190px minmax(230px, 1fr) 170px 150px 100px 130px 110px 100px", gap: 2, alignItems: "center", p: 2 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: NAVY, overflowWrap: "anywhere" }}>{a.id}</Typography>
        <Typography sx={{ fontSize: 13 }}>{a.description}</Typography>
        <Typography sx={{ fontSize: 12 }}>{incidents[a.incident_id]?.title ?? a.incident_id}</Typography>
        <Typography sx={{ fontSize: 12, overflowWrap: "anywhere" }}>{(a.assignee_name || "Nombre no disponible")}</Typography>
        <Chip size="small" label={PRIORITY[a.priority]} color={priorityColor(a.priority)} variant="outlined" />
        <Typography sx={{ fontSize: 12, color: overdue(a) ? "error.main" : "text.primary" }}>{dateText(a.due_date)}{overdue(a) ? " · Vencida" : ""}</Typography>
        <Chip size="small" label={STATUS[a.status]} color={statusColor(a.status)} />
        <Button size="small" startIcon={<VisibilityIcon />} sx={{ textTransform: "none", color: NAVY }} onClick={() => setSelectedId(a.id)}>Ver</Button>
      </Box><Divider /></Box>)}
    </Box></Box><Box sx={{ p: 2, color: "text.secondary", fontSize: 12 }}>Mostrando {filtered.length} de {actions.length} acciones · Verificadas: {summary.verified}</Box></Card>
    <Dialog
  open={confirm}
  onClose={() => {
    if (!saving) {
      setConfirm(false);
      setDetailError("");
    }
  }}
  maxWidth="xs"
  fullWidth
>
  <DialogTitle>
    Confirmar cambio de estado
  </DialogTitle>

  <DialogContent>
    <Typography>
      ¿Deseas cambiar esta acción a{" "}
      {next ? STATUS[next] : "el siguiente estado"}?
    </Typography>

    <Typography
      sx={{
        mt: 1,
        color: "text.secondary",
        fontSize: 13
      }}
    >
      El avance quedará registrado en el historial de la acción.
    </Typography>

    {next === "verified" && (
      <Alert severity="info" sx={{ mt: 2 }}>
        La verificación debe realizarla un usuario autorizado
        e independiente del responsable y de quien completó
        la acción.
      </Alert>
    )}

    {detailError && (
      <Alert severity="error" sx={{ mt: 2 }}>
        {detailError}
      </Alert>
    )}
  </DialogContent>

  <DialogActions>
    <Button
      disabled={saving}
      onClick={() => {
        setConfirm(false);
        setDetailError("");
      }}
    >
      {detailError ? "Cerrar" : "Cancelar"}
    </Button>

    <Button
      variant="contained"
      disabled={saving}
      onClick={() => void changeStatus()}
      sx={{ bgcolor: GREEN }}
    >
      {saving ? "Guardando..." : "Confirmar cambio"}
    </Button>
  </DialogActions>
</Dialog>
    <Dialog open={Boolean(selectedId)} onClose={() => { if (!saving) setSelectedId(null); }} fullWidth maxWidth="md" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ borderBottom: "1px solid #E1E8EF" }}><Typography sx={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: 1 }}>DETALLE DE ACCIÓN CORRECTIVA</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: NAVY, overflowWrap: "anywhere" }}>{selectedId}</Typography>{detail && <Chip size="small" label={STATUS[detail.status]} color={statusColor(detail.status)} sx={{ mt: 1 }} />}</DialogTitle>
      <DialogContent dividers>{detailLoading ? <Box sx={{ p: 5, textAlign: "center" }}><CircularProgress /></Box> : detail ? <Box sx={{ py: 1 }}>
        {detailError && <Alert severity="error" sx={{ mb: 2 }}>{detailError}</Alert>}
        {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
        <Typography sx={{ fontWeight: 700, color: NAVY, mb: 2 }}>Información general</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>{[
          ["Incidencia relacionada", selectedIncident?.title ?? detail.incident_id], ["Área", selectedArea], ["Responsable", detail.assignee_name || "Nombre no disponible"], ["Prioridad", PRIORITY[detail.priority]], ["Fecha límite", dateText(detail.due_date)], ["Estado", STATUS[detail.status]], ["Fecha de registro", dateText(detail.created_at)], ["Fecha de finalización", dateText(detail.completed_at)]
        ].map(([label, value]) => <Box key={label} sx={{ p: 1.5, borderRadius: 2, bgcolor: "#F5F8FB" }}><Typography sx={{ fontSize: 12, color: "text.secondary" }}>{label}</Typography><Typography sx={{ fontSize: 14, fontWeight: 600, color: NAVY, overflowWrap: "anywhere" }}>{value}</Typography></Box>)}</Box>
        <Divider sx={{ my: 3 }} /><Typography sx={{ fontWeight: 700, color: NAVY, mb: 1 }}>Descripción de la acción</Typography><Typography sx={{ whiteSpace: "pre-wrap" }}>{detail.description}</Typography>
        <Typography sx={{ fontWeight: 700, color: NAVY, mt: 2, mb: 1 }}>Observaciones</Typography><Typography sx={{ whiteSpace: "pre-wrap" }}>{detail.observations || "Sin observaciones registradas."}</Typography>
        <Divider sx={{ my: 3 }} /><Typography sx={{ fontWeight: 700, color: NAVY, mb: 2 }}>Historial de seguimiento ({detail.updates?.length ?? 0})</Typography>
        {!detail.updates?.length ? <Typography color="text.secondary">Todavía no hay avances registrados.</Typography> : detail.updates.map(u => <Box key={u.id} sx={{ border: "1px solid #E1E8EF", borderRadius: 2, p: 2, mb: 1.5 }}><Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}><Chip size="small" label={STATUS[u.status]} color={statusColor(u.status)} /><Typography sx={{ fontSize: 12, color: "text.secondary" }}>{dateText(u.created_at)}</Typography></Box><Typography sx={{ mt: 1, fontSize: 13 }}>{u.comment || "Sin comentario."}</Typography><Typography sx={{ fontSize: 11, color: "text.secondary", mt: 1 }}>Registrado por: {u.user_name || "Nombre no disponible"}</Typography></Box>)}
        {next && <Box sx={{ mt: 3, p: 2, bgcolor: "#F5F8FB", borderRadius: 2 }}><Typography sx={{ fontWeight: 700, color: NAVY, mb: 1 }}>Registrar avance</Typography><Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>Siguiente estado: {STATUS[next]}. La API comprobará tus permisos y, para verificar, que seas independiente de quien completó la acción.</Typography><TextField label="Comentario del avance (opcional)" multiline minRows={2} fullWidth value={comment} onChange={e => setComment(e.target.value)} /><Button sx={{ mt: 2, bgcolor: GREEN, textTransform: "none" }} variant="contained" onClick={() => setConfirm(true)} disabled={saving}>Cambiar a {STATUS[next]}</Button></Box>}
      </Box> : <Alert severity="error">{detailError || "No se pudo cargar el detalle."}</Alert>}</DialogContent>
      <DialogActions sx={{ p: 2 }}><Button variant="contained" sx={{ bgcolor: NAVY }} onClick={() => setSelectedId(null)} disabled={saving}>Cerrar detalle</Button></DialogActions>
    </Dialog>
  </Box>;
}
