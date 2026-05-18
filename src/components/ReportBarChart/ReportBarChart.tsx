import React from "react";
import { Box, Typography } from "@mui/material";

export type ReportBarChartPoint = {
  label: string;
  value: number;
  tooltipTitle?: string;
  tooltipLines?: string[];
};

type ReportBarChartProps = {
  title: string;
  yAxisLabel?: string;
  points: ReportBarChartPoint[];
  height?: number;
  formatValue?: (value: number) => string;
};

const defaultFormat = (value: number): string =>
  value.toLocaleString("en-US", { maximumFractionDigits: 0 });

const ReportBarChart: React.FC<ReportBarChartProps> = ({
  title,
  yAxisLabel = "Amount",
  points,
  height = 300,
  formatValue = defaultFormat,
}) => {
  const [hover, setHover] = React.useState<{
    clientX: number;
    clientY: number;
    point: ReportBarChartPoint;
  } | null>(null);

  const padding = { top: 30, right: 16, bottom: 50, left: 52 };
  const max = Math.max(1, ...points.map((p) => p.value));
  const w = 1000;
  const h = height;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const gap =
    points.length > 1
      ? Math.max(2, Math.min(10, chartW / points.length / 6))
      : 0;
  const barW =
    points.length > 0 ? (chartW - gap * (points.length - 1)) / points.length : 0;

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "#0f1318",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          height={height}
          role="img"
          aria-label={title}
        >
          <rect x={0} y={0} width={w} height={h} fill="#0f1318" />
          <text
            x={padding.left}
            y={22}
            fill="rgba(255,255,255,0.92)"
            fontSize="16"
            fontFamily="system-ui, sans-serif"
            fontWeight={700}
          >
            {title}
          </text>
          <text
            x={14}
            y={padding.top + chartH / 2}
            fill="rgba(255,255,255,0.55)"
            fontSize="11"
            fontFamily="system-ui, sans-serif"
            transform={`rotate(-90 14 ${padding.top + chartH / 2})`}
            textAnchor="middle"
          >
            {yAxisLabel}
          </text>

          {Array.from({ length: 5 }).map((_, i) => {
            const y = padding.top + (chartH / 4) * i;
            const v = Math.round((max * (4 - i)) / 4);
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={padding.left}
                  x2={w - padding.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="rgba(255,255,255,0.6)"
                  fontSize="11"
                  textAnchor="end"
                  fontFamily="system-ui, sans-serif"
                >
                  {formatValue(v)}
                </text>
              </g>
            );
          })}

          {points.map((p, idx) => {
            const x = padding.left + idx * (barW + gap);
            const barHeight = Math.round((p.value / max) * chartH);
            const y = padding.top + (chartH - barHeight);
            return (
              <g key={`${p.label}-${idx}`}>
                <rect
                  x={x}
                  y={y}
                  width={Math.max(barW, 1)}
                  height={barHeight}
                  fill="#4f8cff"
                  rx={2}
                  onMouseEnter={(e) =>
                    setHover({
                      clientX: e.clientX,
                      clientY: e.clientY,
                      point: p,
                    })
                  }
                  onMouseMove={(e) =>
                    setHover({
                      clientX: e.clientX,
                      clientY: e.clientY,
                      point: p,
                    })
                  }
                  onMouseLeave={() => setHover(null)}
                />
                <text
                  x={x + barW / 2}
                  y={h - 16}
                  fill="rgba(255,255,255,0.65)"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="system-ui, sans-serif"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </Box>

      {hover ? (
        <Box
          sx={{
            position: "fixed",
            left: hover.clientX + 12,
            top: hover.clientY + 12,
            zIndex: 1400,
            bgcolor: "rgba(15,19,24,0.96)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 1,
            px: 1.25,
            py: 0.75,
            pointerEvents: "none",
            maxWidth: 280,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
            {hover.point.tooltipTitle ?? hover.point.label}
          </Typography>
          {(hover.point.tooltipLines ?? []).map((line) => (
            <Typography key={line} variant="caption" sx={{ display: "block" }}>
              {line}
            </Typography>
          ))}
          <Typography variant="caption" sx={{ display: "block" }}>
            Total: {formatValue(hover.point.value)}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
};

export default ReportBarChart;
