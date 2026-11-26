import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, Divider, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { Business, Save, Refresh } from "@mui/icons-material";
import { apiRequest, ApiError } from "../api/client";
import { getAllLocationPlants } from "../services/locations.service";
import { updateAdministrationUserLocations } from "../services/users.services";
import type { AdministrationUser } from "../types/administration";
import type { LocationPlant } from "../types/locations";

interface Props {
  user: AdministrationUser;
  disabled: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
  onSaved: (user: AdministrationUser, message: string) => void;
}
interface Capabilities {
  administration: {
    manage_users: boolean;
    view_locations: boolean;
    manage_locations: boolean;
    view_all_locations: boolean;
    assign_locations: boolean;
  };
}
function same(a: string[], b: string[]) {
  return a.length === b.length && a.every(id => b.includes(id));
}
function message(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}
export default function UserLocationsEditor({ user, disabled, onDirtyChange, onSavingChange, onSaved }: Props) {
  const originalPlants = user.locations.plants.map(p => p.id);
  const originalAreas = user.locations.areas.map(a => a.id);
  const [plantIds, setPlantIds] = useState(originalPlants);
  const [areaIds, setAreaIds] = useState(originalAreas);
  const [plants, setPlants] = useState<LocationPlant[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities["administration"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ severity: "success" | "error"; message: string } | null>(null);
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(0);
  const dirty = !same(plantIds, originalPlants) || !same(areaIds, originalAreas);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setCapabilities(null);
    async function load() {
      try {
        const result = await apiRequest<Capabilities>("/auth/capabilities", { signal: controller.signal });
        if (controller.signal.aborted) return;
        setCapabilities(result.administration);
        if (result.administration.view_locations) {
          const data = await getAllLocationPlants(controller.signal);
          if (!controller.signal.aborted) setPlants(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(message(err, "No fue posible consultar las ubicaciones."));
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [user.id, version]);
  // A full replacement is only offered to actors with unrestricted location visibility.
  const canEdit = Boolean(capabilities?.manage_users && capabilities.view_locations && capabilities.manage_locations && capabilities.assign_locations && capabilities.view_all_locations && user.account_status && user.membership.status === "active" && !loading && !error);
  const locked = disabled || saving || !canEdit;
  const knownPlants = new Set(plants.map(p => p.id));
  const knownAreas = new Set(plants.flatMap(p => p.areas.map(a => a.id)));
  const missingPlants = user.locations.plants.filter(p => !knownPlants.has(p.id));
  const missingAreas = user.locations.areas.filter(a => !knownAreas.has(a.id));
  function toggle(id: string, kind: "plant" | "area") {
    if (locked || savingRef.current) return;
    const setter = kind === "plant" ? setPlantIds : setAreaIds;
    setter(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
    setFeedback(null);
  }
  function reset() { setPlantIds(originalPlants); setAreaIds(originalAreas); setFeedback(null); }
  async function save() {
    if (locked || !dirty || savingRef.current) return;
    savingRef.current = true; setSaving(true); onSavingChange(true); setFeedback(null);
    try {
      const { data } = await updateAdministrationUserLocations(user.id, { plant_ids: plantIds, area_ids: areaIds });
      setPlantIds(data.locations.plants.map(p => p.id));
      setAreaIds(data.locations.areas.map(a => a.id));
      const text = "Las ubicaciones se actualizaron correctamente.";
      setFeedback({ severity: "success", message: text });
      onSaved(data, text);
    } catch (err) {
      setFeedback({ severity: "error", message: message(err, "No fue posible actualizar las ubicaciones.") });
    } finally { savingRef.current = false; setSaving(false); onSavingChange(false); }
  }
  const q = search.trim().toLocaleLowerCase("es");
  const matches = (value: string) => value.toLocaleLowerCase("es").includes(q);
  const visiblePlants = plants.filter(p => matches(`${p.name} ${p.code}`) || p.areas.some(a => matches(`${a.name} ${a.code}`)));
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Business sx={{ color: "#2673C9" }} />
        <Box><Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#16324F" }}>Ubicaciones asignadas</Typography><Typography variant="body2" color="text.secondary">Administra las asignaciones directas del usuario.</Typography></Box>
      </Stack>
      <Alert severity="info">Asignar una planta concede visibilidad sobre sus áreas y líneas. Las áreas también pueden asignarse individualmente.</Alert>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        <Chip label={`${plantIds.length} plantas asignadas`} />
        <Chip label={`${areaIds.length} áreas asignadas`} />
      </Stack>
      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="error" action={<Button color="inherit" onClick={() => setVersion(v => v + 1)} startIcon={<Refresh />} disabled={disabled || dirty}>Reintentar</Button>}>{error}</Alert>}
      {!loading && !error && !canEdit && <Alert severity="info">Consulta de solo lectura. La edición requiere una cuenta y membresía activas, permisos de asignación y visibilidad general de ubicaciones.</Alert>}
      <TextField size="small" fullWidth label="Buscar planta o área" value={search} onChange={e => setSearch(e.target.value)} />
      <Box sx={{ maxHeight: 420, overflowY: "auto" }}>
        <Stack spacing={1.5}>
          {visiblePlants.map(plant => (
            <Box key={plant.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
              <FormControlLabel control={<Checkbox checked={plantIds.includes(plant.id)} disabled={locked || (!plant.available && !originalPlants.includes(plant.id))} onChange={() => toggle(plant.id, "plant")} />} label={<Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}><Typography sx={{ fontWeight: 700 }}>{plant.name}</Typography><Chip size="small" label={plant.available ? "Activa" : "No disponible"} /></Stack>} />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", pl: 4 }}>{plant.code}</Typography>
              {plant.areas.length > 0 && <Divider sx={{ my: 1 }} />}
              <Stack sx={{ pl: 3 }}>
                {plant.areas.filter(a => matches(`${plant.name} ${plant.code}`) || matches(`${a.name} ${a.code}`)).map(area => (
                  <FormControlLabel key={area.id} control={<Checkbox checked={areaIds.includes(area.id)} disabled={locked || (!area.available && !originalAreas.includes(area.id))} onChange={() => toggle(area.id, "area")} />} label={<Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}><Typography variant="body2">{area.name}</Typography>{!area.available && <Chip size="small" label="No disponible" />}{plantIds.includes(plant.id) && <Typography variant="caption" color="text.secondary">Acceso por planta</Typography>}</Stack>} />
                ))}
              </Stack>
            </Box>
          ))}
          {!loading && !error && visiblePlants.length === 0 && <Typography variant="body2" color="text.secondary">No hay ubicaciones que coincidan con la búsqueda.</Typography>}
        </Stack>
      </Box>
      {(missingPlants.length > 0 || missingAreas.length > 0) && <Box><Typography variant="subtitle2">Asignaciones existentes fuera del catálogo visible</Typography><Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 1 }}>{missingPlants.map(p => <Chip key={p.id} label={p.name} />)}{missingAreas.map(a => <Chip key={a.id} label={a.name} />)}</Stack><Typography variant="caption" color="text.secondary">Se conservan en la solicitud; no se retiran automáticamente.</Typography></Box>}
      {dirty && <Alert severity="warning">Tienes cambios de ubicaciones pendientes de guardar.</Alert>}
      {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
      <Stack direction="row" spacing={2} useFlexGap sx={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
        <Button disabled={!dirty || saving} onClick={reset}>Descartar cambios</Button>
        <Button variant="contained" disabled={locked || !dirty} startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />} onClick={() => void save()}>{saving ? "Guardando..." : "Guardar ubicaciones"}</Button>
      </Stack>
    </Stack>
  );
}
