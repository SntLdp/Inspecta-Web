import {
    Box,
    Chip,
    Divider,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";

import LinkOffIcon from "@mui/icons-material/LinkOff";

import type {
    QuestionNormRequirement,
} from "../../services/questionNormRequirements.service";

const NAVY = "#16324F";
const GREEN = "#0F9D8A";

interface Props {
    link: QuestionNormRequirement;
    editable: boolean;
    disabled: boolean;
    onUnlink: (link: QuestionNormRequirement) => void;
}

export default function LinkedNormRequirementCard({
    link,
    editable,
    disabled,
    onUnlink,
}: Props) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                borderRadius: 2,
                borderColor: "#DCE6EE",
            }}
        >
            <Stack spacing={1.5}>
                {/* Identificación de la norma padre */}
                <Box
                    sx={{
                        bgcolor: "#F4F7FA",
                        borderRadius: 2,
                        p: 1.5,
                    }}
                >
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <Typography
                            sx={{
                                fontWeight: 700,
                                color: GREEN,
                                fontSize: 13,
                                overflowWrap: "anywhere",
                            }}
                        >
                            {link.norm_code}

                            {link.norm_version
                                ? ` · ${link.norm_version}`
                                : ""}
                        </Typography>

                        <Chip
                            size="small"
                            label={
                                link.norm_status
                                    ? "Norma activa"
                                    : "Norma inactiva"
                            }
                            color={
                                link.norm_status
                                    ? "success"
                                    : "default"
                            }
                            variant="outlined"
                        />
                    </Stack>

                    <Typography
                        sx={{
                            fontSize: 12,
                            color: NAVY,
                            mt: 0.5,
                            overflowWrap: "anywhere",
                        }}
                    >
                        {link.norm_name}
                    </Typography>
                </Box>

                {/* Identificación del requisito */}
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            sx={{
                                fontWeight: 700,
                                color: NAVY,
                                fontSize: 14,
                                overflowWrap: "anywhere",
                            }}
                        >
                            Requisito {link.code}
                        </Typography>

                        {link.section && (
                            <Typography
                                sx={{
                                    color: "text.secondary",
                                    fontSize: 12,
                                }}
                            >
                                {link.section}
                            </Typography>
                        )}
                    </Box>

                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            alignItems: "center",
                            flexShrink: 0,
                        }}
                    >
                        <Chip
                            size="small"
                            label="Vinculado"
                            color="success"
                            variant="outlined"
                        />

                        {editable && (
                            <Tooltip title="Desvincular requisito">
                                <span>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        disabled={disabled}
                                        onClick={() =>
                                            onUnlink(link)
                                        }
                                    >
                                        <LinkOffIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                    </Stack>
                </Stack>

                <Divider />

                <Typography
                    sx={{
                        fontSize: 13,
                        color: NAVY,
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                    }}
                >
                    {link.description}
                </Typography>

                {!link.norm_status && (
                    <Typography
                        sx={{
                            fontSize: 12,
                            color: "text.secondary",
                            fontStyle: "italic",
                        }}
                    >
                        La norma está inactiva.
                        La vinculación existente se conserva.
                    </Typography>
                )}
            </Stack>
        </Paper>
    );
}