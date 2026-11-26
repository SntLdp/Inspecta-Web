import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/auth.service";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
  Alert,
} from "@mui/material";

import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlined";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [recordarme, setRecordarme] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const modoDemo = import.meta.env.VITE_DEMO_LOGIN === "true";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");


    setCargando(true);

    try {
      if (modoDemo) {
        // Solo para desarrollo del frontend mientras la API no está disponible.
        localStorage.setItem("inspecta_token", "demo-token");
        localStorage.setItem(
          "inspecta_user",
          JSON.stringify({
            id: 1,
            name: "Usuario de demostración",
            email: correo.trim(),
            role: "Inspector",
          })
        );
        navigate("/dashboard", { replace: true });
        return;
      }

      await login(correo.trim(), password);
      navigate("/seleccionar-organizacion", { replace: true });
    } catch (error: unknown) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "No fue posible iniciar sesión. Verifica la conexión con la API e inténtalo nuevamente."
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        width: "100%",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "48% 52%" },
        backgroundColor: "#F4F7FA",
      }}
    >
      {/* =====================================================
          PANEL IZQUIERDO
          ===================================================== */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          minHeight: "100dvh",
          backgroundColor: "#16324F",
          color: "#FFFFFF",
          px: { md: 6, lg: 8 },
          py: 4,
          flexDirection: "column",
          justifyContent: "flex-start",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Marca */}
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.5,
                backgroundColor: "#0F9D8A",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ShieldOutlinedIcon sx={{ fontSize: 21 }} />
            </Box>

            <Typography
              sx={{
                fontSize: 21,
                fontWeight: 700,
                letterSpacing: "-0.4px",
              }}
            >
              Inspecta
            </Typography>
          </Box>
        </Box>

        {/* Contenido principal */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 700,
            mx: "auto",
            mt: { md: 14, lg: 16 },
            mb: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
            }}
          >
            <Box
              sx={{
                width: 20,
                height: 2,
                backgroundColor: "#0F9D8A",
              }}
            />

            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: "#9ED8D0",
                letterSpacing: ".35px",
                textTransform: "uppercase",
              }}
            >
              Seguridad e higiene laboral
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: { md: 46, lg: 54 },
              lineHeight: 1.08,
              fontWeight: 700,
              letterSpacing: "-1.2px",
              maxWidth: 700,
              mb: 2,
            }}
          >
            La prevención empieza con una
            <br />
            buena inspección.
          </Typography>

          <Typography
            sx={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "rgba(255,255,255,.72)",
              maxWidth: 480,
              mb: 3.5,
            }}
          >
            Gestiona inspecciones, identifica riesgos y da seguimiento a las
            acciones de tu equipo en un solo lugar.
          </Typography>

          {/* Imagen */}
          <Box
            sx={{
              width: "100%",
              aspectRatio: "1200 / 650",
              borderRadius: 1.5,
              overflow: "hidden",
              position: "relative",
              backgroundColor: "#284963",
              mb: 2.5,
            }}
          >
            <Box
              component="img"
              src="/inspecta-industrial-login.svg"
              alt="Entorno industrial de seguridad e higiene"
              sx={{
                width: "100%",
                height: "100%",
                display: "block",
                objectFit: "cover",
              }}
            />

            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(22,50,79,0) 35%, rgba(22,50,79,.72) 100%)",
              }}
            />

            <Box
              sx={{
                position: "absolute",
                left: 16,
                bottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <SecurityOutlinedIcon sx={{ fontSize: 17 }} />

              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Más control. Entornos más seguros.
              </Typography>
            </Box>
          </Box>

        </Box>

      </Box>

      {/* =====================================================
          PANEL DERECHO
          ===================================================== */}
      <Box
        sx={{
          minHeight: "100dvh",
          px: { xs: 3, sm: 5, md: 7, lg: 10 },
          py: { xs: 3, md: 4 },
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#F8FAFC",
        }}
      >
        {/* Ayuda */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 0.5,
            color: "#0F9D8A",
          }}
        >
          <HelpOutlineIcon sx={{ fontSize: 16 }} />

          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ¿Necesitas ayuda?
          </Typography>
        </Box>

        {/* Formulario */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 470,
            mx: "auto",
            my: "auto",
            py: 5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              mb: 1,
              color: "#0F9D8A",
            }}
          >
            <SecurityOutlinedIcon sx={{ fontSize: 15 }} />

            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: ".3px",
                textTransform: "uppercase",
              }}
            >
              Acceso a la plataforma
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: { xs: 42, md: 52 },
              lineHeight: 1.1,
              fontWeight: 700,
              color: "#16324F",
              letterSpacing: "-.7px",
            }}
          >
            Iniciar sesión
          </Typography>

          <Typography
            sx={{
              fontSize: 17,
              lineHeight: 1.6,
              color: "#81909D",
              maxWidth: 390,
              mt: 1,
              mb: 3.5,
            }}
          >
            Te damos la bienvenida a Inspecta. Ingresa con las credenciales de
            tu organización.
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
            {modoDemo && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Modo demostración activo: puedes entrar sin conectar la API.
                Este acceso es solo para desarrollo.
              </Alert>
            )}
            {loginError && <Alert severity="error" sx={{ mb: 2 }}>{loginError}</Alert>}
            <Typography
              component="label"
              htmlFor="correo"
              sx={{
                display: "block",
                fontSize: 16,
                fontWeight: 600,
                color: "#273746",
                mb: 0.75,
              }}
            >
              Correo electrónico
            </Typography>

            <TextField
              id="correo"
              type="email"
              value={correo}
              onChange={(event) => setCorreo(event.target.value)}
              placeholder="nombre@empresa.com"
              fullWidth
              required
              size="small"
              autoComplete="email"
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  height: 46,
                  borderRadius: 1,
                  backgroundColor: "#FFFFFF",
                  "& fieldset": {
                    borderColor: "#DCE6EE",
                  },
                  "&:hover fieldset": {
                    borderColor: "#9FB2C0",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#0F9D8A",
                  },
                },
                "& input": {
                  fontSize: 15,
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlineIcon
                        sx={{
                          fontSize: 18,
                          color: "#81909D",
                        }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 0.75,
              }}
            >
              <Typography
                component="label"
                htmlFor="password"
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#273746",
                }}
              >
                Contraseña
              </Typography>
            </Box>

            <TextField
              id="password"
              type={mostrarPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ingresa tu contraseña"
              fullWidth
              required
              size="small"
              autoComplete="current-password"
              sx={{
                "& .MuiOutlinedInput-root": {
                  height: 46,
                  borderRadius: 1,
                  backgroundColor: "#FFFFFF",
                  "& fieldset": {
                    borderColor: "#DCE6EE",
                  },
                  "&:hover fieldset": {
                    borderColor: "#9FB2C0",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#0F9D8A",
                  },
                },
                "& input": {
                  fontSize: 15,
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon
                        sx={{
                          fontSize: 18,
                          color: "#81909D",
                        }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setMostrarPassword(!mostrarPassword)}
                        edge="end"
                        aria-label={
                          mostrarPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                        size="small"
                      >
                        {mostrarPassword ? (
                          <VisibilityOffOutlinedIcon sx={{ fontSize: 19 }} />
                        ) : (
                          <VisibilityOutlinedIcon sx={{ fontSize: 19 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 1,
                mb: 2.5,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={recordarme}
                    onChange={(event) => setRecordarme(event.target.checked)}
                    size="small"
                    sx={{
                      color: "#B7C5CE",
                      "&.Mui-checked": {
                        color: "#0F9D8A",
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: 11.5, color: "#81909D" }}>
                    Recordarme
                  </Typography>
                }
              />

              <Link
                href="#"
                underline="none"
                sx={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#0F9D8A",
                }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </Box>

            <Button
              type="submit"
              disabled={cargando}
              fullWidth
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{
                height: 46,
                borderRadius: 1,
                backgroundColor: "#16324F",
                fontSize: 17,
                fontWeight: 700,
                "&:hover": {
                  backgroundColor: "#0F263D",
                },
              }}
            >
              {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 0.6,
                mt: 1.25,
              }}
            >
              <LockOutlinedIcon
                sx={{
                  fontSize: 15,
                  color: "#81909D",
                }}
              />

              <Typography
                sx={{
                  fontSize: 12,
                  color: "#81909D",
                }}
              >
                Acceso seguro y exclusivo para personal autorizado
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              borderTop: "1px solid #DCE6EE",
              mt: 3,
              pt: 2.5,
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 13,
                color: "#81909D",
                lineHeight: 1.5,
              }}
            >
              ¿No puedes acceder a tu cuenta?
              <br />
              Contacta al administrador de tu organización.
            </Typography>
          </Box>
        </Box>

        {/* Footer derecho */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              color: "#81909D",
            }}
          >
            © 2026 Inspecta
          </Typography>

          <Link
            href="#"
            underline="none"
            sx={{
              fontSize: 11,
              color: "#81909D",
            }}
          >
            Privacidad y protección de datos
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
1