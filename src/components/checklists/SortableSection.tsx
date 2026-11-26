import {
    Box,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";

import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { ChecklistSection } from "../../types/checklists";

const NAVY = "#16324F";
const GREEN = "#0F9D8A";

interface Props {
    section: ChecklistSection;
    index: number;
    total: number;
    editable: boolean;
    disabled: boolean;
    orderChanged: boolean;
    onEdit: (section: ChecklistSection) => void;
    onMove: (from: number, to: number) => void;
    onQuestions: (section: ChecklistSection) => void;
}

export default function SortableSection({
    section,
    index,
    total,
    editable,
    disabled,
    orderChanged,
    onEdit,
    onMove,
    onQuestions,
}: Props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: section.id,
        disabled: !editable || disabled,
    });

    const displayOrder = orderChanged
        ? index + 1
        : section.display_order;

    return (
        <Paper
            ref={setNodeRef}
            variant="outlined"
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            sx={{
                p: 2,
                borderRadius: 3,
                borderColor: isDragging ? GREEN : "#DCE6EE",
                bgcolor: isDragging ? "#F0FAF8" : "#FFFFFF",
                position: "relative",
                zIndex: isDragging ? 10 : 1,
                boxShadow: isDragging
                    ? "0 6px 20px rgba(0,0,0,0.12)"
                    : "none",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                }}
            >
                {editable && (
                    <Tooltip title="Arrastrar sección">
                        <span>
                            <IconButton
                                ref={setActivatorNodeRef}
                                {...attributes}
                                {...listeners}
                                disabled={disabled}
                                aria-label={`Arrastrar ${section.name}`}
                                sx={{
                                    color: "#81909D",
                                    cursor: isDragging
                                        ? "grabbing"
                                        : "grab",
                                    touchAction: "none",
                                    "&:hover": {
                                        color: GREEN,
                                    },
                                }}
                            >
                                <DragIndicatorIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                )}

                <Box
                    sx={{
                        minWidth: 42,
                        height: 42,
                        px: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 2,
                        bgcolor: "#0F9D8A15",
                        color: GREEN,
                        fontWeight: 700,
                    }}
                >
                    {displayOrder}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        sx={{
                            color: NAVY,
                            fontWeight: 700,
                            fontSize: 15,
                            overflowWrap: "anywhere",
                        }}
                    >
                        {section.name}
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: 13,
                            color: "#526477",
                            mt: 0.5,
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                        }}
                    >
                        {section.description || "Sin descripción."}
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: 12,
                            color: "#81909D",
                            mt: 1,
                        }}
                    >
                        Posición: {displayOrder}
                    </Typography>
                </Box>

                <Tooltip
                    title={
                        editable
                            ? "Administrar preguntas"
                            : "Consultar preguntas"
                    }
                >
                    <span>
                        <IconButton
                            size="small"
                            disabled={disabled || orderChanged}
                            onClick={() => onQuestions(section)}
                            sx={{ color: NAVY }}
                        >
                            <QuizOutlinedIcon />
                        </IconButton>
                    </span>
                </Tooltip>

                {editable && (
                    <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ alignItems: "center" }}
                    >
                        <Tooltip title="Editar sección">
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={disabled || orderChanged}
                                    onClick={() => onEdit(section)}
                                    sx={{ color: GREEN }}
                                >
                                    <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Stack spacing={0}>
                            <Tooltip title="Subir sección">
                                <span>
                                    <IconButton
                                        size="small"
                                        disabled={disabled || index === 0}
                                        onClick={() =>
                                            onMove(index, index - 1)
                                        }
                                        sx={{ color: NAVY }}
                                    >
                                        <KeyboardArrowUpIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>

                            <Tooltip title="Bajar sección">
                                <span>
                                    <IconButton
                                        size="small"
                                        disabled={
                                            disabled ||
                                            index === total - 1
                                        }
                                        onClick={() =>
                                            onMove(index, index + 1)
                                        }
                                        sx={{ color: NAVY }}
                                    >
                                        <KeyboardArrowDownIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                    </Stack>
                )}
            </Box>
        </Paper>
    );
}
