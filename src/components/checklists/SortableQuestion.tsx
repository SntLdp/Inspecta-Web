
import {
    Box,
    Chip,
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
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import LinkIcon from "@mui/icons-material/Link";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { QUESTION_TYPE_LABELS } from "../../types/checklists";
import type { ChecklistQuestion } from "../../types/checklists";

const NAVY = "#16324F";
const GREEN = "#0F9D8A";

interface Props {
    question: ChecklistQuestion;
    index: number;
    total: number;
    editable: boolean;
    disabled: boolean;
    orderChanged: boolean;
    onEdit: (question: ChecklistQuestion) => void;
    onView: (question: ChecklistQuestion) => void;
    onStatus: (question: ChecklistQuestion) => void;
    onNormRequirements: (question: ChecklistQuestion) => void;
    onMove: (from: number, to: number) => void;
}

export default function SortableQuestion({
    question,
    index,
    total,
    editable,
    disabled,
    orderChanged,
    onEdit,
    onView,
    onStatus,
    onNormRequirements,
    onMove,
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
        id: question.id,
        disabled: !editable || disabled,
    });

    const displayOrder = orderChanged
        ? index + 1
        : question.display_order;

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
                bgcolor: isDragging
                    ? "#F0FAF8"
                    : question.status
                        ? "#FFFFFF"
                        : "#F8FAFC",
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
                    <Tooltip title="Arrastrar pregunta">
                        <span>
                            <IconButton
                                ref={setActivatorNodeRef}
                                {...attributes}
                                {...listeners}
                                disabled={disabled}
                                aria-label={`Arrastrar pregunta ${displayOrder}`}
                                sx={{
                                    color: "#81909D",
                                    cursor: isDragging
                                        ? "grabbing"
                                        : "grab",
                                    touchAction: "none",
                                }}
                            >
                                <DragIndicatorIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                )}

                <Box
                    sx={{
                        minWidth: 40,
                        height: 40,
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
                            fontSize: 14,
                            overflowWrap: "anywhere",
                        }}
                    >
                        {question.question_text}
                    </Typography>

                    {question.description && (
                        <Typography
                            sx={{
                                mt: 0.5,
                                fontSize: 12,
                                color: "#526477",
                                whiteSpace: "pre-wrap",
                                overflowWrap: "anywhere",
                            }}
                        >
                            {question.description}
                        </Typography>
                    )}

                    <Stack
                        direction="row"
                        useFlexGap
                        spacing={0.75}
                        sx={{
                            flexWrap: "wrap",
                            mt: 1.25,
                        }}
                    >
                        <Chip
                            size="small"
                            label={
                                QUESTION_TYPE_LABELS[
                                question.answer_type
                                ]
                            }
                            sx={{
                                bgcolor: "#E8EFF5",
                                color: NAVY,
                                fontWeight: 600,
                            }}
                        />

                        <Chip
                            size="small"
                            label={
                                question.status
                                    ? "Activa"
                                    : "Inactiva"
                            }
                            color={
                                question.status
                                    ? "success"
                                    : "default"
                            }
                            variant="outlined"
                            clickable={
                                editable &&
                                !disabled &&
                                !orderChanged
                            }
                            onClick={
                                editable &&
                                    !disabled &&
                                    !orderChanged
                                    ? () => onStatus(question)
                                    : undefined
                            }
                        />

                        <Chip
                            size="small"
                            variant="outlined"
                            label={
                                question.required
                                    ? "Obligatoria"
                                    : "Opcional"
                            }
                        />

                        {question.allows_evidence && (
                            <Chip
                                size="small"
                                variant="outlined"
                                icon={<CameraAltOutlinedIcon />}
                                label="Evidencias"
                            />
                        )}

                        {question.answer_type === "multiple_choice" && (
                            <Chip
                                size="small"
                                variant="outlined"
                                label={`${question.options?.length ?? 0} opciones`}
                            />
                        )}
                    </Stack>
                </Box>

                <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                        alignItems: "center",
                        flexShrink: 0,
                    }}
                >
                    <Tooltip title="Consultar pregunta">
                        <span>
                            <IconButton
                                size="small"
                                disabled={disabled}
                                onClick={() => onView(question)}
                                sx={{ color: NAVY }}
                            >
                                <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>

                    {/* Vinculaciones normativas */}
                    <Tooltip
                        title={
                            orderChanged
                                ? "Guarda o descarta los cambios de orden"
                                : editable
                                    ? "Administrar vinculaciones normativas"
                                    : "Consultar vinculaciones normativas"
                        }
                    >
                        <span>
                            <IconButton
                                size="small"
                                disabled={disabled || orderChanged}
                                onClick={() =>
                                    onNormRequirements(question)
                                }
                                aria-label="Vinculaciones normativas"
                                sx={{
                                    color: editable ? GREEN : NAVY,
                                }}
                            >
                                <LinkIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>

                    {editable && (
                        <>
                            <Tooltip title="Editar pregunta">
                                <span>
                                    <IconButton
                                        size="small"
                                        disabled={
                                            disabled || orderChanged
                                        }
                                        onClick={() => onEdit(question)}
                                        sx={{ color: GREEN }}
                                    >
                                        <EditOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>

                            <Stack spacing={0}>
                                <Tooltip title="Subir pregunta">
                                    <span>
                                        <IconButton
                                            size="small"
                                            disabled={
                                                disabled || index === 0
                                            }
                                            onClick={() =>
                                                onMove(index, index - 1)
                                            }
                                            sx={{ color: NAVY }}
                                        >
                                            <KeyboardArrowUpIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>

                                <Tooltip title="Bajar pregunta">
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
                        </>
                    )}
                </Stack>
            </Box>
        </Paper>
    );
}
