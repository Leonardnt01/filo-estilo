"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { fetchCachedJson } from "@/lib/cache/admin-client-cache";
import * as d3 from "d3";
import { FaEarthAmericas, FaLocationDot } from "react-icons/fa6";

type Stats = {
  services: number;
  barbers: number;
  todayAppointments: number;
  pendingCount: number;
};

type Branch = {
  id: string;
  name: string;
};

type DashboardAppointment = {
  appointment_date: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
  branch_id: string;
  barber?: { full_name: string } | null;
  service?: { name: string; price: number } | null;
  branch?: { name: string } | null;
};

// ══════════════════════════════════════════
// D3 PREMIUM CHART COMPONENTS
// ══════════════════════════════════════════

// 4. D3 Pie/Donut Chart Component (Dashboard de Pizza / Barber Performance)
type PieItem = {
  label: string;
  value: number;
  color: string;
};

function PieDonutChart({ items }: { items: PieItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    label: string;
    value: string;
    percentage: string;
    color: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    label: "",
    value: "",
    percentage: "",
    color: "",
  });

  if (total === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-[var(--border-strong)] rounded-2xl">
        <p className="text-xs text-[var(--text-muted)] font-semibold">Sin datos suficientes en esta sede</p>
      </div>
    );
  }

  const width = 160;
  const height = 160;
  const radius = Math.min(width, height) / 2;
  const innerRadius = radius * 0.6; // Perfect modern donut ratio

  const pieGenerator = d3.pie<PieItem>()
    .value((d) => d.value)
    .sort(null);

  const arcs = pieGenerator(items);

  const arcGenerator = d3.arc<d3.PieArcDatum<PieItem>>()
    .innerRadius(innerRadius)
    .outerRadius(radius)
    .cornerRadius(4)
    .padAngle(0.03);

  const handleMouseMove = (e: React.MouseEvent<SVGPathElement>, arc: d3.PieArcDatum<PieItem>) => {
    const pct = total > 0 ? (arc.data.value / total) * 100 : 0;
    const [cx, cy] = arcGenerator.centroid(arc);
    const x = width / 2 + cx;
    const y = height / 2 + cy;

    setTooltip({
      visible: true,
      x,
      y,
      label: arc.data.label,
      value: `${arc.data.value} citas`,
      percentage: `${pct.toFixed(0)}%`,
      color: arc.data.color,
    });
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative group/chart">
      {/* Donut Container */}
      <div className="relative shrink-0" style={{ width, height }}>
        <svg width={width} height={height}>
          <g transform={`translate(${width / 2}, ${height / 2})`}>
            {arcs.map((arc, idx) => {
              const path = arcGenerator(arc);
              return (
                <path
                  key={idx}
                  d={path || ""}
                  fill={arc.data.color}
                  className="transition-all duration-300 hover:brightness-110 hover:scale-[1.03] cursor-pointer origin-center"
                  style={{
                    filter: `drop-shadow(0 0 4px ${arc.data.color}20)`,
                  }}
                  onMouseMove={(e) => handleMouseMove(e, arc)}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })}
          </g>
        </svg>
        {/* Total Label Center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[9px] uppercase font-black tracking-widest text-[var(--text-muted)] leading-none">Total</span>
          <span className="text-xl font-black text-[var(--text-primary)] mt-0.5">{total}</span>
          <span className="text-[9px] font-bold text-[var(--text-secondary)]">citas</span>
        </div>
      </div>

      {/* Legend Column — show every status so the rows always add up to TOTAL */}
      <div className="flex-1 space-y-1.5 w-full">
        {items.map((item, idx) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border)] last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="font-bold text-[var(--text-secondary)] truncate text-[11px]">{item.label}</span>
              </div>
              <span className="font-black text-[var(--text-primary)] text-[11px] shrink-0 pl-2">
                {item.value} <span className="text-[9px] text-[var(--text-muted)] font-bold">({pct.toFixed(0)}%)</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Centroid Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none rounded-xl bg-slate-950/95 backdrop-blur-md border border-slate-800 p-2.5 text-xs shadow-2xl transition-all duration-150 animate-fade-in flex flex-col gap-1 min-w-[110px]"
          style={{
            transform: "translate(-50%, -100%) translateY(-10px)",
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tooltip.color }} />
            <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px] truncate max-w-[80px]">{tooltip.label}</span>
          </div>
          <span className="font-black text-white text-xs leading-none">{tooltip.value}</span>
          <span className="font-bold text-[var(--accent)] text-[9px]">{tooltip.percentage} del total</span>
        </div>
      )}
    </div>
  );
}

// 5. D3 Vertical Bar Chart (Weekly Frequencies Upward)
type VerticalBarItem = {
  label: string;
  value: number;
};

function VerticalBarsChart({ items }: { items: VerticalBarItem[] }) {
  const maxVal = d3.max(items, (d) => d.value) || 0;
  
  const scale = d3.scaleLinear()
    .domain([0, Math.max(maxVal, 1)])
    .range([0, 100]); // percentage height of bar fill

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    label: string;
    value: string;
  }>({ visible: false, x: 0, y: 0, label: "", value: "" });

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent, item: VerticalBarItem) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const barRect = e.currentTarget.getBoundingClientRect();
    
    // Position tooltip centered horizontally above this bar segment
    const x = barRect.left - rect.left + barRect.width / 2;
    const y = barRect.top - rect.top;

    setTooltip({
      visible: true,
      x,
      y,
      label: item.label,
      value: `${item.value} citas`,
    });
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-1 pl-1 pr-1 border-b border-[var(--border-strong)]">
        {items.map((item, idx) => {
          const pctHeight = scale(item.value);
          return (
            <div
              key={idx}
              className="flex flex-col items-center flex-1 h-full justify-end cursor-pointer group"
              onMouseMove={(e) => handleMouseMove(e, item)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Bar Outer Track */}
              <div
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-t-lg overflow-hidden relative flex flex-col justify-end transition-all duration-300 group-hover:border-[var(--accent-border)]"
                style={{ height: "72%" }}
              >
                {/* Dynamic Gradient Fill */}
                <div
                  className="w-full rounded-t-md transition-all duration-700 bg-gradient-to-t from-[rgba(212,168,67,0.15)] via-[var(--accent)] to-[var(--accent-hover)] group-hover:brightness-110"
                  style={{
                    height: `${pctHeight}%`,
                    boxShadow: "0 0 10px rgba(212, 168, 67, 0.15)"
                  }}
                />
              </div>
              
              {/* Day Label */}
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] mt-2 text-center truncate w-full group-hover:text-[var(--accent)] transition-colors">
                {item.label.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Floating Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none rounded-xl bg-slate-950/95 backdrop-blur-md border border-slate-800 p-2.5 text-xs shadow-2xl transition-all duration-150 animate-fade-in flex flex-col gap-1 min-w-[100px]"
          style={{
            transform: "translate(-50%, -100%) translateY(-10px)",
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">{tooltip.label}</span>
          <span className="font-black text-[var(--accent)] text-xs">{tooltip.value}</span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// NEW D3 CUSTOM PREMIUM CHARTS
// ══════════════════════════════════════════

const GRADIENTS = [
  { from: "#ec4899", to: "#f43f5e" },
  { from: "#a855f7", to: "#c084fc" },
  { from: "#6366f1", to: "#818cf8" },
  { from: "#0ea5e9", to: "#38bdf8" },
  { from: "#f97316", to: "#fb923c" },
  { from: "#84cc16", to: "#a3e635" },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type BarberRevenueItem = {
  key: string;
  value: number;
  color: string;
};

function BarChartHorizontalLogo({ data, prefix = "S/ ", suffix = "" }: { data: BarberRevenueItem[]; prefix?: string; suffix?: string }) {
  const yScale = d3.scaleBand()
    .domain(data.map((d) => d.key))
    .range([0, 100])
    .padding(0.25);

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(data.map((d) => d.value)) ?? 0])
    .range([0, 100]);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    label: string;
    value: string;
    color: string;
  }>({ visible: false, x: 0, y: 0, label: "", value: "", color: "" });

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent, entry: BarberRevenueItem, index: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const barRect = e.currentTarget.getBoundingClientRect();
    
    // Position tooltip right at the end of the horizontal bar
    const x = barRect.right - rect.left;
    const y = barRect.top - rect.top + barRect.height / 2;

    const gradient = GRADIENTS[index % GRADIENTS.length];

    setTooltip({
      visible: true,
      x,
      y,
      label: entry.key,
      value: `${prefix}${entry.value.toLocaleString("es-PE", { minimumFractionDigits: prefix ? 2 : 0 })}${suffix}`,
      color: gradient.from,
    });
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-64"
      style={
        {
          "--marginTop": "0px",
          "--marginRight": "55px",
          "--marginBottom": "0px",
          "--marginLeft": "35px",
        } as React.CSSProperties
      }
    >
      {/* X Axis (Values) */}
      <div
        className="absolute inset-0
          h-[calc(100%-var(--marginTop)-var(--marginBottom))]
          translate-y-[var(--marginTop)]
          left-[var(--marginLeft)]
          right-[var(--marginRight)]
          overflow-visible z-20 pointer-events-none"
      >
        {data.map((entry, i) => {
          if (xScale(entry.value) === 0) return null;
          return (
            <span
              key={i}
              style={{
                top: `${yScale(entry.key)! + yScale.bandwidth() / 2}%`,
                left: `calc(${xScale(entry.value)}% + 8px)`,
              }}
              className="absolute text-[10px] text-[var(--text-primary)] font-black -translate-y-1/2 pointer-events-none tabular-nums whitespace-nowrap"
            >
              {prefix}{entry.value.toFixed(0)}{suffix}
            </span>
          );
        })}
      </div>

      {/* Y Axis (Barber/Service Initials Bubbles) */}
      <div
        className="absolute inset-0
          h-[calc(100%-var(--marginTop)-var(--marginBottom))]
          translate-y-[var(--marginTop)]
          overflow-visible z-30 pointer-events-none"
      >
        {data.map((entry, i) => {
          const gradient = GRADIENTS[i % GRADIENTS.length];
          return (
            <div
              key={i}
              className="absolute rounded-full overflow-hidden size-7 text-[10px] font-black text-white flex items-center justify-center -translate-y-1/2 pointer-events-none border border-[var(--border-strong)]"
              style={{
                top: `${yScale(entry.key)! + yScale.bandwidth() / 2}%`,
                left: `0`,
                background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                boxShadow: `0 0 8px ${gradient.from}30`,
                transform: "translateY(-50%)"
              }}
            >
              {getInitials(entry.key)}
            </div>
          );
        })}
      </div>

      {/* Chart Area */}
      <div
        className="absolute inset-0
          z-10
          h-[calc(100%-var(--marginTop)-var(--marginBottom))]
          w-[calc(100%-var(--marginLeft)-var(--marginRight))]
          translate-x-[var(--marginLeft)]
          translate-y-[var(--marginTop)]
          overflow-visible"
      >
        {/* Bars with Rounded Right Corners */}
        {data.map((d, index) => {
          const barWidth = xScale(d.value);
          const barHeight = yScale.bandwidth();
          const gradient = GRADIENTS[index % GRADIENTS.length];

          return (
            <div
              key={index}
              style={{
                position: "absolute",
                left: "0",
                top: `${yScale(d.key)}%`,
                width: `${barWidth}%`,
                height: `${barHeight}%`,
                borderRadius: "0 6px 6px 0",
                background: `linear-gradient(90deg, ${gradient.from}15, ${gradient.from})`,
                boxShadow: `0 0 10px ${gradient.from}20`
              }}
              className="transition-all duration-300 hover:scale-x-[1.02] origin-left hover:brightness-110 cursor-pointer"
              onMouseMove={(e) => handleMouseMove(e, d, index)}
              onMouseLeave={handleMouseLeave}
            />
          );
        })}
        <svg className="w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          {xScale
            .ticks(5)
            .map(xScale.tickFormat(5, "d"))
            .map((active, i) => (
              <g
                transform={`translate(${xScale(+active)},0)`}
                className="text-[var(--border)]"
                key={i}
              >
                <line
                  y1={0}
                  y2={100}
                  stroke="currentColor"
                  strokeDasharray="6,5"
                  strokeWidth={0.5}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
        </svg>
      </div>

      {/* Floating Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none rounded-xl bg-slate-950/95 backdrop-blur-md border border-slate-800 p-2.5 text-xs shadow-2xl transition-all duration-150 animate-fade-in flex flex-col gap-1 min-w-[120px]"
          style={{
            transform: "translate(-50%, -100%) translateY(-10px)",
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tooltip.color }} />
            <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px] truncate max-w-[100px]">{tooltip.label}</span>
          </div>
          <span className="font-black text-white text-xs">{tooltip.value}</span>
        </div>
      )}
    </div>
  );
}

// 7. Area Chart Semi Filled (Daily Sales Trend - Outlined Area Chart)
function AreaChartSemiFilled({ data }: { data: { date: Date; value: number }[] }) {
  const xScale = d3.scaleTime()
    .domain([data[0].date, data[data.length - 1].date])
    .range([0, 100]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data.map((d) => d.value)) ?? 0])
    .range([90, 10]); // leave margins at top/bottom

  const [activePoint, setActivePoint] = useState<{
    date: Date;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center border border-dashed border-[var(--border-strong)] rounded-2xl">
        <p className="text-xs text-[var(--text-muted)] italic">Sin datos de ventas en este período</p>
      </div>
    );
  }

  const lineGenerator = d3.line<{ date: Date; value: number }>()
    .x((d) => xScale(d.date))
    .y((d) => yScale(d.value))
    .curve(d3.curveMonotoneX);

  const areaGenerator = d3.area<{ date: Date; value: number }>()
    .x((d) => xScale(d.date))
    .y0(100) // fill to the bottom
    .y1((d) => yScale(d.value))
    .curve(d3.curveMonotoneX);

  const areaPath = areaGenerator(data) ?? undefined;
  const linePath = lineGenerator(data) ?? undefined;

  if (!linePath) {
    return null;
  }

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Map percent width mouse coord to chronological domain Date
    const date = xScale.invert(mouseX);
    
    const bisectDate = d3.bisector<{ date: Date; value: number }, Date>((d) => d.date).left;
    const index = bisectDate(data, date, 1);
    
    const d0 = data[index - 1];
    const d1 = data[index];
    
    let closestPoint = d0;
    if (d1 && date.getTime() - d0.date.getTime() > d1.date.getTime() - date.getTime()) {
      closestPoint = d1;
    }

    if (closestPoint) {
      setActivePoint({
        date: closestPoint.date,
        value: closestPoint.value,
        x: xScale(closestPoint.date),
        y: yScale(closestPoint.value),
      });
    }
  };

  const handleMouseLeave = () => {
    setActivePoint(null);
  };

  return (
    <div ref={containerRef} className="relative h-56 w-full group/area">
      <div className="absolute inset-0 h-full w-full overflow-visible">
        {/* Chart area */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Gradient definition */}
            <linearGradient id="outlinedAreaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--accent)"
                stopOpacity="0.25"
              />
              <stop
                offset="100%"
                stopColor="var(--accent)"
                stopOpacity="0.01"
              />
            </linearGradient>
          </defs>

          {/* Area */}
          <path d={areaPath} fill="url(#outlinedAreaGradient)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />

          {/* Invisible Overlay to Capture Mouse Movements */}
          <rect
            width="100%"
            height="100%"
            fill="transparent"
            className="pointer-events-auto cursor-crosshair opacity-0"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        </svg>

        {/* HTML Vertical Guide Line overlay */}
        {activePoint && (
          <div
            className="absolute z-20 top-[10%] bottom-[8%] border-l border-dashed border-[var(--border-strong)] pointer-events-none -translate-x-1/2"
            style={{
              left: `${activePoint.x}%`,
            }}
          />
        )}

        {/* HTML Glowing Dot overlay */}
        {activePoint && (
          <div
            className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${activePoint.x}%`,
              top: `${activePoint.y}%`,
            }}
          >
            {/* Pulsing Aura */}
            <div className="absolute inset-0 rounded-full bg-[var(--accent)] opacity-40 animate-ping h-3.5 w-3.5 -left-[5px] -top-[5px]" />
            {/* Inner Circle */}
            <div className="h-2 w-2 rounded-full bg-[var(--accent)] border border-[var(--bg-surface)] shadow-lg" />
          </div>
        )}

        {/* X axis labels */}
        {data.map((day, i) => {
          // show 1 every 6 labels to keep it clean
          if (i % 6 !== 0 || i === 0 || i >= data.length - 2) return null;
          return (
            <div
              key={i}
              style={{
                left: `${xScale(day.date)}%`,
                top: "92%",
              }}
              className="absolute text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] -translate-x-1/2 pointer-events-none"
            >
              {day.date.toLocaleDateString("es-PE", {
                month: "short",
                day: "numeric",
              })}
            </div>
          );
        })}
      </div>

      {/* Y axis labels */}
      {yScale
        .ticks(5)
        .map(yScale.tickFormat(5, "d"))
        .map((value, i) => {
          const numValue = +value;
          return (
            <div
              key={i}
              style={{
                top: `${yScale(numValue)}%`,
                right: "0%",
              }}
              className="absolute text-[9px] font-extrabold tabular-nums text-[var(--text-muted)] -translate-y-1/2 bg-[var(--bg-surface)] px-1 rounded pointer-events-none border border-[var(--border)] shadow-sm"
            >
              S/ {numValue}
            </div>
          );
        })}

      {/* Area Chart Tooltip */}
      {activePoint && (
        <div
          className="absolute z-50 pointer-events-none rounded-xl bg-slate-950/95 backdrop-blur-md border border-slate-800 p-2.5 text-xs shadow-2xl transition-all duration-150 animate-fade-in flex flex-col gap-1 min-w-[125px]"
          style={{
            left: `${activePoint.x}%`,
            top: `${activePoint.y}%`,
            transform: activePoint.x < 15 
              ? "translate(0%, -100%) translateY(-14px)" 
              : activePoint.x > 85 
                ? "translate(-100%, -100%) translateY(-14px)" 
                : "translate(-50%, -100%) translateY(-14px)",
          }}
        >
          <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px] leading-none">
            {activePoint.date.toLocaleDateString("es-PE", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="font-black text-[var(--accent)] text-xs leading-none">
            S/ {activePoint.value.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ══════════════════════════════════════════

type DashboardRange = "week" | "3m" | "6m" | "all";

const RANGE_OPTIONS: { key: DashboardRange; label: string }[] = [
  { key: "week", label: "Esta semana" },
  { key: "3m", label: "Últimos 3 meses" },
  { key: "6m", label: "Últimos 6 meses" },
  { key: "all", label: "Todo" },
];

export default function AdminDashboardPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  // The dashboard always opens on "Vista General" (all branches), regardless of
  // the branch other admin pages remember, so the admin sees the global picture first.
  const [branchId, setBranchId] = useState("all");
  const [range, setRange] = useState<DashboardRange>("all");
  const [stats, setStats] = useState<Stats>({ services: 0, barbers: 0, todayAppointments: 0, pendingCount: 0 });
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBranches() {
      try {
        const branchesJson = await fetchCachedJson<{ items?: Branch[] }>("/api/admin/branches", { ttlMs: 60_000 });
        setBranches(branchesJson.items ?? []);
      } catch {
        // The session may have ended (e.g. logout) while a request was in flight.
        // Fail quietly instead of surfacing an unhandled rejection.
      }
    }
    void loadBranches();
  }, []);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      const query = branchId && branchId !== "all" ? `branch_id=${branchId}` : "";

      try {
        const [sJson, bJson, aJson] = await Promise.all([
          fetchCachedJson<{ items?: unknown[] }>(`/api/admin/services?only_active=true&${query}`, { ttlMs: 20_000 }),
          fetchCachedJson<{ items?: unknown[] }>(`/api/admin/barbers?only_active=true&${query}`, { ttlMs: 20_000 }),
          fetchCachedJson<{ items?: DashboardAppointment[] }>(`/api/admin/appointments?limit=200&${query}`, { ttlMs: 10_000 }),
        ]);

        const today = new Date().toISOString().slice(0, 10);
        const appts = aJson.items ?? [];
        const todayAppts = appts.filter(
          (a) => a.appointment_date === today && a.status !== "cancelled" && a.status !== "no_show",
        );
        const pending = appts.filter((a) => a.status === "pending");

        setAppointments(appts);
        setStats({
          services: (sJson.items ?? []).length,
          barbers: (bJson.items ?? []).length,
          todayAppointments: todayAppts.length,
          pendingCount: pending.length,
        });
      } catch {
        // Session ended or a transient error occurred — don't crash the dashboard
        // or leak an unhandled rejection into the Next.js dev overlay.
      } finally {
        setLoading(false);
      }
    }
    void loadStats();
  }, [branchId]);

  useEffect(() => {
    // Persist a real branch pick so other admin pages carry it over, but never
    // store "all" — the dashboard's global view must not reset that memory.
    if (branchId && branchId !== "all") localStorage.setItem("admin.branch_id", branchId);
  }, [branchId]);

  // ══════════════════════════════════════════
  // METRICS CALCULATIONS (DYNAMIC & REACTIVE)
  // ══════════════════════════════════════════

  // Operational charts (demand, workload, revenue) only count REAL appointments:
  // cancelled and no-show never happened / generated no service, so they are excluded.
  // The "Distribución de Estados" donut is the ONLY chart that keeps every status,
  // because showing that breakdown is precisely its purpose.
  const isActiveAppt = (a: DashboardAppointment) =>
    a.status !== "cancelled" && a.status !== "no_show";

  // ── Time-range filter ──────────────────────────────────────────────
  // Drives the financial KPIs and the operational charts. Start of the
  // selected window (local midnight); "all" uses the epoch so nothing is cut.
  const rangeStart = (() => {
    const n = new Date();
    if (range === "week") {
      const fromMonday = (n.getDay() + 6) % 7;
      return new Date(n.getFullYear(), n.getMonth(), n.getDate() - fromMonday);
    }
    if (range === "3m") return new Date(n.getFullYear(), n.getMonth() - 3, n.getDate());
    if (range === "6m") return new Date(n.getFullYear(), n.getMonth() - 6, n.getDate());
    return new Date(0);
  })();

  const rangedAppointments = appointments.filter((a) => {
    if (!a.appointment_date) return false;
    return new Date(a.appointment_date + "T00:00") >= rangeStart;
  });

  // ── Financial / operational KPIs (respect the selected range) ──────
  // "Ingresos" = money actually earned → only completed appointments.
  const rangedCompleted = rangedAppointments.filter((a) => a.status === "completed");
  const rangedActiveCount = rangedAppointments.filter(isActiveAppt).length;
  const revenueEarned = rangedCompleted.reduce((sum, a) => sum + (a.service?.price || 0), 0);
  const avgTicket = rangedCompleted.length ? revenueEarned / rangedCompleted.length : 0;
  const completionRate = rangedAppointments.length
    ? Math.round((rangedCompleted.length / rangedAppointments.length) * 100)
    : 0;
  const money = (n: number) =>
    `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const rangeLabel = RANGE_OPTIONS.find((r) => r.key === range)?.label ?? "Todo";

  const kpiCards = [
    {
      label: "Ingresos ganados",
      value: money(revenueEarned),
      sublabel: `${rangedCompleted.length} citas completadas`,
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      color: "#22c55e",
    },
    {
      label: "Citas en el rango",
      value: String(rangedActiveCount),
      sublabel: "reservas activas",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      color: "#3b82f6",
    },
    {
      label: "Ticket promedio",
      value: money(avgTicket),
      sublabel: "por cita completada",
      icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
      color: "#f59e0b",
    },
    {
      label: "Tasa de finalización",
      value: `${completionRate}%`,
      sublabel: `${rangedCompleted.length} de ${rangedAppointments.length} citas`,
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      color: "#a855f7",
    },
  ];

  // 1. Branch Revenues mapped to Bubble Logo Chart format
  const branchRevenueBubbleData: BarberRevenueItem[] = branches.map((b) => {
    const branchAppts = rangedAppointments.filter((a) => a.branch_id === b.id && isActiveAppt(a));
    const revenue = branchAppts.reduce((sum, a) => sum + (a.service?.price || 0), 0);
    return {
      key: b.name,
      value: revenue,
      color: "",
    };
  }).sort((a, b) => b.value - a.value);

  // 2. Status Breakdown Distribution
  const STATUS_COLORS: Record<string, string> = {
    pending: "#f59e0b",
    confirmed: "#3b82f6",
    in_progress: "#a855f7",
    completed: "#22c55e",
    cancelled: "#ef4444",
    no_show: "#6b7280"
  };
  
  const STATUS_LABELS: Record<string, string> = {
    pending: "Pendientes",
    confirmed: "Confirmadas",
    in_progress: "En Progreso",
    completed: "Completadas",
    cancelled: "Canceladas",
    no_show: "No Asistieron"
  };

  // 2b. Status Pie Data for Donut Chart
  const statusPieData: PieItem[] = Object.keys(STATUS_COLORS)
    .map((status) => {
      const count = rangedAppointments.filter((a) => a.status === status).length;
      return {
        label: STATUS_LABELS[status],
        value: count,
        color: STATUS_COLORS[status],
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // 3. Top Solicited Services
  const serviceCounts: Record<string, number> = {};
  rangedAppointments.filter(isActiveAppt).forEach((a) => {
    const name = a.service?.name || "Servicio no especificado";
    serviceCounts[name] = (serviceCounts[name] || 0) + 1;
  });

  const topServicesBubbleData: BarberRevenueItem[] = Object.entries(serviceCounts)
    .map(([name, count]) => ({
      key: name,
      value: count,
      color: ""
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // 6. Weekly Rhythms (Appointments of the CURRENT week, Mon–Sun, excluding cancelled/no_show)
  const DAYS_OF_WEEK = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const ORDERED_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  // Monday of the current week at local midnight (week runs Mon → Sun)
  const weekAnchor = new Date();
  const daysFromMonday = (weekAnchor.getDay() + 6) % 7; // Mon=0 ... Sun=6
  const weekStart = new Date(weekAnchor.getFullYear(), weekAnchor.getMonth(), weekAnchor.getDate() - daysFromMonday);
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);

  const weekdayCounts: Record<string, number> = {
    "Lunes": 0, "Martes": 0, "Miércoles": 0, "Jueves": 0, "Viernes": 0, "Sábado": 0, "Domingo": 0
  };

  appointments.forEach((a) => {
    if (!a.appointment_date) return;
    // Only real bookings count as workload: drop cancelled / no-show
    if (!isActiveAppt(a)) return;
    const date = new Date(a.appointment_date + "T00:00");
    // Keep only appointments that fall inside the current week
    if (date < weekStart || date > weekEnd) return;
    const dayName = DAYS_OF_WEEK[date.getDay()];
    if (dayName in weekdayCounts) {
      weekdayCounts[dayName]++;
    }
  });

  const weeklyRhythmData: VerticalBarItem[] = ORDERED_WEEK.map((day) => ({
    label: day,
    value: weekdayCounts[day] || 0,
  }));

  // 7. NEW: Daily Booking/Sales Trend (AreaChartSemiFilled - last 30 days)
  const dailyRevenues: Record<string, number> = {};
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    dailyRevenues[dateStr] = 0;
  }

  appointments.forEach((a) => {
    if (!a.appointment_date || !isActiveAppt(a)) return;
    const dateStr = a.appointment_date;
    if (dateStr in dailyRevenues) {
      dailyRevenues[dateStr] += a.service?.price || 0;
    }
  });

  const dailyTrendData = Object.entries(dailyRevenues)
    .map(([dateStr, value]) => ({
      date: new Date(dateStr + "T00:00:00"),
      value: value
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const cards = [
    { label: "Servicios Activos", value: stats.services, icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "#3b82f6", href: "/admin/services" },
    { label: "Barberos Activos", value: stats.barbers, icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", color: "#a855f7", href: "/admin/barbers" },
    { label: "Citas Hoy", value: stats.todayAppointments, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "#22c55e", href: "/admin/appointments" },
    { label: "Pendientes", value: stats.pendingCount, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "#f59e0b", href: "/admin/appointments" },
  ];

  return (
    <section className="space-y-6 animate-fade-in">
      {/* Top Banner and Tabs Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[var(--border)] pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Panel de <span style={{ color: "var(--accent)" }}>Control</span>
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Visión general en tiempo real de métricas, sedes y rendimiento</p>
        </div>

        {/* Branch Tabs Selector */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setBranchId("all")}
            className={`rounded-full px-5 py-2 text-xs font-extrabold uppercase tracking-widest transition-all border ${
              branchId === "all" || !branchId
                ? "bg-[var(--accent)] text-black border-[var(--accent)] shadow-xl shadow-[var(--accent-soft)]"
                : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <FaEarthAmericas className="h-3.5 w-3.5" />
              Vista General
            </span>
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setBranchId(b.id)}
              className={`rounded-full px-5 py-2 text-xs font-extrabold uppercase tracking-widest transition-all border ${
                branchId === b.id
                  ? "bg-[var(--accent)] text-black border-[var(--accent)] shadow-xl shadow-[var(--accent-soft)]"
                  : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <FaLocationDot className="h-3.5 w-3.5" />
                {b.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Time-range selector (drives the financial KPIs and operational charts) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mr-1">Periodo</span>
        {RANGE_OPTIONS.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-all border ${
              range === r.key
                ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)] shadow-sm"
                : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Financial KPI Row (respects the selected period) */}
      <div>
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--accent)]">
          Indicadores de rendimiento · {rangeLabel}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((c) => (
            <div
              key={c.label}
              className="admin-card !p-4 relative overflow-hidden"
              style={{ borderLeft: `4px solid ${c.color}` }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${c.color}15`, color: c.color }}
                >
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                  </svg>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] leading-tight">
                  {c.label}
                </p>
              </div>
              <p className="text-xl font-black leading-none" style={{ color: "var(--text-primary)" }}>
                {loading ? <span className="opacity-20 animate-pulse">--</span> : c.value}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[var(--text-muted)]">{c.sublabel}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Quick Cards (live totals) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="admin-card !p-4 group relative overflow-hidden transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95"
            style={{ borderLeft: `4px solid ${c.color}` }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110"
                style={{ background: `${c.color}15`, color: c.color }}
              >
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                </svg>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] leading-tight">
                {c.label}
              </p>
              {branchId === "all" && (
                <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)]">
                  Global
                </span>
              )}
            </div>
            <p className="text-2xl font-black leading-none transition-all" style={{ color: "var(--text-primary)" }}>
              {loading ? <span className="opacity-20 animate-pulse">--</span> : c.value}
            </p>
            <div
              className="absolute -right-4 -bottom-4 h-16 w-16 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity"
              style={{ color: c.color }}
            >
              <svg fill="currentColor" viewBox="0 0 24 24"><path d={c.icon} /></svg>
            </div>
          </Link>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          D3 CHARTS ROW 1: Services Preference & Breakdown
          ══════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart 1: Top Services (2/3 Width - Initials Logo Bubble Chart Design) */}
        <div className="lg:col-span-2 admin-card bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--accent)]">Preferencia de Clientes</span>
                <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  Servicios Más Solicitados
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                {rangeLabel}
              </span>
            </div>

            {loading ? (
              <div className="h-56 flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-[var(--accent)] border-t-transparent animate-spin rounded-full" />
              </div>
            ) : topServicesBubbleData.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic text-center py-12">Sin datos de servicios solicitados.</p>
            ) : (
              <BarChartHorizontalLogo data={topServicesBubbleData} prefix="" suffix=" citas" />
            )}
          </div>
        </div>

        {/* Chart 2: Status Distribution Donut (1/3 Width) */}
        <div className="admin-card bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--accent)]">Flujo Operativo</span>
              <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                Distribución de Estados
              </h3>
            </div>

            {loading ? (
              <div className="h-44 flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-[var(--accent)] border-t-transparent animate-spin rounded-full" />
              </div>
            ) : statusPieData.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic text-center py-12">Sin datos de estados.</p>
            ) : (
              <PieDonutChart items={statusPieData} />
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          D3 CHARTS ROW 2: Sales Trend · Branch Revenue (middle) · Weekly Frequency
          ══════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily Sales Trend */}
        <div className="admin-card bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--accent)]">Evolución Comercial</span>
                <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  Tendencia de Ventas Diarias
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                Últimos 30 días
              </span>
            </div>

            {loading ? (
              <div className="h-44 flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-[var(--accent)] border-t-transparent animate-spin rounded-full" />
              </div>
            ) : (
              <AreaChartSemiFilled data={dailyTrendData} />
            )}
          </div>
        </div>

        {/* Branch Estimated Revenue (middle, between trend and weekly frequency) */}
        <div className="admin-card bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--accent)]">Rendimiento Sede</span>
                <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  Ingresos Estimados por Sede
                </h3>
              </div>
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Ventas (S/)</span>
            </div>

            {loading ? (
              <div className="h-44 flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-[var(--accent)] border-t-transparent animate-spin rounded-full" />
              </div>
            ) : branchRevenueBubbleData.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic text-center py-12">Sin datos de ventas por sede.</p>
            ) : (
              <BarChartHorizontalLogo data={branchRevenueBubbleData} />
            )}
          </div>
        </div>

        {/* Weekly Frequency */}
        <div className="admin-card bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--accent)]">Carga de Trabajo</span>
                <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  Frecuencia por Día
                </h3>
              </div>
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Semanales</span>
            </div>

            {loading ? (
              <div className="h-44 flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-[var(--accent)] border-t-transparent animate-spin rounded-full" />
              </div>
            ) : (
              <VerticalBarsChart items={weeklyRhythmData} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
