"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchCachedJson } from "@/lib/cache/admin-client-cache";
import { FaEarthAmericas, FaLocationDot, FaFilter } from "react-icons/fa6";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

type Stats = {
  services: number;
  barbers: number;
};

type Branch = {
  id: string;
  name: string;
};

type DashboardAppointment = {
  id: string;
  appointment_date: string;
  start_time?: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
  branch_id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  total_price?: number | null;
  barber?: { full_name: string } | null;
  service?: { name: string; price: number } | null;
  branch?: { name: string } | null;
  notes?: string | null;
};

// ══════════════════════════════════════════
// RECHARTS PREMIUM CHART COMPONENTS
// ══════════════════════════════════════════

const GRADIENTS = [
  { from: "#ec4899", to: "#f43f5e" },
  { from: "#a855f7", to: "#c084fc" },
  { from: "#6366f1", to: "#818cf8" },
  { from: "#0ea5e9", to: "#38bdf8" },
  { from: "#f97316", to: "#fb923c" },
  { from: "#84cc16", to: "#a3e635" },
];

type BarberRevenueItem = {
  key: string;
  value: number;
  color: string;
};

type PieItem = {
  label: string;
  value: number;
  color: string;
};

type VerticalBarItem = {
  label: string;
  value: number;
};

type TooltipEntry = {
  color?: string;
  name?: string;
  value?: number | string;
  payload?: { fill?: string };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
};

// 1. Tooltip Personalizado
function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 shadow-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] backdrop-blur-xl text-xs flex flex-col gap-1.5 min-w-[125px]">
      <p className="font-extrabold text-[var(--text-primary)] uppercase tracking-wider text-[10px] mb-1">
        {label}
      </p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color || entry.payload?.fill || "var(--accent)" }}
          />
          <span className="text-[var(--text-secondary)] font-medium">
            {entry.name}:
          </span>
          <span className="font-black text-[var(--text-primary)]">
            {typeof entry.value === "number" ? entry.value.toLocaleString("es-PE") : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// 3. Gráfico de Barras Horizontal de Alta Gama (Servicios e Ingresos Sede)
function BarChartHorizontalLogo({ data, prefix = "S/ ", suffix = "" }: { data: BarberRevenueItem[]; prefix?: string; suffix?: string }) {
  const maxVal = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-[var(--border-strong)] rounded-2xl">
        <p className="text-xs text-[var(--text-muted)] italic">Sin datos disponibles en este período</p>
      </div>
    );
  }

  return (
    <div className="space-y-4.5 py-2">
      {data.map((item, index) => {
        const pct = (item.value / maxVal) * 100;
        const gradient = GRADIENTS[index % GRADIENTS.length];
        return (
          <div key={index} className="space-y-1.5 group">
            {/* Etiquetas y valor */}
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors truncate max-w-[280px]">
                {item.key}
              </span>
              <span className="font-black text-[var(--text-primary)] tabular-nums">
                {prefix}{item.value.toLocaleString("es-PE", { minimumFractionDigits: prefix ? 2 : 0 })}{suffix}
              </span>
            </div>
            {/* Barra y efecto de brillo */}
            <div className="h-3.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full overflow-hidden relative flex items-center">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${gradient.from}15, ${gradient.from})`,
                  boxShadow: `0 0 10px ${gradient.from}30`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 4. Gráfico de Torta / Dona (Estados y Barberos)
function PieDonutChart({ items }: { items: PieItem[] }) {
  const total = useMemo(() => items.reduce((sum, item) => sum + item.value, 0), [items]);

  if (total === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-[var(--border-strong)] rounded-2xl">
        <p className="text-xs text-[var(--text-muted)] font-semibold">Sin datos suficientes en este período</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative group/chart">
      {/* Donut Container */}
      <div className="relative shrink-0 w-[160px] h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={3}
              dataKey="value"
              nameKey="label"
              stroke="none"
            >
              {items.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Label en el centro */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[9px] uppercase font-black tracking-widest text-[var(--text-muted)] leading-none">Total</span>
          <span className="text-xl font-black text-[var(--text-primary)] mt-0.5">{total}</span>
          <span className="text-[9px] font-bold text-[var(--text-secondary)]">citas</span>
        </div>
      </div>

      {/* Legend Column */}
      <div className="flex-1 space-y-1.5 w-full">
        {items.slice(0, 5).map((item, idx) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border)] last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="font-bold text-[var(--text-secondary)] truncate text-[11px]">{item.label}</span>
              </div>
              <span className="font-black text-[var(--text-primary)] text-[11px] shrink-0 pl-2">
                {item.value} <span className="text-[9px] text-[var(--text-muted)] font-bold">({pct.toFixed(0)}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 5. Gráfico de Barras Verticales (Frecuencia Semanal)
function VerticalBarsChart({ items }: { items: VerticalBarItem[] }) {
  const chartData = useMemo(() => {
    return items.map((item) => ({
      name: item.label.slice(0, 3).toUpperCase(),
      Citas: item.value,
    }));
  }, [items]);

  return (
    <div className="h-44 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 15, right: 5, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: "bold" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: "bold" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-secondary)", opacity: 0.1 }} />
          <Bar
            dataKey="Citas"
            name="Citas"
            fill="var(--accent)"
            radius={[6, 6, 0, 0]}
            barSize={16}
          >
            {chartData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill="var(--accent)" fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 6. Gráfico de Área Suavizado (Tendencia de Ventas)
function AreaChartSemiFilled({ data }: { data: { date: Date; value: number }[] }) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      name: d.date.toLocaleDateString("es-PE", { month: "short", day: "numeric" }),
      Ventas: d.value,
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center border border-dashed border-[var(--border-strong)] rounded-2xl">
        <p className="text-xs text-[var(--text-muted)] italic">Sin datos de ventas en este período</p>
      </div>
    );
  }

  return (
    <div className="h-56 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="outlinedAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: "bold" }}
            axisLine={false}
            tickLine={false}
            interval={chartData.length > 15 ? 4 : 0}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: "bold" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `S/ ${val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="Ventas"
            name="Ventas"
            stroke="var(--accent)"
            strokeWidth={2.2}
            fillOpacity={1}
            fill="url(#outlinedAreaGradient)"
            dot={{ r: 3, fill: "var(--accent)", stroke: "var(--bg-surface)", strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--bg-surface)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function getPaymentMethodFromNotes(notes: string | null): string {
  if (!notes) return "pending";
  const notesLower = notes.toLowerCase();
  if (notesLower.includes("metodo:yape") || notesLower.includes("canal:yape")) return "YAPE";
  if (notesLower.includes("metodo:tarjeta") || notesLower.includes("metodo:card") || notesLower.includes("canal:card")) return "TARJETA";
  if (notesLower.includes("metodo:") || notesLower.includes("[pago ficticio]") || notesLower.includes("tx:")) {
    return "TARJETA";
  }
  return "pending";
}

function normalizePaymentMethod(appointment: DashboardAppointment): string {
  const rawMethod = appointment.payment_method?.trim().toLowerCase();

  if (rawMethod) {
    if (rawMethod.includes("yape")) return "YAPE";
    if (rawMethod.includes("card") || rawMethod.includes("tarjeta") || rawMethod.includes("visa")) return "TARJETA";
    if (rawMethod.includes("cash") || rawMethod.includes("efectivo") || rawMethod.includes("local")) return "EFECTIVO";
    return rawMethod.toUpperCase();
  }

  return getPaymentMethodFromNotes(appointment.notes || null);
}

function getAppointmentAmount(appointment: DashboardAppointment) {
  if (typeof appointment.total_price === "number" && appointment.total_price > 0) {
    return appointment.total_price;
  }

  return appointment.service?.price || 0;
}

function formatAppointmentDate(date: string, time?: string) {
  if (!date) return "Sin fecha";

  const parsed = new Date(`${date}T00:00:00`);
  const formattedDate = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });

  return time ? `${formattedDate} · ${time}` : formattedDate;
}

function formatStatusLabel(status: DashboardAppointment["status"]) {
  const labels: Record<DashboardAppointment["status"], string> = {
    pending: "Pendiente",
    confirmed: "Confirmada",
    in_progress: "En progreso",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No asistió",
  };

  return labels[status];
}

// ══════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ══════════════════════════════════════════

export default function AdminDashboardPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("all");
  const [stats, setStats] = useState<Stats>({ services: 0, barbers: 0 });
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  type PeriodFilter = "all" | "month" | "3months" | "6months" | "year" | "custom";
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Nuevos estados para filtros de negocio y sus opciones
  const [filterBarberId, setFilterBarberId] = useState("");
  const [filterServiceId, setFilterServiceId] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
  const [allBarbers, setAllBarbers] = useState<{ id: string; full_name: string }[]>([]);
  const [allServices, setAllServices] = useState<{ id: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(() => {
    if (typeof window !== "undefined") {
      const val = window.localStorage.getItem("admin.dashboard.showFilters");
      return val ? val === "true" : false;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("admin.dashboard.showFilters", String(showFilters));
    }
  }, [showFilters]);

  useEffect(() => {
    async function loadBranches() {
      const branchesJson = await fetchCachedJson<{ items?: Branch[] }>("/api/admin/branches", { ttlMs: 60_000 });
      const nextBranches = branchesJson.items ?? [];
      setBranches(nextBranches);
      const remembered = typeof window !== "undefined" ? localStorage.getItem("admin.branch_id") : null;
      if (remembered && nextBranches.find((b) => b.id === remembered)) {
        setBranchId(remembered);
      }
    }
    void loadBranches();
  }, []);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      
      const queryParts: string[] = [];
      if (branchId && branchId !== "all") {
        queryParts.push(`branch_id=${branchId}`);
      }

      if (filterBarberId) {
        queryParts.push(`barber_id=${filterBarberId}`);
      }
      if (filterServiceId) {
        queryParts.push(`service_id=${filterServiceId}`);
      }

      const now = new Date();
      let dateFromStr = "";
      let dateToStr = "";

      if (period === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFromStr = startOfMonth.toISOString().slice(0, 10);
      } else if (period === "3months") {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        dateFromStr = threeMonthsAgo.toISOString().slice(0, 10);
      } else if (period === "6months") {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        dateFromStr = sixMonthsAgo.toISOString().slice(0, 10);
      } else if (period === "year") {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        dateFromStr = startOfYear.toISOString().slice(0, 10);
      } else if (period === "custom") {
        if (customFrom) dateFromStr = customFrom;
        if (customTo) dateToStr = customTo;
      }

      if (dateFromStr) queryParts.push(`date_from=${dateFromStr}`);
      if (dateToStr) queryParts.push(`date_to=${dateToStr}`);
      
      queryParts.push("limit=1000");

      const query = queryParts.join("&");
      const branchOnlyQuery = branchId && branchId !== "all" ? `branch_id=${branchId}` : "";

      const [sJson, bJson, aJson] = await Promise.all([
        fetchCachedJson<{ items?: unknown[] }>(`/api/admin/services?only_active=true&${branchOnlyQuery}`, { ttlMs: 20_000 }),
        fetchCachedJson<{ items?: unknown[] }>(`/api/admin/barbers?only_active=true&${branchOnlyQuery}`, { ttlMs: 20_000 }),
        fetchCachedJson<{ items?: DashboardAppointment[] }>(`/api/admin/appointments?${query}`, { ttlMs: 5_000 }),
      ]);

      const appts = aJson.items ?? [];

      setAllBarbers((bJson.items ?? []) as { id: string; full_name: string }[]);
      setAllServices((sJson.items ?? []) as { id: string; name: string }[]);

      setAppointments(appts);
      setStats({
        services: (sJson.items ?? []).length,
        barbers: (bJson.items ?? []).length,
      });
      setLoading(false);
    }
    void loadStats();
  }, [branchId, period, customFrom, customTo, filterBarberId, filterServiceId]);

  useEffect(() => {
    if (branchId) localStorage.setItem("admin.branch_id", branchId);
  }, [branchId]);

  // ══════════════════════════════════════════
  // METRICS CALCULATIONS (DYNAMIC & REACTIVE)
  // ══════════════════════════════════════════

  const filteredAppointments = useMemo(() => {
    if (!filterPaymentMethod) return appointments;
    return appointments.filter((a) => {
      const method = normalizePaymentMethod(a);
      return method === filterPaymentMethod;
    });
  }, [appointments, filterPaymentMethod]);

  const completedAppointments = filteredAppointments.filter((a) => a.status === "completed");
  const todayDate = new Date().toISOString().slice(0, 10);
  const todayAppointments = filteredAppointments.filter((a) => a.appointment_date === todayDate).length;
  const totalRevenue = filteredAppointments
    .filter((a) => a.status !== "cancelled" && a.status !== "no_show")
    .reduce((sum, appointment) => sum + getAppointmentAmount(appointment), 0);
  const averageTicket = filteredAppointments.length > 0 ? totalRevenue / filteredAppointments.length : 0;

  const branchRevenueBubbleData: BarberRevenueItem[] = branches.map((b) => {
    const branchAppts = filteredAppointments.filter((a) => a.branch_id === b.id && a.status !== "cancelled" && a.status !== "no_show");
    const revenue = branchAppts.reduce((sum, a) => sum + getAppointmentAmount(a), 0);
    return {
      key: b.name,
      value: revenue,
      color: "",
    };
  }).sort((a, b) => b.value - a.value);

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

  const statusPieData: PieItem[] = Object.keys(STATUS_COLORS)
    .map((status) => {
      const count = filteredAppointments.filter((a) => a.status === status).length;
      return {
        label: STATUS_LABELS[status],
        value: count,
        color: STATUS_COLORS[status],
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const serviceCounts: Record<string, number> = {};
  filteredAppointments.forEach((a) => {
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

  const barberCounts: Record<string, number> = {};
  filteredAppointments.forEach((a) => {
    const name = a.barber?.full_name || "Cualquier Barbero";
    barberCounts[name] = (barberCounts[name] || 0) + 1;
  });

  const barberColors = ["#3b82f6", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#6b7280"];
  const barberPieData: PieItem[] = Object.entries(barberCounts)
    .map(([name, count], idx) => ({
      label: name,
      value: count,
      color: barberColors[idx % barberColors.length],
    }))
    .sort((a, b) => b.value - a.value);

  const DAYS_OF_WEEK = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const weekdayCounts: Record<string, number> = {
    "Lunes": 0, "Martes": 0, "Miércoles": 0, "Jueves": 0, "Viernes": 0, "Sábado": 0, "Domingo": 0
  };

  filteredAppointments.forEach((a) => {
    if (!a.appointment_date) return;
    const date = new Date(a.appointment_date + "T00:00");
    const dayName = DAYS_OF_WEEK[date.getDay()];
    if (dayName in weekdayCounts) {
      weekdayCounts[dayName]++;
    }
  });

  const weeklyRhythmData: VerticalBarItem[] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day) => ({
    label: day,
    value: weekdayCounts[day] || 0,
  }));

  const dailyRevenues: Record<string, number> = {};
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    dailyRevenues[dateStr] = 0;
  }

  filteredAppointments.forEach((a) => {
    if (!a.appointment_date || a.status === "cancelled" || a.status === "no_show") return;
    const dateStr = a.appointment_date;
    if (dateStr in dailyRevenues) {
      dailyRevenues[dateStr] += getAppointmentAmount(a);
    }
  });

  const dailyTrendData = Object.entries(dailyRevenues)
    .map(([dateStr, value]) => ({
      date: new Date(dateStr + "T00:00:00"),
      value: value
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const activeFilterLabel = (() => {
    const parts: string[] = [];
    if (branchId === "all") parts.push("Todas las sedes");
    else {
      const branch = branches.find((b) => b.id === branchId);
      if (branch) parts.push(branch.name);
    }
    const periodLabels: Record<string, string> = {
      month: "Este Mes", "3months": "3 Meses", "6months": "6 Meses", year: "Este Año", custom: "Personalizado"
    };
    if (period !== "all" && periodLabels[period]) parts.push(periodLabels[period]);
    if (filterBarberId) {
      const barber = allBarbers.find((item) => item.id === filterBarberId);
      if (barber) parts.push(`Barbero: ${barber.full_name}`);
    }
    if (filterServiceId) {
      const service = allServices.find((item) => item.id === filterServiceId);
      if (service) parts.push(`Servicio: ${service.name}`);
    }
    if (filterPaymentMethod) parts.push(`Pago: ${filterPaymentMethod}`);
    return parts.join(" · ");
  })();

  const recentAppointments = [...filteredAppointments]
    .sort((a, b) => {
      const left = `${b.appointment_date ?? ""} ${b.start_time ?? ""}`;
      const right = `${a.appointment_date ?? ""} ${a.start_time ?? ""}`;
      return left.localeCompare(right);
    })
    .slice(0, 8);

  const cards = [
    { label: "Servicios Activos", value: stats.services, icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "#3b82f6", href: "/admin/services" },
    { label: "Barberos Activos", value: stats.barbers, icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", color: "#a855f7", href: "/admin/barbers" },
    { label: "Citas del Filtro", value: filteredAppointments.length, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "#22c55e", href: "/admin/appointments" },
    { label: "Ingresos Est.", value: `S/ ${totalRevenue.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: "M12 8c-3.314 0-6 1.343-6 3s2.686 3 6 3 6 1.343 6 3-2.686 3-6 3m0-12c3.314 0 6-1.343 6-3s-2.686-3-6-3-6 1.343-6 3 2.686 3 6 3z", color: "#f59e0b", href: "/admin/appointments" },
  ];

  return (
    <section className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Panel de <span style={{ color: "var(--accent)" }}>Control</span>
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Visión general en tiempo real de métricas, sedes y rendimiento</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            showFilters
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
              : "border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
          }`}
        >
          <FaFilter className="h-3.5 w-3.5" />
          {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
        </button>
      </div>

      {/* Main Grid Layout: Left Column (Filters) & Right Column (Content) */}
      <div className={`grid gap-8 items-start ${showFilters ? "grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]" : "grid-cols-1"}`}>
        {/* Left Column: Vertical Sticky Filters Panel */}
        {showFilters && (
          <aside className="lg:sticky lg:top-24 h-fit space-y-6 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-5 shadow-xl space-y-5">
            {/* Filters Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                <h3 className="font-bold text-[var(--text-primary)] text-sm">Filtros de Control</h3>
              </div>
              {(branchId !== "all" || period !== "all" || filterBarberId !== "" || filterServiceId !== "" || filterPaymentMethod !== "") && (
                <button
                  onClick={() => {
                    setBranchId("all");
                    setPeriod("all");
                    setFilterBarberId("");
                    setFilterServiceId("");
                    setFilterPaymentMethod("");
                    setCustomFrom("");
                    setCustomTo("");
                  }}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                  Limpiar todo
                </button>
              )}
            </div>

            {/* 1. Sede Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <FaLocationDot className="h-3 w-3 text-[var(--accent)]" />
                Sede / Barbería
              </label>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setBranchId("all")}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                    branchId === "all" || !branchId
                      ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-border)] font-bold"
                      : "bg-[var(--bg-secondary)]/50 text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
                  }`}
                >
                  <FaEarthAmericas className="h-3.5 w-3.5 shrink-0" />
                  Vista General
                </button>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBranchId(b.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                      branchId === b.id
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-border)] font-bold"
                        : "bg-[var(--bg-secondary)]/50 text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
                    }`}
                  >
                    <FaLocationDot className="h-3.5 w-3.5 shrink-0" />
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Period/Date Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Período de Fecha
              </label>
              <select
                value={period}
                onChange={(e) => {
                  const val = e.target.value as PeriodFilter;
                  setPeriod(val);
                  if (val !== "custom") {
                    setCustomFrom("");
                    setCustomTo("");
                  }
                }}
                className="w-full rounded-xl px-3 py-2 outline-none text-xs font-semibold border border-[var(--border-strong)] bg-[var(--bg-secondary)]/50 text-[var(--text-primary)] focus:border-[var(--accent)] transition-all cursor-pointer"
              >
                <option value="all" className="bg-[var(--bg-surface)]">Todo el histórico</option>
                <option value="month" className="bg-[var(--bg-surface)]">Este Mes</option>
                <option value="3months" className="bg-[var(--bg-surface)]">Últimos 3 Meses</option>
                <option value="6months" className="bg-[var(--bg-surface)]">Últimos 6 Meses</option>
                <option value="year" className="bg-[var(--bg-surface)]">Este Año</option>
                <option value="custom" className="bg-[var(--bg-surface)]">Personalizado</option>
              </select>

              {period === "custom" && (
                <div className="pt-2 space-y-2 animate-fade-in border-t border-[var(--border)] mt-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">Desde</span>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-full rounded-xl px-3 py-1.5 outline-none text-xs font-semibold border border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:border-[var(--accent)] transition-all cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">Hasta</span>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="w-full rounded-xl px-3 py-1.5 outline-none text-xs font-semibold border border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:border-[var(--accent)] transition-all cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Payment Method Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Método de Pago
              </label>
              <div className="flex flex-col gap-1.5">
                {[
                  { id: "", label: "Todos los métodos", icon: "🌐" },
                  { id: "YAPE", label: "Yape", icon: "📱" },
                  { id: "TARJETA", label: "Tarjeta", icon: "💳" },
                  { id: "EFECTIVO", label: "Efectivo", icon: "💵" },
                  { id: "pending", label: "Sin registrar", icon: "🕒" },
                ].map((m) => {
                  const active = filterPaymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setFilterPaymentMethod(m.id)}
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-border)] font-bold"
                          : "bg-[var(--bg-secondary)]/50 text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
                      }`}
                    >
                      <span className="shrink-0 text-sm">{m.icon}</span>
                      <span className="truncate">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Barber Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Barbero
              </label>
              <select
                value={filterBarberId}
                onChange={(e) => setFilterBarberId(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 outline-none text-xs font-semibold border border-[var(--border-strong)] bg-[var(--bg-secondary)]/50 text-[var(--text-primary)] focus:border-[var(--accent)] transition-all cursor-pointer"
              >
                <option value="" className="bg-[var(--bg-surface)]">Todos los barberos</option>
                {allBarbers.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[var(--bg-surface)]">
                    {b.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Service Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Servicio
              </label>
              <select
                value={filterServiceId}
                onChange={(e) => setFilterServiceId(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 outline-none text-xs font-semibold border border-[var(--border-strong)] bg-[var(--bg-secondary)]/50 text-[var(--text-primary)] focus:border-[var(--accent)] transition-all cursor-pointer"
              >
                <option value="" className="bg-[var(--bg-surface)]">Todos los servicios</option>
                {allServices.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[var(--bg-surface)]">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </aside>
        )}

        {/* Right Column: Main Dashboard Content */}
        <div className="space-y-8 min-w-0">
          {/* Stats Quick Cards Grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c, index) => (
              <Link 
                key={c.label} 
                href={c.href} 
                className="admin-card bg-[var(--bg-surface)] border border-[var(--border-strong)] hover:border-[var(--accent)] rounded-2xl p-5 group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 flex flex-col justify-between animate-fade-in"
                style={{ borderLeft: `4px solid ${c.color}`, animationDelay: `${index * 75}ms`, animationFillMode: "both" }}
              >
                <div className="flex items-center justify-between mb-3.5">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110"
                    style={{ background: `${c.color}15`, color: c.color }}
                  >
                    <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                    </svg>
                  </div>
                  {branchId === "all" && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)]">
                      Global
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                  {c.label}
                </p>
                <p className="text-3xl font-black transition-all" style={{ color: "var(--text-primary)" }}>
                  {loading ? <span className="opacity-20 animate-pulse">--</span> : c.value}
                </p>
                {activeFilterLabel && (
                  <p className="text-[9px] font-bold text-[var(--text-muted)] mt-1.5 truncate">
                    ▸ {activeFilterLabel}
                  </p>
                )}
                <div 
                  className="absolute -right-4 -bottom-4 h-20 w-20 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity"
                  style={{ color: c.color }}
                >
                  <svg fill="currentColor" viewBox="0 0 24 24"><path d={c.icon} /></svg>
                </div>
              </Link>
            ))}
          </div>

          {/* CHARTS ROW 1: Financial Evolution & Operating Flow */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chart 1: Daily Sales Trend (2/3 Width) */}
            <div className="lg:col-span-2 admin-card bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between hover:border-[var(--accent)] transition-all duration-300">
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
                  <div className="h-56 flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-[var(--accent)] border-t-transparent animate-spin rounded-full" />
                  </div>
                ) : (
                  <AreaChartSemiFilled data={dailyTrendData} />
                )}
              </div>
            </div>

            {/* Chart 2: Status Distribution Donut (1/3 Width) */}
            <div className="admin-card bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between hover:border-[var(--accent)] transition-all duration-300">
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

          {/* CHARTS ROW 2: Preferences, Barber Performance & Weekly Rhythm */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {/* Chart 3: Top Services */}
            <div className="admin-card bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between hover:border-[var(--accent)] transition-all duration-300">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--accent)]">Preferencia de Clientes</span>
                    <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                      Servicios Más Solicitados
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)]">
                    Distribución Total
                  </span>
                </div>

                {loading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-[var(--accent)] border-t-transparent animate-spin rounded-full" />
                  </div>
                ) : topServicesBubbleData.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic text-center py-12">Sin datos de servicios solicitados.</p>
                ) : (
                  <BarChartHorizontalLogo data={topServicesBubbleData} prefix="" suffix=" citas" />
                )}
              </div>
            </div>

            {/* Chart 4: Citas por Barbero */}
            <div className="admin-card bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between hover:border-[var(--accent)] transition-all duration-300">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--accent)]">Distribución Citas</span>
                    <h3 className="text-base font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                      Citas por Barbero
                    </h3>
                  </div>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Citas (Cant.)</span>
                </div>

                {loading ? (
                  <div className="h-44 flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-[var(--accent)] border-t-transparent animate-spin rounded-full" />
                  </div>
                ) : barberPieData.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic text-center py-12">Sin datos de citas por staff.</p>
                ) : (
                  <PieDonutChart items={barberPieData} />
                )}
              </div>
            </div>

            {/* Chart 5: Ritmo Semanal */}
            <div className="admin-card bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between hover:border-[var(--accent)] transition-all duration-300 md:col-span-2 xl:col-span-1">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--accent)]">Patrones</span>
                    <h3 className="text-base font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                      Ritmo Semanal
                    </h3>
                  </div>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Citas/Día</span>
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

          {/* CHARTS ROW 3: Comparativa Multi-Sede (Solo vista global) */}
          {branchId === "all" && branchRevenueBubbleData.length > 0 && (
            <div className="admin-card bg-[var(--bg-surface)] border border-[var(--border-strong)] hover:border-[var(--accent)] rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--accent)]">Comparativa Multi-Sede</span>
                  <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                    Ingresos Estimados por Sede
                  </h3>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Total</span>
                  <span className="text-sm font-black text-[var(--accent)]">
                    S/ {branchRevenueBubbleData.reduce((sum, b) => sum + b.value, 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="h-44 flex items-center justify-center">
                  <div className="h-6 w-6 border-2 border-[var(--accent)] border-t-transparent animate-spin rounded-full" />
                </div>
              ) : (
                <BarChartHorizontalLogo data={branchRevenueBubbleData} />
              )}
            </div>
          )}

          <div className="admin-card bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all duration-300">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--accent)]">Data Real del Negocio</span>
                <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  Citas Recientes según tus filtros
                </h3>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Esta lista usa la misma información que hoy sale desde Supabase para tu panel admin.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Hoy: <span className="text-[var(--text-primary)]">{todayAppointments}</span>
                </span>
                <span className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Completadas: <span className="text-[var(--text-primary)]">{completedAppointments.length}</span>
                </span>
                <span className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Ticket Prom.: <span className="text-[var(--text-primary)]">S/ {averageTicket.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
              </div>
            </div>

            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-[var(--accent)] border-t-transparent animate-spin rounded-full" />
              </div>
            ) : recentAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-strong)] px-6 py-12 text-center">
                <p className="text-sm font-semibold text-[var(--text-primary)]">No hay citas para los filtros actuales.</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Prueba con otra sede, período o método de pago.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      <th className="pb-3 pr-4 font-black">Fecha</th>
                      <th className="pb-3 pr-4 font-black">Cliente</th>
                      <th className="pb-3 pr-4 font-black">Servicio</th>
                      <th className="pb-3 pr-4 font-black">Barbero</th>
                      <th className="pb-3 pr-4 font-black">Pago</th>
                      <th className="pb-3 pr-4 font-black">Monto</th>
                      <th className="pb-3 font-black">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAppointments.map((appointment) => {
                      const paymentMethod = normalizePaymentMethod(appointment);
                      const amount = getAppointmentAmount(appointment);

                      return (
                        <tr
                          key={appointment.id}
                          className="border-b border-[var(--border)]/70 align-top last:border-b-0"
                        >
                          <td className="py-3 pr-4 text-xs font-semibold text-[var(--text-secondary)]">
                            {formatAppointmentDate(appointment.appointment_date, appointment.start_time)}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="font-semibold text-[var(--text-primary)]">
                              {appointment.customer_name || "Cliente sin nombre"}
                            </div>
                            {appointment.customer_email && (
                              <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                                {appointment.customer_email}
                              </div>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-[var(--text-secondary)]">
                            {appointment.service?.name || "Servicio no especificado"}
                          </td>
                          <td className="py-3 pr-4 text-[var(--text-secondary)]">
                            {appointment.barber?.full_name || "Sin asignar"}
                          </td>
                          <td className="py-3 pr-4">
                            <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                              {paymentMethod === "pending" ? "Sin registrar" : paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-xs font-black text-[var(--text-primary)]">
                            S/ {amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3">
                            <span className="inline-flex rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--accent)]">
                              {formatStatusLabel(appointment.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
