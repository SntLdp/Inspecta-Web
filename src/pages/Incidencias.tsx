import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, InputAdornment,
  MenuItem, Select, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { apiRequest, isApiConfigured } from "../api/client";
import { getIncidents, getIncident, type Incident, type IncidentStatus, type IncidentRiskLevel } from "../services/incidents.service";
import type { ApiResponse, InspectionChecklist } from "../types/inspections";
import { getInspectionChecklist } from "../services/inspections.service";

import IncidentCorrectiveActions from "../components/IncidentCorrectiveActions";

type IncidenciaVista = Incident & { areaNombre: string; reporter_name?: string | null };
type InspeccionReferencia = { nombre: string; version: string };
const estados: Record<IncidentStatus, string> = {
  open: "Abierta", in_progress: "En seguimiento", resolved: "Resuelta", closed: "Cerrada",
};
const riesgos: Record<IncidentRiskLevel, string> = {
  low: "Baja", medium: "Media", high: "Alta", critical: "Crítica",
};
const tipos: Record<NonNullable<Incident["type"]>, string> = {
  unsafe_condition: "Condición insegura", unsafe_act: "Acto inseguro",
  near_miss: "Casi accidente", environmental_spill: "Derrame ambiental",
  equipment_damage: "Daño a equipo",
};
const coloresEstado: Record<IncidentStatus, string> = {
  open: "#B42318", in_progress: "#2673C9", resolved: "#16803C", closed: "#475569",
};
const coloresRiesgo: Record<IncidentRiskLevel, string> = {
  low: "#2673C9", medium: "#F2A900", high: "#E07825", critical: "#B42318",
};
const siguientes: Partial<Record<IncidentStatus, IncidentStatus>> = {
  open: "in_progress", in_progress: "resolved", resolved: "closed",
};
const botonesEstado: Partial<Record<IncidentStatus, string>> = {
  open: "Iniciar seguimiento", in_progress: "Marcar como resuelta", resolved: "Cerrar incidencia",
};
const mensajesEstado: Partial<Record<IncidentStatus, string>> = {
  open: "¿Deseas iniciar el seguimiento de esta incidencia?",
  in_progress: "¿Deseas marcar esta incidencia como resuelta?",
  resolved: "¿Deseas cerrar definitivamente esta incidencia?",
};
const traducirTipo = (tipo: Incident["type"]): string => tipo ? (tipos[tipo] ?? tipo) : "No especificado";
const fecha = (valor?: string | null): string => valor && !Number.isNaN(new Date(valor).getTime())
  ? new Date(valor).toLocaleDateString("es-MX") : "Sin fecha";
const errorTexto = (error: unknown): string => error instanceof Error ? error.message : "Error desconocido";

function TarjetaResumen({ titulo, valor, descripcion, icono, color }: {
  titulo: string; valor: number; descripcion: string; icono: ReactNode; color: string;
}) {
  return <Card sx={{ height: "100%" }}><CardContent sx={{ p: 2.5 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography color="text.secondary" sx={{ fontSize: 13 }}>{titulo}</Typography>
      <Typography sx={{ fontSize: 30, fontWeight: 700, color: "#16324F" }}>{valor}</Typography>
    </Box><Box sx={{
      width: 44, height: 44, borderRadius: 2, bgcolor: `${color}15`, color,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>{icono}</Box>
    <Typography color="text.secondary" sx={{ fontSize: 12, mt: 1 }}>{descripcion}</Typography>
  </CardContent></Card>;
}

export default function Incidencias() {
  const [incidencias, setIncidencias] = useState<IncidenciaVista[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<IncidentStatus | "Todos">("Todos");
  const [filtroRiesgo, setFiltroRiesgo] = useState<IncidentRiskLevel | "Todas">("Todas");
  const [cargando, setCargando] = useState(false);
  const [errorApi, setErrorApi] = useState("");
  const [seleccionada, setSeleccionada] = useState<IncidenciaVista | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [actualizando, setActualizando] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [confirmarCambio, setConfirmarCambio] = useState(false);
  const [referenciasInspecciones, setReferenciasInspecciones] = useState<Record<string, InspeccionReferencia>>({});
  const [cargandoReferencia, setCargandoReferencia] = useState(false);

  useEffect(() => {
    let activo = true;
    if (!isApiConfigured) {
      setErrorApi("La API no está configurada. No se muestran datos de demostración.");
      return;
    }
    async function cargar() {
      setCargando(true); setErrorApi("");
      try {
        const primera = await getIncidents({ page: 1, perPage: 100 });
        const items = [...primera.data];
        for (let page = 2; page <= primera.meta.last_page; page++) {
          const siguiente = await getIncidents({ page, perPage: 100 });
          items.push(...siguiente.data);
        }
        const ids = [...new Set(items.map((item) => item.area_id))];
        const nombres = new Map<string, string>();
        await Promise.all(ids.map(async (id) => {
          try {
            const r = await apiRequest<ApiResponse<{ name: string }>>(`/areas/${encodeURIComponent(id)}`, { method: "GET" });
            nombres.set(id, r.data.name);
          } catch { nombres.set(id, `Área ${id.slice(0, 8)}`); }
        }));
        if (activo) setIncidencias(items.map((item) => ({ ...item, areaNombre: nombres.get(item.area_id) ?? item.area_id })));
      } catch (error) {
        if (activo) { setIncidencias([]); setErrorApi(`No se pudieron consultar las incidencias: ${errorTexto(error)}`); }
      } finally { if (activo) setCargando(false); }
    }
    void cargar();
    return () => { activo = false; };
  }, []);

  const filtradas = useMemo(() => incidencias.filter((item) => {
    const texto = [item.id, item.title, item.description, item.areaNombre, traducirTipo(item.type)]
      .join(" ").toLocaleLowerCase("es-MX");
    return texto.includes(busqueda.trim().toLocaleLowerCase("es-MX"))
      && (filtroEstado === "Todos" || item.status === filtroEstado)
      && (filtroRiesgo === "Todas" || item.risk_level === filtroRiesgo);
  }), [incidencias, busqueda, filtroEstado, filtroRiesgo]);

  const abrirDetalle = async (item: IncidenciaVista) => {
    setSeleccionada(item); setCargandoDetalle(true); setErrorDetalle("");
    setMensajeExito(""); setConfirmarCambio(false);
    try {
      const respuesta = await getIncident(item.id);
      setSeleccionada((actual) => actual?.id === item.id ? { ...respuesta.data, areaNombre: item.areaNombre } : actual);
    } catch (error) { setErrorDetalle(`No se pudo actualizar el detalle: ${errorTexto(error)}`); }
    finally { setCargandoDetalle(false); }
  };

  useEffect(() => {
    const id = seleccionada?.inspection_id;
    if (!id || referenciasInspecciones[id]) return;
    let activo = true;
    setCargandoReferencia(true);
    void getInspectionChecklist(id).then((respuesta) => {
      if (!activo) return;
      const data: InspectionChecklist = respuesta.data;
      setReferenciasInspecciones((prev) => ({
        ...prev,
        [id]: {
          nombre: data.checklist.name || "Checklist sin nombre",
          version: data.checklist_version.version,
        },
      }));
    }).catch(() => {
      // No ocultar la incidencia si no hay permiso para consultar la inspección.
    }).finally(() => { if (activo) setCargandoReferencia(false); });
    return () => { activo = false; };
  }, [seleccionada?.inspection_id, referenciasInspecciones]);

  const cambiarEstado = async () => {
    if (!seleccionada || actualizando || cargandoDetalle) return;
    const nuevo = siguientes[seleccionada.status];
    if (!nuevo) return;
    setActualizando(true); setErrorDetalle(""); setMensajeExito("");
    try {
      const respuesta = await apiRequest<ApiResponse<Incident>>(
        `/incidents/${encodeURIComponent(seleccionada.id)}/status`,
        { method: "PATCH", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ status: nuevo }) },
      );
      const actualizado = { ...seleccionada, ...respuesta.data, areaNombre: seleccionada.areaNombre };
      setSeleccionada(actualizado);
      setIncidencias((anteriores) => anteriores.map((i) => i.id === actualizado.id ? actualizado : i));
      setConfirmarCambio(false);
      setMensajeExito(`La incidencia se actualizó correctamente a ${estados[actualizado.status]}.`);
    } catch (error) {
      const mensaje = errorTexto(error);
      setErrorDetalle(/403|forbidden|no tienes permiso|no autorizado/i.test(mensaje)
        ? "No tienes los permisos necesarios para realizar este cambio de estado."
        : `No se pudo actualizar la incidencia: ${mensaje}`);
      console.error("Error al actualizar incidencia:", error);
    } finally { setActualizando(false); }
  };

  const generarPDF = async () => {
    if (generandoPDF || filtradas.length === 0) return;
    setGenerandoPDF(true); setErrorApi("");
    try {
      const idsInspecciones = [...new Set(filtradas.map((item) => item.inspection_id).filter((id): id is string => Boolean(id)))];
      const referencias = { ...referenciasInspecciones };
      await Promise.all(idsInspecciones.map(async (id) => {
        if (referencias[id]) return;
        try {
          const response = await getInspectionChecklist(id);
          referencias[id] = {
            nombre: response.data.checklist.name || "Checklist sin nombre",
            version: response.data.checklist_version.version,
          };
        } catch { /* Sin permiso: mantener identificador. */ }
      }));
      setReferenciasInspecciones((prev) => ({ ...prev, ...referencias }));
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const azul: [number, number, number] = [22, 50, 79];
      const margen = 14;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.setTextColor(...azul);
      pdf.text("INSPECTA | Reporte de incidencias", margen, 18);
      pdf.setFontSize(9);
      pdf.text(`Generado: ${new Date().toLocaleString("es-MX")} | Registros: ${filtradas.length}`, margen, 26);
      autoTable(pdf, {
        startY: 34,
        head: [["Incidencia", "Título", "Área", "Tipo", "Riesgo", "Estado", "Fecha"]],
        body: filtradas.map((i) => [i.id, i.title, i.areaNombre, traducirTipo(i.type),
        riesgos[i.risk_level], estados[i.status], fecha(i.reported_at ?? i.created_at)]),
        theme: "grid", headStyles: { fillColor: azul }, styles: { fontSize: 8, overflow: "linebreak" },
      });
      for (const item of filtradas) {
        pdf.addPage();
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.setTextColor(...azul);
        pdf.text("Detalle de incidencia", margen, 18);
        pdf.setFontSize(8); pdf.text(item.id, margen, 25);
        autoTable(pdf, {
          startY: 31, head: [["Campo", "Información"]],
          body: [
            ["Título", item.title], ["Descripción", item.description],
            ["Área", item.areaNombre], ["Tipo", traducirTipo(item.type)],
            ["Nivel de riesgo", riesgos[item.risk_level]], ["Estado", estados[item.status]],
            ["Fecha de reporte", fecha(item.reported_at ?? item.created_at)],
            ["Reportado por", item.reporter_name?.trim() || "Nombre no disponible"],
            ["Inspección relacionada", item.inspection_id
              ? `${referencias[item.inspection_id]?.nombre ?? "Inspección"}${referencias[item.inspection_id] ? ` (versión ${referencias[item.inspection_id].version})` : ""} — ID: ${item.inspection_id}`
              : "Sin inspección asociada"],
            ["Ubicación", item.location_description ?? "No especificada"],
          ],
          theme: "grid", headStyles: { fillColor: azul }, styles: { fontSize: 9, overflow: "linebreak" },
          columnStyles: { 0: { cellWidth: 58 } },
        });
      }
      const totalPaginas = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPaginas; p++) {
        pdf.setPage(p); pdf.setFontSize(8); pdf.setTextColor(129, 144, 157);
        pdf.text(`INSPECTA · Página ${p} de ${totalPaginas}`, pdf.internal.pageSize.getWidth() - margen,
          pdf.internal.pageSize.getHeight() - 7, { align: "right" });
      }
      pdf.save(`Inspecta-incidencias-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) { setErrorApi(`No se pudo generar el PDF: ${errorTexto(error)}`); }
    finally { setGenerandoPDF(false); }
  };

  return <Box sx={{ width: "100%" }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, mb: 4, flexDirection: { xs: "column", sm: "row" } }}>
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#0F9D8A", letterSpacing: 1, mb: 0.5 }}>
          GESTIÓN OPERATIVA
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#16324F", mb: 0.5 }}>
          Incidencias
        </Typography>
        <Typography sx={{ color: "#81909D", fontSize: 14 }}>
          Registro y seguimiento de incidencias de seguridad e higiene.
        </Typography>
      </Box>
      <Button
        variant="contained"
        startIcon={generandoPDF ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
        onClick={() => void generarPDF()}
        disabled={cargando || generandoPDF || filtradas.length === 0}
        sx={{ backgroundColor: "#0F9D8A", px: 2.5, py: 1.2, "&:hover": { backgroundColor: "#0C8878" } }}
      >
        {generandoPDF ? "Generando PDF..." : "Generar PDF"}
      </Button>
    </Box>
    {errorApi && <Alert severity="warning" sx={{ mb: 2 }}>{errorApi}</Alert>}
    {cargando && <Alert severity="info" sx={{ mb: 2 }}>Cargando incidencias y nombres de áreas...</Alert>}
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
      <TarjetaResumen titulo="Total de incidencias" valor={incidencias.length} descripcion="Registros accesibles" icono={<ReportProblemOutlinedIcon />} color="#16324F" />
      <TarjetaResumen titulo="Abiertas" valor={incidencias.filter((i) => i.status === "open").length} descripcion="Pendientes de atención" icono={<PendingActionsIcon />} color="#B42318" />
      <TarjetaResumen titulo="En seguimiento" valor={incidencias.filter((i) => i.status === "in_progress").length} descripcion="En proceso de atención" icono={<ManageSearchIcon />} color="#2673C9" />
      <TarjetaResumen titulo="Resueltas" valor={incidencias.filter((i) => i.status === "resolved").length} descripcion="Pendientes de cierre" icono={<CheckCircleIcon />} color="#16803C" />
    </Box>
    <Card><Box sx={{ p: 2.5 }}>
      <Typography sx={{ fontWeight: 700, color: "#16324F", fontSize: 17 }}>Registro de incidencias</Typography>
      <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2.5 }}>Consulta las incidencias registradas en las ubicaciones a las que tienes acceso.</Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2.5 }}>
        <TextField fullWidth size="small" placeholder="Buscar por ID, título, descripción o área..." value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)} slotProps={{
            input: {
              startAdornment:
                <InputAdornment position="start"><SearchIcon sx={{ color: "#81909D" }} /></InputAdornment>
            }
          }} />
        <Select size="small" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as IncidentStatus | "Todos")}
          sx={{ minWidth: { xs: "100%", md: 180 } }}>
          <MenuItem value="Todos">Todos los estados</MenuItem>
          {(Object.keys(estados) as IncidentStatus[]).map((k) => <MenuItem key={k} value={k}>{estados[k]}</MenuItem>)}
        </Select>
        <Select size="small" value={filtroRiesgo} onChange={(e) => setFiltroRiesgo(e.target.value as IncidentRiskLevel | "Todas")}
          sx={{ minWidth: { xs: "100%", md: 160 } }}>
          <MenuItem value="Todas">Todos los riesgos</MenuItem>
          {(Object.keys(riesgos) as IncidentRiskLevel[]).map((k) => <MenuItem key={k} value={k}>{riesgos[k]}</MenuItem>)}
        </Select>
      </Stack>
      <TableContainer sx={{ overflowX: "auto" }}><Table size="medium" sx={{ minWidth: 950 }}>
        <TableHead><TableRow sx={{ bgcolor: "#F4F7FA" }}>
          {(["ID", "Descripción", "Área", "Tipo", "Severidad", "Fecha", "Estado", "Acción"] as const)
            .map((col) => <TableCell key={col} sx={{ fontWeight: 700 }}>{col}</TableCell>)}
        </TableRow></TableHead>
        <TableBody>{filtradas.map((i) => <TableRow key={i.id} hover>
          <TableCell sx={{ fontSize: 12, fontWeight: 700, color: "#16324F", maxWidth: 190, overflowWrap: "anywhere" }}>{i.id}</TableCell>
          <TableCell sx={{ maxWidth: 240 }}><Typography sx={{ fontSize: 13 }}>{i.title}</Typography>
            <Typography color="text.secondary" sx={{ fontSize: 11 }}>{i.description}</Typography></TableCell>
          <TableCell sx={{ fontSize: 13 }}>{i.areaNombre}</TableCell>
          <TableCell sx={{ fontSize: 12 }}>{traducirTipo(i.type)}</TableCell>
          <TableCell><Chip size="small" label={riesgos[i.risk_level]}
            sx={{ color: coloresRiesgo[i.risk_level], bgcolor: `${coloresRiesgo[i.risk_level]}15`, fontWeight: 700 }} /></TableCell>
          <TableCell sx={{ fontSize: 12 }}>{fecha(i.reported_at ?? i.created_at)}</TableCell>
          <TableCell><Chip size="small" label={estados[i.status]}
            sx={{ color: coloresEstado[i.status], bgcolor: `${coloresEstado[i.status]}15`, fontWeight: 700 }} /></TableCell>
          <TableCell><Button size="small" startIcon={<VisibilityIcon />} onClick={() => void abrirDetalle(i)}>Ver</Button></TableCell>
        </TableRow>)}
          {filtradas.length === 0 && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5 }}>
            {cargando ? "Cargando..." : "No se encontraron incidencias."}
          </TableCell></TableRow>}
        </TableBody>
      </Table></TableContainer>
      <Typography color="text.secondary" sx={{ fontSize: 12, mt: 2, textAlign: "right" }}>
        Mostrando {filtradas.length} de {incidencias.length} incidencias accesibles
      </Typography>
    </Box></Card>

    <Dialog open={Boolean(seleccionada)} onClose={() => { if (!actualizando) setSeleccionada(null); }}
      fullWidth maxWidth="md" slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: "92vh" } } }}>
      {seleccionada && <>
        <DialogTitle sx={{ borderBottom: "1px solid #E1E8EF" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 2,
            }}
          >
            <Box><Typography sx={{ color: "#0F9D8A", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>DETALLE DE INCIDENCIA</Typography>
              <Typography variant="h6" sx={{ color: "#16324F", fontWeight: 700, overflowWrap: "anywhere" }}>{seleccionada.id}</Typography>
              <Typography sx={{ color: "#526477", fontSize: 14 }}>{seleccionada.title}</Typography></Box>
            <Chip size="small" label={estados[seleccionada.status]} sx={{
              color: coloresEstado[seleccionada.status],
              bgcolor: `${coloresEstado[seleccionada.status]}15`, fontWeight: 700
            }} />
          </Box>
        </DialogTitle>
        <DialogContent dividers><Stack spacing={2.5}>
          {cargandoDetalle && <Alert severity="info">Consultando detalle actualizado...</Alert>}
          {errorDetalle && !confirmarCambio && <Alert severity="error">{errorDetalle}</Alert>}
          {mensajeExito && <Alert severity="success" onClose={() => setMensajeExito("")}>{mensajeExito}</Alert>}
          <Typography sx={{ color: "#16324F", fontWeight: 700 }}>Información general</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.5 }}>
            {([
              ["Área", seleccionada.areaNombre], ["Tipo", traducirTipo(seleccionada.type)],
              ["Riesgo", riesgos[seleccionada.risk_level]], ["Estado", estados[seleccionada.status]],
              ["Fecha de reporte", fecha(seleccionada.reported_at ?? seleccionada.created_at)],
              ["Reportado por", seleccionada.reporter_name?.trim() || "Nombre no disponible"],
            ] as [string, string][]).map(([label, value]) => <Box key={label} sx={{ bgcolor: "#F6F9FC", borderRadius: 2, p: 1.5 }}>
              <Typography sx={{ color: "#81909D", fontSize: 12 }}>{label}</Typography>
              <Typography sx={{ color: "#16324F", fontWeight: 600, fontSize: 14, overflowWrap: "anywhere" }}>{value}</Typography>
            </Box>)}
          </Box>
          <Divider />
          <Typography sx={{ color: "#16324F", fontWeight: 700 }}>Descripción detallada</Typography>
          <Typography sx={{ color: "#526477", whiteSpace: "pre-wrap" }}>{seleccionada.description}</Typography>
          <Typography sx={{ color: "#526477", fontSize: 13 }}>Ubicación: {seleccionada.location_description || "No especificada"}</Typography>
          <Divider />
          <Typography sx={{ color: "#16324F", fontWeight: 700 }}>Relación con inspección</Typography>
          <Typography sx={{ color: "#526477", fontSize: 13, overflowWrap: "anywhere" }}>
            {seleccionada.inspection_id ? (
              <>
                {referenciasInspecciones[seleccionada.inspection_id]
                  ? `${referenciasInspecciones[seleccionada.inspection_id].nombre} (versión ${referenciasInspecciones[seleccionada.inspection_id].version})`
                  : cargandoReferencia ? "Consultando checklist relacionado..." : "Inspección relacionada"}
                <Typography component="span" sx={{ display: "block", mt: 0.5, fontSize: 12, color: "#81909D", overflowWrap: "anywhere" }}>
                  ID: {seleccionada.inspection_id}
                </Typography>
              </>
            ) : "Esta incidencia no está vinculada a una inspección."}
          </Typography>
          {seleccionada.question_id && <Typography sx={{ color: "#526477", fontSize: 13, overflowWrap: "anywhere" }}>
            Pregunta relacionada: {seleccionada.question_id}</Typography>}
          <Divider />
          <IncidentCorrectiveActions key={seleccionada.id} incidentId={seleccionada.id} />
        </Stack></DialogContent>
        <DialogActions sx={{ p: 2, flexWrap: "wrap", gap: 1 }}>
          {seleccionada.status === "closed" && <Typography sx={{ mr: "auto", fontSize: 13, color: "text.secondary" }}>Esta incidencia se encuentra cerrada.</Typography>}
          {siguientes[seleccionada.status] && <Button variant="outlined" color="primary"
            disabled={actualizando || cargandoDetalle} onClick={() => { setErrorDetalle(""); setMensajeExito(""); setConfirmarCambio(true); }}>
            {botonesEstado[seleccionada.status]}
          </Button>}
          <Button variant="contained" onClick={() => setSeleccionada(null)} disabled={actualizando}>Cerrar detalle</Button>
        </DialogActions>
      </>}
    </Dialog>
    <Dialog open={confirmarCambio && Boolean(seleccionada)} fullWidth maxWidth="xs"
      onClose={() => { if (!actualizando) { setConfirmarCambio(false); setErrorDetalle(""); } }}>
      <DialogTitle>Confirmar cambio de estado</DialogTitle>
      <DialogContent>
        <Typography>{seleccionada ? mensajesEstado[seleccionada.status] : "No hay una transición disponible."}</Typography>
        <Typography sx={{ mt: 1, fontSize: 13, color: "text.secondary" }}>
          El cambio quedará registrado en el sistema y no podrá revertirse desde este módulo.
        </Typography>
        {seleccionada?.status === "in_progress" && <Alert severity="info" sx={{ mt: 2 }}>
          Comprueba que las medidas correctivas hayan sido atendidas antes de marcar la incidencia como resuelta.
        </Alert>}
        {seleccionada?.status === "resolved" && <Alert severity="warning" sx={{ mt: 2 }}>
          Una vez cerrada la incidencia, no será posible realizar nuevas transiciones de estado.
        </Alert>}
        {errorDetalle && <Alert severity="error" sx={{ mt: 2 }}>{errorDetalle}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button disabled={actualizando} onClick={() => { setConfirmarCambio(false); setErrorDetalle(""); }}>
          {errorDetalle ? "Cerrar" : "Cancelar"}
        </Button>
        <Button variant="contained" disabled={actualizando || !seleccionada || !siguientes[seleccionada.status]}
          onClick={() => void cambiarEstado()} sx={{ bgcolor: "#0F9D8A", "&:hover": { bgcolor: "#0C8878" } }}>
          {actualizando ? "Guardando..." : "Confirmar cambio"}
        </Button>
      </DialogActions>
    </Dialog>
  </Box>;
}
