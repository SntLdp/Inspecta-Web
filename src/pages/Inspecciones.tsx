import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import Alert from "@mui/material/Alert";

import {
  isApiConfigured,
  getOrganizationId,
} from "../api/client";
import { getInspections, getInspection, getInspectionChecklist, getInspectionAnswers } from "../services/inspections.service";
import { getAllVisibleIncidents, type Incident } from "../services/incidents.service";
import type { InspectionBase, InspectionDetail, InspectionChecklist, InspectionAnswer } from "../types/inspections";
type Estado =
  | "Completada"
  | "En proceso"
  | "Pendiente"
  | "Confirmada"
  | "Rechazada";

type Inspeccion = {
  id: string;
  area: string;
  tipo: string;
  planta: string;
  linea: string;
  version: string | null;
  respondidas: number;
  obligatorias: number;
  responsable: string;
  fecha: string;
  estado: Estado;
  avance: number | null;
};

function convertirInspeccionApi(item: InspectionBase): Inspeccion {
  const estados: Record<InspectionBase["status"], Estado> = {
    draft: item.answered_questions > 0 ? "En proceso" : "Pendiente",
    completed: "Completada",
    confirmed: "Confirmada",
    rejected: "Rechazada",
  };

  const fecha = item.completed_at ?? item.started_at;

  return {
    id: item.id,
    area: item.area_name?.trim() || "Área no disponible",
    tipo: item.checklist_name?.trim() || "Checklist no disponible",
    planta: item.plant_name?.trim() || "Planta no disponible",
    linea: item.production_line_name?.trim() || "",
    version: item.checklist_version,
    respondidas: item.answered_questions,
    obligatorias: item.required_questions,
    responsable: item.inspector_name?.trim() || `Usuario ${item.user_id.slice(0, 8)}`,
    fecha: fecha
      ? new Date(fecha).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "—",
    estado: estados[item.status],
    avance: item.progress,
  };
}

function textoAvance(item: Inspeccion): string {
  return item.avance === null
    ? "No aplica (sin preguntas obligatorias)"
    : `${item.respondidas} de ${item.obligatorias} (${item.avance}%)`;
}

export default function Inspecciones() {
  const [searchParams, setSearchParams] = useSearchParams();

  const inspectionId = searchParams.get("inspectionId");
  const organizationId = getOrganizationId();

  const [cargandoAccesoDirecto, setCargandoAccesoDirecto] =
    useState(false);

  const [errorAccesoDirecto, setErrorAccesoDirecto] =
    useState("");

  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");

  const [datosInspecciones, setDatosInspecciones] =
    useState<Inspeccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorApi, setErrorApi] = useState("");
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [inspeccionSeleccionada, setInspeccionSeleccionada] = useState<Inspeccion | null>(null);

  // El detalle se carga únicamente al abrir el modal; el listado no se altera.
  const [detalleReal, setDetalleReal] = useState<InspectionDetail | null>(null);
  const [checklistReal, setChecklistReal] = useState<InspectionChecklist | null>(null);
  const [respuestasReales, setRespuestasReales] = useState<InspectionAnswer[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState("");
  const [incidenciasReales, setIncidenciasReales] = useState<Incident[]>([]);
  const [errorIncidencias, setErrorIncidencias] = useState("");

  useEffect(() => {
    if (!inspectionId) {
      setCargandoAccesoDirecto(false);
      setErrorAccesoDirecto("");
      return;
    }

    const controller = new AbortController();

    setInspeccionSeleccionada(null);
    setCargandoAccesoDirecto(true);
    setErrorAccesoDirecto("");

    async function abrirInspeccionDesdeUrl() {
      try {
        const response = await getInspection(
          inspectionId!,
          controller.signal
        );

        if (
          controller.signal.aborted ||
          getOrganizationId() !== organizationId
        ) {
          return;
        }

        const inspeccion = convertirInspeccionApi(
          response.data
        );

        setInspeccionSeleccionada(inspeccion);
      } catch (error) {
        if (
          controller.signal.aborted ||
          getOrganizationId() !== organizationId
        ) {
          return;
        }

        setErrorAccesoDirecto(
          error instanceof Error
            ? error.message
            : "No fue posible abrir la inspección seleccionada."
        );
      } finally {
        if (!controller.signal.aborted) {
          setCargandoAccesoDirecto(false);
        }
      }
    }

    void abrirInspeccionDesdeUrl();

    return () => {
      controller.abort();
    };
  }, [inspectionId, organizationId]);

  function limpiarAccesoDirecto() {
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous);

        params.delete("inspectionId");

        return params;
      },
      { replace: true }
    );

    setErrorAccesoDirecto("");
    setCargandoAccesoDirecto(false);
  }

  function cerrarDetalle() {
    setInspeccionSeleccionada(null);
    limpiarAccesoDirecto();
  }

  useEffect(() => {
    if (!inspeccionSeleccionada) {
      setDetalleReal(null);
      setChecklistReal(null);
      setRespuestasReales([]);
      setErrorDetalle("");
      setIncidenciasReales([]);
      setErrorIncidencias("");
      setCargandoDetalle(false);
      return;
    }
    let activo = true;
    const id = inspeccionSeleccionada.id;
    setDetalleReal(null);
    setChecklistReal(null);
    setRespuestasReales([]);
    setErrorDetalle("");
    setIncidenciasReales([]);
    setErrorIncidencias("");
    setCargandoDetalle(true);

    async function cargarDetalle() {
      try {
        const [inspection, checklist, firstAnswers] = await Promise.all([
          getInspection(id),
          getInspectionChecklist(id),
          getInspectionAnswers(id),
        ]);
        const answers = [...firstAnswers.data];
        for (let page = 2; page <= firstAnswers.meta.last_page; page++) {
          const next = await getInspectionAnswers(id, page);
          answers.push(...next.data);
        }
        if (!activo) return;
        setDetalleReal(inspection.data);
        setChecklistReal(checklist.data);
        setRespuestasReales(answers);
        try {
          const all = await getAllVisibleIncidents();
          if (activo) setIncidenciasReales(all.filter((incident) => incident.inspection_id === id));
        } catch (error) {
          if (activo) setErrorIncidencias(
            error instanceof Error ? error.message : "No fue posible consultar incidencias."
          );
        }


      } catch (error) {
        if (activo) setErrorDetalle(
          error instanceof Error ? error.message : "No se pudo consultar el detalle."
        );
      } finally {
        if (activo) setCargandoDetalle(false);
      }
    }
    void cargarDetalle();
    return () => { activo = false; };
  }, [inspeccionSeleccionada?.id]);


  useEffect(() => {
    if (!isApiConfigured) return;

    let activo = true;

    async function cargarInspecciones() {
      setCargando(true);
      setErrorApi("");

      try {
        const respuesta = await getInspections({
          page: 1,
          perPage: 100,
        });

        const registros = [...respuesta.data];
        for (let page = 2; page <= respuesta.meta.last_page; page++) {
          if (!activo || getOrganizationId() !== organizationId) return;
          const siguiente = await getInspections({ page, perPage: 100 });
          registros.push(...siguiente.data);
        }
        if (!activo || getOrganizationId() !== organizationId) return;
        setDatosInspecciones(registros.map(convertirInspeccionApi));
      } catch (error) {
        if (!activo) return;
        setErrorApi(
          error instanceof Error
            ? error.message
            : "No fue posible cargar las inspecciones.",
        );
      } finally {
        if (activo) setCargando(false);
      }
    }

    void cargarInspecciones();

    return () => {
      activo = false;
    };
  }, [organizationId]);

  const inspecciones = useMemo(() => {
    return datosInspecciones.filter((inspeccion) => {
      const texto = busqueda.trim().toLowerCase();

      const coincideBusqueda =
        inspeccion.id.toLowerCase().includes(texto) ||
        inspeccion.area.toLowerCase().includes(texto) ||
        inspeccion.responsable.toLowerCase().includes(texto) ||
        inspeccion.tipo.toLowerCase().includes(texto) ||
        inspeccion.planta.toLowerCase().includes(texto) ||
        inspeccion.linea.toLowerCase().includes(texto);

      const coincideEstado =
        estadoFiltro === "Todos" ||
        inspeccion.estado === estadoFiltro;

      return coincideBusqueda && coincideEstado;
    });
  }, [busqueda, estadoFiltro, datosInspecciones]);

  const total = datosInspecciones.length;

  const completadas = datosInspecciones.filter(
    (item) => item.estado === "Completada" || item.estado === "Confirmada"
  ).length;

  const enProceso = datosInspecciones.filter(
    (item) => item.estado === "En proceso"
  ).length;

  const pendientes = datosInspecciones.filter(
    (item) => item.estado === "Pendiente"
  ).length;

  const generarPDF = async () => {
    if (generandoPDF || cargando || datosInspecciones.length === 0) return;
    setGenerandoPDF(true);
    setErrorApi("");
    try {
      // No emitir un PDF parcial cuando una consulta obligatoria falla.
      const allIncidents = await getAllVisibleIncidents();
      const details = await Promise.all(datosInspecciones.map(async (item) => {
        const [inspection, checklist, first] = await Promise.all([
          getInspection(item.id), getInspectionChecklist(item.id), getInspectionAnswers(item.id),
        ]);
        const answers = [...first.data];
        for (let page = 2; page <= first.meta.last_page; page++) {
          const next = await getInspectionAnswers(item.id, page);
          answers.push(...next.data);
        }
        return {
          item, inspection: inspection.data, checklist: checklist.data, answers,
          incidents: allIncidents.filter((incident) => incident.inspection_id === item.id)
        };
      }));

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const azul: [number, number, number] = [22, 50, 79];
      const verde: [number, number, number] = [15, 157, 138];
      const finalY = () => (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 35;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(...azul);
      pdf.text("INSPECTA | Reporte de inspecciones", 14, 17);
      pdf.setFontSize(9);
      pdf.text(`Generado: ${new Date().toLocaleString("es-MX")} | Registros: ${details.length}`, 14, 25);
      autoTable(pdf, {
        startY: 32,
        head: [["Inspección", "Checklist", "Inspector", "Área", "Estado"]],
        body: details.map(({ item, inspection, checklist }) => [
          item.id, checklist.checklist.name ?? "No disponible",
          inspection.inspector_name || inspection.user_id, inspection.area_name || item.area, convertirInspeccionApi(inspection).estado,
        ]),
        theme: "grid", headStyles: { fillColor: azul }, styles: { fontSize: 8, overflow: "linebreak" },
      });
      for (const { item, inspection, checklist, answers, incidents } of details) {
        pdf.addPage();
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(...azul);
        pdf.text("Detalle de inspección", 14, 17);
        pdf.setFontSize(8);
        pdf.text(item.id, 14, 23);
        const answerMap = new Map(answers.map((answer) => [answer.question_id, answer]));
        autoTable(pdf, {
          startY: 28, head: [["Campo", "Valor"]],
          body: [
            ["Área", inspection.area_name || item.area],
            ["Checklist", checklist.checklist.name ?? "No disponible"],
            ["Versión", checklist.checklist_version.version],
            ["Inspector", inspection.inspector_name || inspection.user_id],
            ["Fecha", item.fecha],
            ["Estado", convertirInspeccionApi(inspection).estado],
            ["Avance", textoAvance(convertirInspeccionApi(inspection))],
            ["Observaciones del inspector", inspection.observations || "Sin observaciones"],
            ["Observaciones del supervisor", inspection.supervisor_observations || "Sin observaciones"],
          ],
          theme: "grid", headStyles: { fillColor: verde }, styles: { fontSize: 8, overflow: "linebreak" },
          columnStyles: { 0: { cellWidth: 60 } },
        });
        let y = finalY() + 10;
        if (y > 175) { pdf.addPage(); y = 18; }
        pdf.setFontSize(11);
        pdf.setTextColor(...azul);
        pdf.text("Checklist y respuestas", 14, y);
        autoTable(pdf, {
          startY: y + 4,
          head: [["Sección", "Pregunta", "Respuesta", "Observación"]],
          body: checklist.sections.flatMap((section) => section.questions.map((question) => {
            const answer = answerMap.get(question.id);
            return [section.name, question.question_text, answer?.answer ?? "Sin responder", answer?.observation ?? "—"];
          })),
          theme: "grid", headStyles: { fillColor: azul }, styles: { fontSize: 8, overflow: "linebreak" },
        });
        y = finalY() + 10;
        if (y > 175) { pdf.addPage(); y = 18; }
        pdf.setFontSize(11);
        pdf.text(`Incidencias relacionadas (${incidents.length})`, 14, y);
        autoTable(pdf, {
          startY: y + 4,
          head: [["Título", "Descripción", "Riesgo", "Estado", "Ubicación"]],
          body: incidents.length ? incidents.map((incident) => [
            incident.title, incident.description, incident.risk_level,
            incident.status, incident.location_description || inspection.area_name || item.area,
          ]) : [["Sin incidencias relacionadas visibles", "—", "—", "—", "—"]],
          theme: "grid", headStyles: { fillColor: azul }, styles: { fontSize: 8, overflow: "linebreak" },
        });
      }
      pdf.save(`Inspecta-reporte-inspecciones-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("No fue posible generar el PDF:", error);
      setErrorApi(error instanceof Error ? `No fue posible generar el PDF: ${error.message}` : "No fue posible generar el PDF.");
    } finally {
      setGenerandoPDF(false);
    }
  };

  const getEstadoColor = (estado: Estado) => {
    switch (estado) {
      case "Completada":
        return {
          color: "#16803C",
          background: "#EAF7EF",
        };

      case "En proceso":
        return {
          color: "#B77900",
          background: "#FFF5D9",
        };

      case "Pendiente":
        return {
          color: "#2673C9",
          background: "#EDF5FF",
        };

      case "Confirmada":
        return {
          color: "#16803C",
          background: "#EAF7EF",
        };

      case "Rechazada":
        return {
          color: "#B42318",
          background: "#FDECEC",
        };
    }
  };

  return (
    <Box>
      {/* ENCABEZADO */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            sm: "center",
          },
          gap: 2,
          mb: 4,
          flexDirection: {
            xs: "column",
            sm: "row",
          },
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 700,
              color: "#0F9D8A",
              letterSpacing: 1,
              mb: 0.5,
            }}
          >
            GESTIÓN OPERATIVA
          </Typography>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#16324F",
              mb: 0.5,
            }}
          >
            Inspecciones
          </Typography>

          <Typography
            sx={{
              color: "#81909D",
              fontSize: 14,
            }}
          >
            Consulta, gestiona y da seguimiento a las inspecciones.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={generarPDF}
          disabled={generandoPDF || cargando || datosInspecciones.length === 0}
          sx={{
            backgroundColor: "#0F9D8A",
            px: 2.5,
            py: 1.2,
            "&:hover": {
              backgroundColor: "#0C8878",
            },
          }}
        >
          {generandoPDF ? "Generando PDF..." : "Generar PDF"}
        </Button>
      </Box>

      {errorApi && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorApi}
        </Alert>
      )}

      {cargandoAccesoDirecto && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Abriendo la inspección seleccionada...
        </Alert>
      )}

      {errorAccesoDirecto && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={limpiarAccesoDirecto}
        >
          No fue posible abrir la inspección seleccionada.
          {" "}
          {errorAccesoDirecto}
        </Alert>
      )}

      {cargando && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Cargando inspecciones...
        </Alert>
      )}

      {/* RESUMEN */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <SummaryCard
          title="Total"
          value={total}
          icon={<AssignmentIcon />}
          iconColor="#2673C9"
          iconBackground="#EDF5FF"
        />

        <SummaryCard
          title="En proceso"
          value={enProceso}
          icon={<PlayCircleIcon />}
          iconColor="#B77900"
          iconBackground="#FFF5D9"
        />

        <SummaryCard
          title="Pendientes"
          value={pendientes}
          icon={<PendingActionsIcon />}
          iconColor="#2673C9"
          iconBackground="#EDF5FF"
        />

        <SummaryCard
          title="Completadas"
          value={completadas}
          icon={<CheckCircleIcon />}
          iconColor="#16803C"
          iconBackground="#EAF7EF"
        />
      </Box>

      {/* FILTROS */}
      <Card
        sx={{
          mb: 2,
          border: "none",
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexDirection: {
                xs: "column",
                md: "row",
              },
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por folio, checklist, ubicación o responsable..."
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        sx={{
                          color: "#81909D",
                        }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Select
              size="small"
              value={estadoFiltro}
              onChange={(event) =>
                setEstadoFiltro(event.target.value)
              }
              sx={{
                minWidth: {
                  xs: "100%",
                  md: 190,
                },
              }}
            >
              <MenuItem value="Todos">Todos los estados</MenuItem>
              <MenuItem value="Pendiente">Pendiente</MenuItem>
              <MenuItem value="En proceso">En proceso</MenuItem>
              <MenuItem value="Completada">Completada</MenuItem>
              <MenuItem value="Confirmada">Confirmada</MenuItem>
              <MenuItem value="Rechazada">Rechazada</MenuItem>
            </Select>
          </Box>
        </CardContent>
      </Card>

      {/* TABLA */}
      <Card
        sx={{
          border: "none",
          overflow: "hidden",
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor: "#F8FAFC",
                }}
              >
                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: "#16324F",
                  }}
                >
                  Folio
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: "#16324F",
                  }}
                >
                  Área
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: "#16324F",
                  }}
                >
                  Checklist
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: "#16324F",
                  }}
                >
                  Responsable
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: "#16324F",
                  }}
                >
                  Fecha
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: "#16324F",
                  }}
                >
                  Estado
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: "#16324F",
                  }}
                >
                  Avance
                </TableCell>

                <TableCell />
              </TableRow>
            </TableHead>

            <TableBody>
              {inspecciones.map((inspeccion) => {
                const estado = getEstadoColor(inspeccion.estado);

                return (
                  <TableRow
                    key={inspeccion.id}
                    hover
                    sx={{
                      "&:last-child td": {
                        borderBottom: 0,
                      },
                    }}
                  >
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#16324F",
                        }}
                      >
                        {inspeccion.id}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#273746",
                        }}
                      >
                        {inspeccion.area}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "#81909D" }}>{inspeccion.planta}</Typography>
                      {inspeccion.linea && <Typography sx={{ fontSize: 12, color: "#81909D" }}>{inspeccion.linea}</Typography>}
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: "#81909D",
                        }}
                      >
                        {inspeccion.tipo}
                      </Typography>
                      {inspeccion.version && <Typography sx={{ fontSize: 12, color: "#81909D" }}>Versión {inspeccion.version}</Typography>}
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: "#273746",
                        }}
                      >
                        {inspeccion.responsable}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: "#81909D",
                        }}
                      >
                        {inspeccion.fecha}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={inspeccion.estado}
                        size="small"
                        sx={{
                          color: estado.color,
                          backgroundColor: estado.background,
                          fontWeight: 600,
                          borderRadius: 1.5,
                        }}
                      />
                    </TableCell>

                    <TableCell sx={{ minWidth: 130 }}>
                      <Stack spacing={0.5}>
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#273746",
                          }}
                        >
                          {inspeccion.avance === null
                            ? "No aplica"
                            : `${inspeccion.avance}%`}
                        </Typography>

                        {inspeccion.avance !== null && <Typography sx={{ fontSize: 11, color: "#81909D" }}>{inspeccion.respondidas} de {inspeccion.obligatorias}</Typography>}
                        <Box
                          sx={{
                            width: "100%",
                            height: 5,
                            backgroundColor: "#E6EDF2",
                            borderRadius: 10,
                            overflow: "hidden",
                          }}
                        >
                          {inspeccion.avance !== null && (
                            <Box
                              sx={{
                                width: `${inspeccion.avance}%`,
                                height: "100%",
                                backgroundColor:
                                  inspeccion.estado === "Completada" ||
                                    inspeccion.estado === "Confirmada"
                                    ? "#16803C"
                                    : "#0F9D8A",
                                borderRadius: 10,
                              }}
                            />
                          )}
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => {
                          limpiarAccesoDirecto();
                          setInspeccionSeleccionada(inspeccion);
                        }}
                        sx={{
                          color: "#16324F",
                          fontWeight: 600,
                          textTransform: "none",
                        }}
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

              {inspecciones.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    align="center"
                    sx={{
                      py: 6,
                    }}
                  >
                    <Typography
                      sx={{
                        color: "#81909D",
                        fontSize: 14,
                      }}
                    >
                      No se encontraron inspecciones.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* DETALLE DE LA INSPECCIÓN: datos obtenidos desde la API */}
      <Dialog
        open={Boolean(inspeccionSeleccionada)}
        onClose={cerrarDetalle}
        fullWidth
        maxWidth="md"
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        {inspeccionSeleccionada && (() => {
          const resumen = detalleReal ? convertirInspeccionApi(detalleReal) : inspeccionSeleccionada;
          const estadoDetalle = getEstadoColor(resumen.estado);
          const preguntas = checklistReal?.sections.flatMap((seccion) =>
            seccion.questions.map((pregunta) => ({ ...pregunta, seccion: seccion.name }))
          ) ?? [];
          const respuestasPorPregunta = new Map(
            respuestasReales.map((respuesta) => [respuesta.question_id, respuesta])
          );
          const respondidas = preguntas.filter((pregunta) => {
            const respuesta = respuestasPorPregunta.get(pregunta.id);
            return respuesta && respuesta.answer !== null && respuesta.answer.trim() !== "";
          }).length;
          const fecha = detalleReal?.completed_at ?? detalleReal?.started_at;
          const fechaLegible = fecha
            ? new Date(fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
            : "No disponible";
          const campos = [
            ["Área de trabajo", resumen.area],
            ["Planta", resumen.planta],
            ["Línea de producción", resumen.linea || "No aplica"],
            ["Checklist", resumen.tipo],
            ["Versión", resumen.version ?? "No disponible"],
            ["Inspector responsable", detalleReal?.inspector_name?.trim() || detalleReal?.user_id || "No disponible"],
            ["Fecha", fechaLegible],
            ["Avance", textoAvance(resumen)],
            ["Estado", resumen.estado],
          ];

          return (
            <>
              <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{
                  display: "flex", flexDirection: { xs: "column", sm: "row" },
                  justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 1
                }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: "#0F9D8A", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                      DETALLE DE INSPECCIÓN
                    </Typography>
                    <Typography variant="h6" sx={{ color: "#16324F", fontWeight: 700, overflowWrap: "anywhere" }}>
                      {inspeccionSeleccionada.id}
                    </Typography>
                  </Box>
                  <Chip label={resumen.estado} sx={{
                    color: estadoDetalle.color, backgroundColor: estadoDetalle.background, fontWeight: 700
                  }} />
                </Box>
              </DialogTitle>
              <DialogContent dividers>
                {cargandoDetalle && <Alert severity="info" sx={{ mb: 2 }}>Cargando detalle de la inspección...</Alert>}
                {errorDetalle && <Alert severity="error" sx={{ mb: 2 }}>No fue posible cargar el detalle. {errorDetalle}</Alert>}
                {!cargandoDetalle && !errorDetalle && detalleReal && checklistReal && (
                  <Stack spacing={3}>
                    <Box>
                      <Typography sx={{ color: "#16324F", fontWeight: 700, mb: 1.5 }}>
                        Información general
                      </Typography>
                      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
                        {campos.map(([label, value]) => (
                          <Box key={label} sx={{ p: 1.5, bgcolor: "#F8FAFC", borderRadius: 2, minWidth: 0 }}>
                            <Typography sx={{ color: "#81909D", fontSize: 12, mb: 0.5 }}>{label}</Typography>
                            <Typography sx={{ color: "#16324F", fontWeight: 600, overflowWrap: "anywhere" }}>
                              {value}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    <Divider />

                    <Box>
                      <Typography sx={{ color: "#16324F", fontWeight: 700, mb: 1 }}>Objetivo y alcance</Typography>
                      <Typography sx={{ color: "#526477", fontSize: 14, lineHeight: 1.7 }}>
                        {checklistReal.checklist.name
                          ? `Verificar los puntos del checklist «${checklistReal.checklist.name}» (versión ${checklistReal.checklist_version.version}).`
                          : "No hay una descripción de objetivo disponible para esta inspección."}
                      </Typography>
                    </Box>

                    <Divider />

                    <Box>
                      <Typography sx={{ color: "#16324F", fontWeight: 700, mb: 1.5 }}>
                        Checklist y respuestas ({respondidas}/{preguntas.length} respuestas registradas)
                      </Typography>
                      {checklistReal.sections.length === 0 && (
                        <Alert severity="info">Esta versión del checklist no contiene secciones.</Alert>
                      )}
                      {checklistReal.sections.map((seccion) => (
                        <Box key={seccion.id} sx={{ mb: 2 }}>
                          <Typography sx={{ color: "#16324F", fontWeight: 700, mb: 1 }}>
                            {seccion.name}
                          </Typography>
                          <Stack spacing={1}>
                            {seccion.questions.map((pregunta) => {
                              const respuesta = respuestasPorPregunta.get(pregunta.id);
                              return (
                                <Box key={pregunta.id} sx={{ border: "1px solid #E1E8EF", borderRadius: 2, p: 2 }}>
                                  <Typography sx={{ fontWeight: 600, color: "#273746", mb: 0.5 }}>
                                    {pregunta.question_text}
                                  </Typography>
                                  <Typography sx={{ fontSize: 13, color: respuesta ? "#16324F" : "#81909D" }}>
                                    Respuesta: {respuesta?.answer ?? "Sin responder"}
                                  </Typography>
                                  {respuesta?.observation && (
                                    <Typography sx={{ fontSize: 12, color: "#526477", mt: 0.5 }}>
                                      Observación: {respuesta.observation}
                                    </Typography>
                                  )}
                                </Box>
                              );
                            })}
                          </Stack>
                        </Box>
                      ))}
                    </Box>

                    <Divider />

                    <Box>
                      <Typography sx={{ color: "#16324F", fontWeight: 700, mb: 1 }}>
                        Incidencias detectadas {errorIncidencias ? "" : `(${incidenciasReales.length})`}
                      </Typography>
                      {errorIncidencias ? (
                        <Alert severity="warning">No se pudieron cargar las incidencias: {errorIncidencias}</Alert>
                      ) : incidenciasReales.length === 0 ? (
                        <Alert severity="info">No se encontraron incidencias asociadas entre los registros accesibles.</Alert>
                      ) : (
                        <Stack spacing={1.5}>
                          {incidenciasReales.map((incident) => (
                            <Box key={incident.id} sx={{ border: "1px solid #E1E8EF", borderRadius: 2, p: 2 }}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                                <Typography sx={{ color: "#16324F", fontWeight: 700 }}>{incident.title}</Typography>
                                <Chip size="small" label={{ low: "Bajo", medium: "Medio", high: "Alto", critical: "Crítico" }[incident.risk_level]} color={incident.risk_level === "critical" || incident.risk_level === "high" ? "error" : incident.risk_level === "medium" ? "warning" : "info"} />
                              </Box>
                              <Typography sx={{ color: "#526477", fontSize: 14, my: 1, whiteSpace: "pre-wrap" }}>{incident.description}</Typography>
                              <Typography sx={{ color: "#526477", fontSize: 13 }}>
                                Estado: {({ open: "Abierta", in_progress: "En proceso", resolved: "Resuelta", closed: "Cerrada" } as Record<string, string>)[incident.status]}
                              </Typography>
                              <Typography sx={{ color: "#526477", fontSize: 13 }}>
                                Ubicación: {incident.location_description || resumen.area}
                              </Typography>
                              <Typography sx={{ color: "#526477", fontSize: 13 }}>
                                Reportada: {incident.reported_at ? new Date(incident.reported_at).toLocaleDateString("es-MX") : "Sin fecha"}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Box>

                    <Divider />

                    <Box>
                      <Typography sx={{ color: "#16324F", fontWeight: 700, mb: 1 }}>
                        Observaciones del inspector
                      </Typography>
                      <Typography sx={{ color: "#526477", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                        {detalleReal.observations?.trim() || "No hay observaciones registradas."}
                      </Typography>
                      {detalleReal.supervisor_observations && (
                        <>
                          <Typography sx={{ color: "#16324F", fontWeight: 700, mt: 2, mb: 1 }}>
                            Observaciones del supervisor
                          </Typography>
                          <Typography sx={{ color: "#526477", fontSize: 14, whiteSpace: "pre-wrap" }}>
                            {detalleReal.supervisor_observations}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Stack>
                )}
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button
                  onClick={cerrarDetalle}
                  variant="contained"
                  sx={{ bgcolor: "#16324F", textTransform: "none", "&:hover": { bgcolor: "#234766" } }}
                >
                  Cerrar detalle
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

    </Box>
  );
}


type SummaryCardProps = {
  title: string;
  value: number;
  icon: ReactNode;
  iconColor: string;
  iconBackground: string;
};

function SummaryCard({
  title,
  value,
  icon,
  iconColor,
  iconBackground,
}: SummaryCardProps) {
  return (
    <Card
      sx={{
        border: "none",
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          py: "18px !important",
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: iconColor,
            backgroundColor: iconBackground,
          }}
        >
          {icon}
        </Box>

        <Box>
          <Typography
            sx={{
              fontSize: 12,
              color: "#81909D",
              mb: 0.3,
            }}
          >
            {title}
          </Typography>

          <Typography
            sx={{
              fontSize: 24,
              fontWeight: 700,
              color: "#16324F",
              lineHeight: 1,
            }}
          >
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}