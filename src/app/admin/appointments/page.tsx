"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  FaBan,
  FaCalendarDay,
  FaCheck,
  FaClock,
  FaCreditCard,
  FaEarthAmericas,
  FaEnvelope,
  FaFilter,
  FaGripVertical,
  FaList,
  FaLocationDot,
  FaMagnifyingGlass,
  FaPhone,
  FaRegCircleCheck,
  FaScissors,
  FaUser,
  FaUserGroup,
  FaUserTie,
  FaWhatsapp,
  FaXmark,
} from "react-icons/fa6";
import { useToast } from "@/components/toast";
import { AdminAppointmentsSkeleton, AdminHeaderSkeleton } from "@/components/admin-skeletons";
import { fetchCachedJson, invalidateCacheByPrefix } from "@/lib/cache/admin-client-cache";

type Appointment = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  appointment_date: string;
  start_time: string;
  end_time?: string;
  created_at?: string;
  updated_at?: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
  notes: string | null;
  barber_id?: string;
  service_id?: string;
  branch_id?: string;
  barber?: { full_name: string; image_url?: string | null } | null;
  service?: { name: string; price: number; image_url?: string | null } | null;
  branch?: { name: string } | null;
  client_reliability?: {
    level: "confiable" | "neutral" | "alerta";
    label: string;
    description: string;
    completed: number;
    no_shows: number;
  } | null;
};

const RELIABILITY_STYLES: Record<
  "confiable" | "neutral" | "alerta",
  { color: string; bg: string; border: string }
> = {
  confiable: { color: "#34d399", bg: "rgba(52, 211, 153, 0.12)", border: "rgba(52, 211, 153, 0.35)" },
  neutral: { color: "#94a3b8", bg: "rgba(148, 163, 184, 0.12)", border: "rgba(148, 163, 184, 0.3)" },
  alerta: { color: "#f87171", bg: "rgba(248, 113, 113, 0.14)", border: "rgba(248, 113, 113, 0.4)" },
};

function ReliabilityBadge({ reliability }: { reliability: Appointment["client_reliability"] }) {
  if (!reliability) return null;
  const style = RELIABILITY_STYLES[reliability.level];
  return (
    <span
      title={reliability.description}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider cursor-help"
      style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {reliability.label}
    </span>
  );
}

type OptionItem = { id: string; full_name?: string; name?: string };
type Branch = { id: string; name: string };
type QuickStatusFilter = "all" | "to_start" | "in_progress" | "finished" | "cancelled";
type PaymentFilter = "all" | "yape" | "card" | "processing";
type ViewMode = "detailed" | "compact";
type DateShortcut = "all" | "today" | "week" | "month";

type AdminAppointmentsPreferences = {
  branchFilter: string;
  statusFilter: string;
  barberFilter: string;
  serviceFilter: string;
  dateFrom: string;
  dateTo: string;
  limit: string;
  quickStatusFilter: QuickStatusFilter;
  searchQuery: string;
  paymentFilter: PaymentFilter;
  showFilters: boolean;
  viewMode: ViewMode;
  dateShortcut: DateShortcut;
};

const ADMIN_APPOINTMENTS_PREFERENCES_KEY = "admin.appointments.preferences";

const STATUSES: Appointment["status"][] = ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"];
const STATUS_CONFIG_SIMPLE: Record<Appointment["status"], { label: string }> = {
  pending: { label: "Pendiente" },
  confirmed: { label: "Confirmada" },
  in_progress: { label: "En progreso" },
  completed: { label: "Completada" },
  cancelled: { label: "Cancelada" },
  no_show: { label: "No asistió" },
};

const getDetailedStatusConfig = (status: Appointment["status"], isPrepaid: boolean) => {
  if (status === "pending") {
    if (isPrepaid) {
      return {
        label: "Pagado y Confirmado",
        color: "#10b981", // este es colorcito esmeralda porseaca
        bg: "rgba(16, 185, 129, 0.1)",
        border: "rgba(16, 185, 129, 0.2)",
        icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      };
    } else {
      return {
        label: "Pendiente (Pago en Local)",
        color: "#f59e0b", // color amber de brawl
        bg: "rgba(245, 158, 11, 0.1)",
        border: "rgba(245, 158, 11, 0.2)",
        icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      };
    }
  }

  switch (status) {
    case "confirmed":
      return {
        label: "Confirmado",
        color: "#3b82f6", // blue oceano
        bg: "rgba(59, 130, 246, 0.1)",
        border: "rgba(59, 130, 246, 0.2)",
        icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      };
    case "in_progress":
      return {
        label: "En Atención",
        color: "#a855f7", // moradito 
        bg: "rgba(168, 85, 247, 0.1)",
        border: "rgba(168, 85, 247, 0.2)",
        icon: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
      };
    case "completed":
      return {
        label: "Finalizado",
        color: "#22c55e", // verdecito
        bg: "rgba(34, 197, 94, 0.1)",
        border: "rgba(34, 197, 94, 0.2)",
        icon: "M5 13l4 4L19 7"
      };
    case "cancelled":
      return {
        label: "Cancelado",
        color: "#ef4444", // rojito
        bg: "rgba(239, 68, 68, 0.1)",
        border: "rgba(239, 68, 68, 0.2)",
        icon: "M6 18L18 6M6 6l12 12"
      };
    case "no_show":
      return {
        label: "No Asistió",
        color: "#9ca3af", // gray o gris
        bg: "rgba(156, 163, 175, 0.1)",
        border: "rgba(156, 163, 175, 0.2)",
        icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      };
  }
};

interface ParsedNotes {
  payment: {
    method: string;
    tx: string;
    isPrepaid: boolean;
    amount: string | null;
    currency: string | null;
    phone: string | null;
    cardLabel: string | null;
  } | null;
  companions: number | null;
  groupSlots: string[] | null;
  userNote: string | null;
}

function extractTaggedValue(input: string, key: string) {
  const match = input.match(new RegExp(`${key}:([^|\\s]+)`, "i"));
  return match ? match[1].trim() : null;
}

function getEffectiveAppointmentStatus(item: Appointment, isPrepaid: boolean): Appointment["status"] {
  if (item.status === "pending" && isPrepaid) {
    return "confirmed";
  }

  return item.status;
}

function getPaymentVisual(method: string) {
  const normalized = method.toLowerCase();
  if (normalized.includes("yape")) {
    return {
      iconSrc: "/yape.svg",
      iconAlt: "Yape",
      accentClass: "bg-[rgba(122,34,110,0.06)] text-[#d946ef] border-[rgba(122,34,110,0.18)]",
      label: "Pagado con Yape",
    };
  }

  return {
    iconSrc: "/visa.svg",
    iconAlt: "Tarjeta",
    accentClass: "bg-blue-500/5 text-blue-400 border-blue-500/15",
    label: "Pagado con Tarjeta",
  };
}

function getCustomerInitials(name: string | null) {
  if (!name) return "CL";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CL";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getAdminActions(status: Appointment["status"]) {
  if (status === "confirmed") {
    return [
      { label: "Iniciar", nextStatus: "in_progress" as const, tone: "primary" as const },
      { label: "Cancelar", nextStatus: "cancelled" as const, tone: "danger" as const },
    ];
  }

  if (status === "in_progress") {
    return [{ label: "Finalizar", nextStatus: "completed" as const, tone: "primary" as const }];
  }

  return [];
}

function getTimelineSteps(status: Appointment["status"]) {
  if (status === "cancelled") {
    return [
      { key: "paid", label: "Pagado", state: "completed" as const },
      { key: "confirmed", label: "Confirmado", state: "completed" as const },
      { key: "cancelled", label: "Cancelado", state: "active" as const },
    ];
  }

  if (status === "completed") {
    return [
      { key: "paid", label: "Pagado", state: "completed" as const },
      { key: "confirmed", label: "Confirmado", state: "completed" as const },
      { key: "completed", label: "Finalizado", state: "completed" as const },
    ];
  }

  if (status === "in_progress") {
    return [
      { key: "paid", label: "Pagado", state: "completed" as const },
      { key: "progress", label: "En atención", state: "active" as const },
      { key: "completed", label: "Finalizado", state: "upcoming" as const },
    ];
  }

  return [
    { key: "paid", label: "Pagado", state: "completed" as const },
    { key: "confirmed", label: "Confirmado", state: "active" as const },
    { key: "completed", label: "Finalizado", state: "upcoming" as const },
  ];
}


function parseAppointmentNotes(notesStr: string | null): ParsedNotes {
  if (!notesStr) {
    return { payment: null, companions: null, groupSlots: null, userNote: null };
  }

  let payment: ParsedNotes["payment"] = null;
  let companions: number | null = null;
  let groupSlots: string[] | null = null;
  const userNoteParts: string[] = [];

  const parts = notesStr.split(" | ");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[PAGO FICTICIO]") || trimmed.includes("metodo:") || trimmed.includes("tx:")) {
      const method = extractTaggedValue(trimmed, "metodo") ?? "QR/Tarjeta";
      const tx = extractTaggedValue(trimmed, "tx") ?? "N/A";
      payment = {
        method,
        tx,
        isPrepaid: true,
        amount: extractTaggedValue(trimmed, "monto"),
        currency: extractTaggedValue(trimmed, "moneda"),
        phone: extractTaggedValue(trimmed, "celular"),
        cardLabel: extractTaggedValue(trimmed, "tarjeta"),
      };
    } else if (trimmed.startsWith("Personas:")) {
      const match = trimmed.match(/Personas:\s*(\d+)/i);
      if (match) {
        companions = parseInt(match[1], 10);
      }
    } else if (trimmed.startsWith("Horarios del grupo:")) {
      const match = trimmed.match(/Horarios del grupo:\s*\[(.*?)\]/i);
      if (match) {
        groupSlots = match[1].split(",").map((s) => s.trim()).filter(Boolean);
      }
    } else {
      
      if (/reserva automatizada bdd/i.test(trimmed)) continue;
      userNoteParts.push(trimmed);
    }
  }

  
  if (!payment && (notesStr.includes("metodo:") || notesStr.includes("[PAGO FICTICIO]"))) {
    payment = {
      method: extractTaggedValue(notesStr, "metodo") ?? "Desconocido",
      tx: extractTaggedValue(notesStr, "tx") ?? "N/A",
      isPrepaid: true,
      amount: extractTaggedValue(notesStr, "monto"),
      currency: extractTaggedValue(notesStr, "moneda"),
      phone: extractTaggedValue(notesStr, "celular"),
      cardLabel: extractTaggedValue(notesStr, "tarjeta"),
    };
  }

  const userNote = userNoteParts.join(" | ");

  return { payment, companions, groupSlots, userNote: userNote || null };
}


function getWhatsAppUrl(phone: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 9) {
    return `https://wa.me/51${cleaned}`;
  }
  return `https://wa.me/${cleaned}`;
}

function getAppointmentSortTimestamp(item: Appointment) {
  if (item.created_at) {
    const createdAtMs = new Date(item.created_at).getTime();
    if (!Number.isNaN(createdAtMs)) return createdAtMs;
  }

  const fallbackMs = new Date(`${item.appointment_date}T${item.start_time.slice(0, 5)}:00`).getTime();
  return Number.isNaN(fallbackMs) ? 0 : fallbackMs;
}

function formatLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function loadAdminAppointmentsPreferences(): Partial<AdminAppointmentsPreferences> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ADMIN_APPOINTMENTS_PREFERENCES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminAppointmentsPreferences>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export default function AdminAppointmentsPage() {
  const { toast } = useToast();
  const storedPreferences = useMemo(() => loadAdminAppointmentsPreferences(), []);
  const [items, setItems] = useState<Appointment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const [barbers, setBarbers] = useState<OptionItem[]>([]);
  const [services, setServices] = useState<OptionItem[]>([]);
  const [statusFilter, setStatusFilter] = useState(storedPreferences?.statusFilter ?? "");
  const [barberFilter, setBarberFilter] = useState(storedPreferences?.barberFilter ?? "");
  const [serviceFilter, setServiceFilter] = useState(storedPreferences?.serviceFilter ?? "");
  const [dateFrom, setDateFrom] = useState(storedPreferences?.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(storedPreferences?.dateTo ?? "");
  const [limit, setLimit] = useState(storedPreferences?.limit ?? "100");
  const [quickStatusFilter, setQuickStatusFilter] = useState<QuickStatusFilter>(storedPreferences?.quickStatusFilter ?? "all");
  const [searchQuery, setSearchQuery] = useState(storedPreferences?.searchQuery ?? "");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>(storedPreferences?.paymentFilter ?? "all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(storedPreferences?.showFilters ?? false);
  const [loading, setLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(storedPreferences?.viewMode ?? "detailed");
  const [visibleCount, setVisibleCount] = useState(15);
  const [dateShortcut, setDateShortcut] = useState<DateShortcut>(storedPreferences?.dateShortcut ?? "all");

  async function loadOptions() {
    try {
      const barbersUrl = branchFilter ? `/api/admin/barbers?branch_id=${branchFilter}` : `/api/admin/barbers`;
      const servicesUrl = branchFilter ? `/api/admin/services?branch_id=${branchFilter}` : `/api/admin/services`;
      const [bJson, sJson] = await Promise.all([
        fetchCachedJson<{ items?: OptionItem[] }>(barbersUrl, { ttlMs: 20_000 }),
        fetchCachedJson<{ items?: OptionItem[] }>(servicesUrl, { ttlMs: 20_000 }),
      ]);
      setBarbers(bJson.items ?? []);
      setServices(sJson.items ?? []);
    } catch {
      
    }
  }

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (branchFilter) params.set("branch_id", branchFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (barberFilter) params.set("barber_id", barberFilter);
    if (serviceFilter) params.set("service_id", serviceFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (limit) params.set("limit", limit);
    try {
      const json = await fetchCachedJson<{ items?: Appointment[] }>(`/api/admin/appointments?${params.toString()}`, { ttlMs: 10_000 });
      setItems(json.items ?? []);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo cargar citas", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadBranches() {
      setBranchesLoading(true);
      try {
        const json = await fetchCachedJson<{ items?: Branch[] }>("/api/admin/branches", { ttlMs: 60_000 });
        const nextBranches = json.items ?? [];
        const remembered = typeof window !== "undefined" ? localStorage.getItem("admin.branch_id") : "";
        const preferredBranch = storedPreferences?.branchFilter;
        const selected =
          preferredBranch !== undefined && (preferredBranch === "" || nextBranches.some((b) => b.id === preferredBranch))
            ? preferredBranch
            : (remembered !== null && (remembered === "" || nextBranches.some((b) => b.id === remembered)))
            ? remembered
            : nextBranches[0]?.id || "";
        setBranches(nextBranches);
        setBranchFilter(selected);
      } finally {
        setBranchesLoading(false);
      }
    }
    void loadBranches();
  }, [storedPreferences]);

  useEffect(() => {
    if (branchFilter !== undefined) {
      void loadOptions();
      void load();
    }
  }, [branchFilter]);

  useEffect(() => {
    if (branchFilter !== undefined) {
      localStorage.setItem("admin.branch_id", branchFilter);
    }
  }, [branchFilter]);

  useEffect(() => {
    if (typeof window === "undefined" || branchFilter === undefined) return;

    const preferences: AdminAppointmentsPreferences = {
      branchFilter,
      statusFilter,
      barberFilter,
      serviceFilter,
      dateFrom,
      dateTo,
      limit,
      quickStatusFilter,
      searchQuery,
      paymentFilter,
      showFilters,
      viewMode,
      dateShortcut,
    };

    window.localStorage.setItem(ADMIN_APPOINTMENTS_PREFERENCES_KEY, JSON.stringify(preferences));
  }, [
    branchFilter,
    statusFilter,
    barberFilter,
    serviceFilter,
    dateFrom,
    dateTo,
    limit,
    quickStatusFilter,
    searchQuery,
    paymentFilter,
    showFilters,
    viewMode,
    dateShortcut,
  ]);

  async function applyFilters() { await load(); }
  async function clearFilters() {
    setStatusFilter(""); setBarberFilter(""); setServiceFilter("");
    setDateFrom(""); setDateTo(""); setLimit("100");
    setSearchQuery("");
    setPaymentFilter("all");
    setQuickStatusFilter("all");
    setDateShortcut("all");
    setVisibleCount(15);
    setTimeout(() => { void load(); }, 0);
  }

  function applyDateShortcut(shortcut: DateShortcut) {
    setDateShortcut(shortcut);
    setVisibleCount(15);
    if (shortcut === "all") {
      setDateFrom("");
      setDateTo("");
      return;
    }
    const now = new Date();
    const todayStr = formatLocalDateInput(now);
    if (shortcut === "today") {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (shortcut === "week") {
      setDateFrom(todayStr);
      setDateTo(formatLocalDateInput(addDays(now, 6)));
    } else if (shortcut === "month") {
      setDateFrom(todayStr);
      setDateTo(formatLocalDateInput(addDays(now, 29)));
    }
  }

  async function changeStatus(id: string, status: Appointment["status"]) {
    setSavingId(id);
    const res = await fetch(`/api/admin/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setSavingId(null);
    if (!res.ok) { const json = await res.json().catch(() => ({})); toast(json.error ?? "No se pudo cambiar estado", "error"); return; }
    invalidateCacheByPrefix("/api/admin/appointments");
    
    // Immediate local update
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    
    const notesParsed = parseAppointmentNotes(items.find(item => item.id === id)?.notes || "");
    const effectiveStatus = status === "pending" && !!notesParsed.payment?.isPrepaid ? "confirmed" : status;
    const config = getDetailedStatusConfig(effectiveStatus, !!notesParsed.payment?.isPrepaid);
    toast(`Cita marcada como ${config.label}`);
  }

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => getAppointmentSortTimestamp(b) - getAppointmentSortTimestamp(a));
  }, [items]);

  const quickFilterCounts = useMemo(() => {
    const counts = {
      all: sortedItems.length,
      to_start: 0,
      in_progress: 0,
      finished: 0,
      cancelled: 0,
    };

    for (const item of sortedItems) {
      const parsedNotes = parseAppointmentNotes(item.notes);
      const isPrepaid = !!parsedNotes.payment?.isPrepaid;
      const effectiveStatus = getEffectiveAppointmentStatus(item, isPrepaid);

      if (effectiveStatus === "confirmed") counts.to_start += 1;
      if (effectiveStatus === "in_progress") counts.in_progress += 1;
      if (effectiveStatus === "completed") counts.finished += 1;
      if (effectiveStatus === "cancelled") counts.cancelled += 1;
    }

    return counts;
  }, [sortedItems]);

  const visibleItems = useMemo(() => {
    return sortedItems.filter((item) => {
      const parsedNotes = parseAppointmentNotes(item.notes);
      const isPrepaid = !!parsedNotes.payment?.isPrepaid;
      const effectiveStatus = getEffectiveAppointmentStatus(item, isPrepaid);
      const paymentMethod = parsedNotes.payment?.method?.toLowerCase() ?? "";
      const paymentState = parsedNotes.payment?.isPrepaid ? "confirmed" : parsedNotes.payment ? "processing" : "";
      const searchText = [
        item.customer_name,
        item.customer_email,
        item.customer_phone,
        item.id,
        item.barber?.full_name,
        item.service?.name,
        item.branch?.name,
        parsedNotes.payment?.tx,
        parsedNotes.payment?.cardLabel,
        parsedNotes.userNote,
        paymentMethod,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      // Client-side barber filter
      if (barberFilter && item.barber_id !== barberFilter) return false;
      // Client-side service filter
      if (serviceFilter && item.service_id !== serviceFilter) return false;
      // Strict client-side date filtering so shortcut chips always match the visible list
      if (dateFrom && item.appointment_date < dateFrom) return false;
      if (dateTo && item.appointment_date > dateTo) return false;

      const matchesQuickStatus =
        quickStatusFilter === "all" ||
        (quickStatusFilter === "to_start" && effectiveStatus === "confirmed") ||
        (quickStatusFilter === "in_progress" && effectiveStatus === "in_progress") ||
        (quickStatusFilter === "finished" && effectiveStatus === "completed") ||
        (quickStatusFilter === "cancelled" && effectiveStatus === "cancelled");

      if (!matchesQuickStatus) return false;

      if (paymentFilter === "yape" && !paymentMethod.includes("yape")) return false;
      if (paymentFilter === "card" && !paymentMethod.includes("tarjeta")) return false;
      if (paymentFilter === "processing" && paymentState !== "processing") return false;

      // Multi-word search: every word must be found in the searchText
      if (searchQuery.trim()) {
        const searchWords = searchQuery.trim().toLowerCase().split(/\s+/);
        if (!searchWords.every(word => searchText.includes(word))) return false;
      }

      return true;
    });
  }, [barberFilter, dateFrom, dateTo, paymentFilter, quickStatusFilter, searchQuery, serviceFilter, sortedItems]);

  // Pagination: only show visibleCount items
  const paginatedItems = useMemo(() => visibleItems.slice(0, visibleCount), [visibleItems, visibleCount]);
  const hasMore = visibleCount < visibleItems.length;

  // Reset pagination when filters change
  useEffect(() => { setVisibleCount(15); }, [searchQuery, quickStatusFilter, paymentFilter, barberFilter, serviceFilter, dateFrom, dateTo]);

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];

    if (searchQuery.trim()) chips.push({ key: "search", label: `Busqueda: ${searchQuery.trim()}`, clear: () => setSearchQuery("") });
    if (branchFilter) {
      const branchName = branches.find((branch) => branch.id === branchFilter)?.name ?? "Sede";
      chips.push({ key: "branch", label: branchName, clear: () => setBranchFilter("") });
    }
    if (quickStatusFilter !== "all") {
      const quickLabels: Record<Exclude<QuickStatusFilter, "all">, string> = {
        to_start: "Por iniciar",
        in_progress: "En atención",
        finished: "Finalizados",
        cancelled: "Cancelados",
      };
      chips.push({ key: "quick-status", label: quickLabels[quickStatusFilter as Exclude<QuickStatusFilter, "all">], clear: () => setQuickStatusFilter("all") });
    }
    if (paymentFilter !== "all") {
      const paymentLabels: Record<Exclude<PaymentFilter, "all">, string> = {
        yape: "Yape",
        card: "Tarjeta",
        processing: "En validación",
      };
      chips.push({ key: "payment", label: paymentLabels[paymentFilter as Exclude<PaymentFilter, "all">], clear: () => setPaymentFilter("all") });
    }
    if (statusFilter) chips.push({ key: "status", label: STATUS_CONFIG_SIMPLE[statusFilter as Appointment["status"]]?.label ?? statusFilter, clear: () => setStatusFilter("") });
    if (barberFilter) chips.push({ key: "barber", label: barbers.find((barber) => barber.id === barberFilter)?.full_name ?? "Barbero", clear: () => setBarberFilter("") });
    if (serviceFilter) chips.push({ key: "service", label: services.find((service) => service.id === serviceFilter)?.name ?? "Servicio", clear: () => setServiceFilter("") });
    if (dateFrom) chips.push({ key: "date-from", label: `Desde ${dateFrom}`, clear: () => setDateFrom("") });
    if (dateTo) chips.push({ key: "date-to", label: `Hasta ${dateTo}`, clear: () => setDateTo("") });

    return chips;
  }, [barberFilter, barbers, branchFilter, branches, dateFrom, dateTo, paymentFilter, quickStatusFilter, searchQuery, serviceFilter, services, statusFilter]);

  return (
    <section className="space-y-6">
      {branchesLoading ? (
        <AdminHeaderSkeleton />
      ) : (
        <div className="space-y-4 border-b border-[var(--border)] pb-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-playfair), serif" }}>
                Gestión de <span style={{ color: "var(--accent)" }}>Citas</span>
              </h2>
              <p className="mt-1 text-xs sm:text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Monitorea y actualiza el estado de las citas en tiempo real. {visibleItems.length} {visibleItems.length === 1 ? "cita encontrada" : "citas encontradas"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center rounded-xl border border-[var(--border-strong)] bg-[var(--bg-secondary)] overflow-hidden">
                <button
                  onClick={() => setViewMode("detailed")}
                  title="Vista detallada"
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all ${
                    viewMode === "detailed"
                      ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-inner"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  <FaGripVertical className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Detallada</span>
                </button>
                <button
                  onClick={() => setViewMode("compact")}
                  title="Vista compacta"
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all ${
                    viewMode === "compact"
                      ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-inner"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  <FaList className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Compacta</span>
                </button>
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`admin-btn font-semibold flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  showFilters ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]" : ""
                }`}
              >
                <FaFilter className="h-4 w-4" />
                {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
              </button>
            </div>
          </div>

          {/* Sede tabs premium */}
          {branches.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              <button
                onClick={() => setBranchFilter("")}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                  branchFilter === ""
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)] shadow-md"
                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-white/[0.02]"
                }`}
              >
                <FaEarthAmericas className="h-3.5 w-3.5" />
                Todas las Sedes
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBranchFilter(b.id)}
                  className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                    branchFilter === b.id
                      ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)] shadow-md"
                      : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-white/[0.02]"
                  }`}
                >
                  <FaLocationDot className="h-3.5 w-3.5" />
                  {b.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {[
              { key: "all", label: "Todas", count: quickFilterCounts.all },
              { key: "to_start", label: "Por iniciar", count: quickFilterCounts.to_start },
              { key: "in_progress", label: "En atención", count: quickFilterCounts.in_progress },
              { key: "finished", label: "Finalizados", count: quickFilterCounts.finished },
              { key: "cancelled", label: "Cancelados", count: quickFilterCounts.cancelled },
            ].map((filterItem) => (
              <button
                key={filterItem.key}
                onClick={() => setQuickStatusFilter(filterItem.key as QuickStatusFilter)}
                className={`px-3 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all whitespace-nowrap border flex items-center gap-2 ${
                  quickStatusFilter === filterItem.key
                    ? filterItem.key === "to_start"
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/40 shadow-md"
                      : filterItem.key === "in_progress"
                      ? "bg-purple-500/10 text-purple-300 border-purple-500/40 shadow-md"
                      : filterItem.key === "finished"
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40 shadow-md"
                      : filterItem.key === "cancelled"
                      ? "bg-red-500/10 text-red-300 border-red-500/40 shadow-md"
                      : "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)] shadow-md"
                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-white/[0.02]"
                }`}
              >
                <span>{filterItem.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                  quickStatusFilter === filterItem.key
                    ? filterItem.key === "to_start"
                      ? "bg-amber-400 text-[var(--bg-primary)]"
                      : filterItem.key === "in_progress"
                      ? "bg-purple-400 text-[var(--bg-primary)]"
                      : filterItem.key === "finished"
                      ? "bg-emerald-400 text-[var(--bg-primary)]"
                      : filterItem.key === "cancelled"
                      ? "bg-red-400 text-[var(--bg-primary)]"
                      : "bg-[var(--accent)] text-[var(--bg-primary)]"
                    : "bg-white/5 text-[var(--text-muted)]"
                }`}>
                  {filterItem.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 xl:max-w-xl">
                <FaMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cliente, teléfono, barbero, código o método de pago"
                  className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-secondary)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                />
              </div>

              {/* Date shortcuts */}
              <div className="hidden sm:flex items-center gap-1.5">
                {[
                  { key: "all" as const, label: "Todo", icon: null },
                  { key: "today" as const, label: "Hoy", icon: <FaCalendarDay className="h-3 w-3" /> },
                  { key: "week" as const, label: "Semana", icon: null },
                  { key: "month" as const, label: "Mes", icon: null },
                ].map((ds) => (
                  <button
                    key={ds.key}
                    onClick={() => applyDateShortcut(ds.key)}
                    className={`flex items-center gap-1 px-3 py-2 text-[11px] font-bold rounded-xl border transition-all whitespace-nowrap ${
                      dateShortcut === ds.key
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)] shadow-sm"
                        : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent-border)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {ds.icon}
                    {ds.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-wider transition xl:hidden ${
                showFilters
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
              }`}
            >
              <FaFilter className="h-4 w-4" />
              {showFilters ? "Ocultar panel" : "Mostrar panel"}
            </button>
          </div>

          {/* Mobile date shortcuts */}
          <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { key: "all" as const, label: "Todo" },
              { key: "today" as const, label: "Hoy" },
              { key: "week" as const, label: "Semana" },
              { key: "month" as const, label: "Mes" },
            ].map((ds) => (
              <button
                key={ds.key}
                onClick={() => applyDateShortcut(ds.key)}
                className={`px-3 py-2 text-[11px] font-bold rounded-xl border transition-all whitespace-nowrap ${
                  dateShortcut === ds.key
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)] shadow-sm"
                    : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent-border)]"
                }`}
              >
                {ds.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={`grid gap-6 ${showFilters ? "xl:grid-cols-[280px_minmax(0,1fr)]" : ""}`}>
        {showFilters && (
        <aside className="block">
          <div className="admin-card space-y-5 animate-fade-in bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-5 shadow-xl xl:sticky xl:top-24">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                Filtros avanzados
              </h3>
              <button
                onClick={() => void clearFilters()}
                className="text-xs font-semibold hover:underline"
                style={{ color: "var(--text-muted)" }}
              >
                Limpiar
              </button>
            </div>

            {/* Payment filter pills */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Método de pago</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "all", label: "Todos" },
                  { key: "yape", label: "Yape" },
                  { key: "card", label: "Tarjeta" },
                  { key: "processing", label: "En validación" },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setPaymentFilter(option.key as PaymentFilter)}
                    className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                      paymentFilter === option.key
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]"
                        : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Barbero</label>
                <select value={barberFilter} onChange={(e) => setBarberFilter(e.target.value)} className="admin-select !w-full !bg-[var(--bg-secondary)] border-[var(--border-strong)] focus:border-[var(--accent)] rounded-xl py-2 px-3">
                  <option value="">Todos los barberos</option>
                  {barbers.map((b) => <option key={b.id} value={b.id}>{b.full_name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Servicio</label>
                <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="admin-select !w-full !bg-[var(--bg-secondary)] border-[var(--border-strong)] focus:border-[var(--accent)] rounded-xl py-2 px-3">
                  <option value="">Todos los servicios</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Desde</label>
                <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setDateShortcut("all"); }} className="admin-input !w-full !bg-[var(--bg-secondary)] border-[var(--border-strong)] focus:border-[var(--accent)] rounded-xl py-2 px-3" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Hasta</label>
                <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setDateShortcut("all"); }} className="admin-input !w-full !bg-[var(--bg-secondary)] border-[var(--border-strong)] focus:border-[var(--accent)] rounded-xl py-2 px-3" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider pl-1 text-[var(--text-muted)]">Límite de carga</label>
                <select value={limit} onChange={(e) => setLimit(e.target.value)} className="admin-select !w-full !bg-[var(--bg-secondary)] border-[var(--border-strong)] focus:border-[var(--accent)] rounded-xl py-2 px-3">
                  <option value="20">20 resultados</option>
                  <option value="50">50 resultados</option>
                  <option value="100">100 resultados</option>
                  <option value="200">200 resultados</option>
                </select>
              </div>

              <button onClick={() => void applyFilters()} className="admin-btn admin-btn-primary w-full justify-center !py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all">
                Recargar datos
              </button>
            </div>
          </div>
        </aside>
        )}

        <div className="space-y-4">
          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={chip.clear}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)]/20 px-3 py-1.5 text-[11px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
                >
                  <span>{chip.label}</span>
                  <FaXmark className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <AdminAppointmentsSkeleton rows={6} />
          ) : visibleItems.length === 0 ? (
            <div className="admin-card p-16 text-center bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl shadow-lg">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl mb-4" style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}>
                <svg className="h-10 w-10 text-[var(--accent)] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>No se encontraron citas</h3>
              <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                Intenta cambiar la busqueda, la sede o los filtros activos para visualizar otras reservas registradas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Compact view table header */}
              {viewMode === "compact" && paginatedItems.length > 0 && (
                <div className="hidden md:grid grid-cols-[70px_1fr_1fr_1fr_130px_140px] gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)]">
                  <span>Fecha</span>
                  <span>Cliente</span>
                  <span>Servicio / Barbero</span>
                  <span>Pago</span>
                  <span>Estado</span>
                  <span className="text-right">Acciones</span>
                </div>
              )}
              {paginatedItems.map((item) => {
            const { payment, companions, groupSlots, userNote } = parseAppointmentNotes(item.notes);
            const isPrepaid = !!payment?.isPrepaid;
            const effectiveStatus = getEffectiveAppointmentStatus(item, isPrepaid);
            const config = getDetailedStatusConfig(effectiveStatus, isPrepaid);
            const actions = getAdminActions(effectiveStatus);
            const paymentVisual = payment ? getPaymentVisual(payment.method) : null;
            const timelineSteps = getTimelineSteps(effectiveStatus);

            // ─── COMPACT VIEW ───
            if (viewMode === "compact") {
              return (
                <div
                  key={item.id}
                  className="admin-card bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--accent-border)]/50 transition-all duration-200 rounded-xl px-4 py-3 shadow-sm group"
                >
                  {/* Mobile compact */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[var(--accent)] font-mono">
                          {new Date(item.appointment_date + "T00:00").toLocaleDateString("es", { day: "2-digit", month: "short" })}
                        </span>
                        <span className="text-xs font-bold font-mono text-[var(--text-primary)]">{item.start_time.slice(0, 5)}</span>
                      </div>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider"
                        style={{ color: config.color, background: config.bg }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-[var(--text-primary)]">{item.customer_name ?? "Sin nombre"}</p>
                          <ReliabilityBadge reliability={item.client_reliability} />
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">{item.service?.name ?? "Servicio"} · {item.barber?.full_name ?? "Barbero"}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {actions.map((action) => (
                          <button
                            key={action.nextStatus}
                            disabled={savingId === item.id}
                            onClick={() => void changeStatus(item.id, action.nextStatus)}
                            className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all ${
                              action.tone === "danger"
                                ? "border border-red-500/20 bg-red-500/10 text-red-300"
                                : "border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                            } ${savingId === item.id ? "cursor-wait opacity-60" : "cursor-pointer"}`}
                          >
                            {savingId === item.id ? "..." : action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Desktop compact row */}
                  <div className="hidden md:grid grid-cols-[70px_1fr_1fr_1fr_130px_140px] gap-3 items-center">
                    {/* Date */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">
                        {new Date(item.appointment_date + "T00:00").toLocaleDateString("es", { month: "short" })}
                      </span>
                      <span className="text-lg font-black leading-none text-[var(--text-primary)] font-mono">
                        {new Date(item.appointment_date + "T00:00").getDate()}
                      </span>
                      <span className="text-[10px] font-bold font-mono text-[var(--accent)]">{item.start_time.slice(0, 5)}</span>
                    </div>
                    {/* Customer */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{item.customer_name ?? "Sin nombre"}</p>
                        <ReliabilityBadge reliability={item.client_reliability} />
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">{item.customer_email ?? item.customer_phone ?? ""}</p>
                    </div>
                    {/* Service & Barber */}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{item.service?.name ?? "Servicio"}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">{item.barber?.full_name ?? "Barbero"}</p>
                      {item.service?.price != null && (
                        <span className="inline-block mt-0.5 text-[10px] font-black font-mono text-[var(--accent)]">S/ {item.service.price.toFixed(2)}</span>
                      )}
                    </div>
                    {/* Payment */}
                    <div className="min-w-0">
                      {payment ? (
                        <div className="flex items-center gap-1.5">
                          {paymentVisual && (
                            <Image src={paymentVisual.iconSrc} alt={paymentVisual.iconAlt} width={16} height={16} className="h-4 w-4 object-contain" />
                          )}
                          <span className="text-[10px] font-bold text-[var(--text-secondary)] truncate">
                            {payment.method === "YAPE" ? "Yape" : payment.method === "TARJETA" ? `Tarjeta ${payment.cardLabel ?? ""}` : payment.method}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)]">—</span>
                      )}
                      {companions != null && companions > 1 && (
                        <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold text-[var(--accent)]">
                          <FaUserGroup className="h-3 w-3" /> {companions}p
                        </span>
                      )}
                    </div>
                    {/* Status */}
                    <div>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider"
                        style={{ color: config.color, background: config.bg }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {config.label}
                      </span>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5">
                      {actions.map((action) => (
                        <button
                          key={action.nextStatus}
                          disabled={savingId === item.id}
                          onClick={() => void changeStatus(item.id, action.nextStatus)}
                          className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all ${
                            action.tone === "danger"
                              ? "border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15"
                              : "border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)] hover:border-[var(--accent)]"
                          } ${savingId === item.id ? "cursor-wait opacity-60" : "cursor-pointer"}`}
                        >
                          {savingId === item.id ? "..." : action.label}
                        </button>
                      ))}
                      {actions.length === 0 && (
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">#{item.id.slice(0, 6)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // ─── DETAILED VIEW ───
            return (
              <div 
                key={item.id} 
                className="admin-card bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--accent-border)]/50 transition-all duration-300 rounded-2xl p-5 shadow-lg group hover:-translate-y-0.5"
              >
                {/* Upper Row: Date, Branch, Stepper & Status Selector */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[var(--border)] pb-4 mb-4">
                  <div className="flex items-center gap-4">
                    {/* Date Badge */}
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl shadow-md transition-transform group-hover:scale-105" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-strong)" }}>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">
                        {new Date(item.appointment_date + "T00:00").toLocaleDateString("es", { month: "short" })}
                      </span>
                      <span className="text-xl font-black leading-none mt-0.5 text-[var(--text-primary)] font-mono">
                        {new Date(item.appointment_date + "T00:00").getDate()}
                      </span>
                    </div>

                    <div>
                      {/* Branch Badge & Time */}
                      <div className="flex flex-wrap items-center gap-2">
                        {item.branch?.name && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]">
                            <FaLocationDot className="mr-1 h-3 w-3" />
                            {item.branch.name}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          ID: #{item.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <FaClock className="h-4 w-4 text-[var(--accent)]" />
                        <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                          {item.start_time.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stepper & Actions */}
                  <div className="flex flex-wrap items-center gap-3 self-end xl:self-center">
                    {/* Stepper component */}
                    {effectiveStatus !== "no_show" && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold py-1.5 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] overflow-hidden shrink-0">
                        {timelineSteps.map((step, idx) => {
                          return (
                            <div key={step.key} className="flex items-center gap-1.5 sm:gap-2">
                              {idx > 0 && (
                                <div className={`h-[2px] w-2 sm:w-4 transition-all duration-300 ${
                                  step.state === "completed" || step.state === "active" ? "bg-[var(--accent)]" : "bg-white/10"
                                }`} />
                              )}
                              <div className="flex items-center gap-1">
                                <span className={`flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full text-[9px] sm:text-[10px] font-black transition-all ${
                                  step.state === "completed"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                    : step.state === "active"
                                    ? effectiveStatus === "cancelled"
                                      ? "bg-red-500/10 text-red-300 border border-red-500/30"
                                      : effectiveStatus === "in_progress"
                                      ? "bg-purple-500/10 text-purple-300 border border-purple-500/30"
                                      : "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)] animate-pulse"
                                    : "bg-white/5 text-[var(--text-muted)] border border-white/5"
                                }`}>
                                  {step.state === "completed" ? <FaCheck className="h-2.5 w-2.5" /> : idx + 1}
                                </span>
                                <span className={`hidden md:inline text-[9px] sm:text-[10px] ${
                                  step.state === "completed"
                                    ? "text-emerald-400"
                                    : step.state === "active"
                                    ? effectiveStatus === "cancelled"
                                      ? "text-red-300"
                                      : effectiveStatus === "in_progress"
                                      ? "text-purple-300"
                                      : "text-[var(--accent)]"
                                    : "text-[var(--text-muted)]"
                                }`}>
                                  {step.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Exceptions (Cancelled or No Show) banner */}
                    {(effectiveStatus === "cancelled" || effectiveStatus === "no_show") && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider" style={{ color: config.color, background: config.bg, border: `1px solid ${config.color}20` }}>
                        <FaBan className="h-3 w-3" />
                        Cita {config.label}
                      </span>
                    )}

                    {/* Status badge pill and buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span 
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wider"
                        style={{ color: config.color, background: config.bg }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                        {config.label}
                      </span>

                      {actions.map((action) => (
                        <button
                          key={action.nextStatus}
                          type="button"
                          disabled={savingId === item.id}
                          onClick={() => void changeStatus(item.id, action.nextStatus)}
                          className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                            action.tone === "danger"
                              ? "border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15"
                              : "border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)] hover:border-[var(--accent)]"
                          } ${savingId === item.id ? "cursor-wait opacity-60" : "cursor-pointer"}`}
                        >
                          {savingId === item.id ? "Guardando..." : action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main Content: Info Columns */}
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Column 1: Customer Details */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] pb-1">
                      Cliente
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--accent-border)]/40 bg-[var(--bg-secondary)] shadow-inner">
                          <span className="text-xs font-black text-[var(--accent)]">
                            {getCustomerInitials(item.customer_name)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-base font-bold text-[var(--text-primary)]">
                              {item.customer_name ?? "Cliente sin nombre"}
                            </p>
                            <ReliabilityBadge reliability={item.client_reliability} />
                          </div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            {item.client_reliability?.description ?? "Cliente registrado"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                        {item.customer_email && (
                          <a 
                            href={`mailto:${item.customer_email}`}
                            className="flex items-center gap-2 hover:text-[var(--accent)] transition-colors py-0.5 group/link"
                          >
                            <FaEnvelope className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover/link:text-[var(--accent)]" />
                            <span className="truncate max-w-[180px]">{item.customer_email}</span>
                          </a>
                        )}

                        {item.customer_phone && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {/* Call link */}
                            <a 
                              href={`tel:${item.customer_phone}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-strong)] hover:border-[var(--accent)] bg-[var(--bg-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] transition-all font-semibold text-[10px] sm:text-xs"
                            >
                              <FaPhone className="h-3 w-3" />
                              Llamar
                            </a>
                            
                            {/* WhatsApp link */}
                            <a 
                              href={getWhatsAppUrl(item.customer_phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/40 transition-all font-semibold text-[10px] sm:text-xs"
                            >
                              <FaWhatsapp className="h-3 w-3 fill-current" />
                              WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Service & Barber Details with images */}
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] pb-1">
                      <FaScissors className="h-3 w-3" />
                      Servicio y Barbero
                    </h4>
                    <div className="space-y-3">
                      {/* Service block with thumbnail */}
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 rounded-xl border border-white/10 overflow-hidden bg-[var(--bg-secondary)] flex items-center justify-center shadow-md">
                          {item.service?.image_url ? (
                            <Image
                              src={item.service.image_url} 
                              alt={item.service.name} 
                              fill
                              sizes="48px"
                              className="object-cover" 
                            />
                          ) : (
                            <span className="text-sm font-black text-[var(--accent)] font-serif">
                              {item.service?.name ? item.service.name.charAt(0).toUpperCase() : "S"}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                            {item.service?.name ?? "Servicio no especificado"}
                          </p>
                          {item.service?.price != null && (
                            <span className="inline-block mt-1 text-[11px] font-black font-mono text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent-border)]/30 rounded-md px-2 py-0.5">
                              S/ {item.service.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Barber block with avatar */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="relative h-10 w-10 shrink-0 rounded-full border border-[var(--accent-border)]/40 overflow-hidden bg-[var(--bg-secondary)] flex items-center justify-center shadow-inner">
                          {item.barber?.image_url ? (
                            <Image
                              src={item.barber.image_url} 
                              alt={item.barber.full_name} 
                              fill
                              sizes="40px"
                              className="object-cover" 
                            />
                          ) : (
                            <span className="text-xs font-black text-[var(--accent)]">
                              {item.barber?.full_name ? item.barber.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "B"}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)] leading-none">
                            {item.barber?.full_name ?? "Cualquier barbero"}
                          </p>
                          <p className="flex items-center gap-1 text-[9px] uppercase font-black tracking-widest text-[var(--text-muted)] mt-1.5">
                            <FaUserTie className="h-2.5 w-2.5" />
                            Barbero Especialista
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Companions & Payment Details */}
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] pb-1">
                      <FaCreditCard className="h-3 w-3" />
                      Pago y Acompañantes
                    </h4>
                    <div className="space-y-3 text-xs">
                      {/* Companions indicator */}
                      {companions != null && companions > 1 ? (
                        <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                              <FaUserGroup className="h-3.5 w-3.5" />
                              Reserva Grupal
                            </span>
                            <span className="text-[10px] font-bold text-[var(--text-muted)]">
                              {companions} personas
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 overflow-hidden py-1 pl-1">
                            {Array.from({ length: Math.min(companions, 5) }).map((_, aIdx) => (
                              <div 
                                key={aIdx} 
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--accent-border)]/20 bg-gradient-to-tr from-amber-500/10 to-amber-600/30 text-[var(--accent)] shadow-sm"
                              >
                                <FaUser className="h-3.5 w-3.5" />
                              </div>
                            ))}
                            {companions > 5 && (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--border-strong)] text-[9px] font-bold text-[var(--text-secondary)] shadow-sm">
                                +{companions - 5}
                              </div>
                            )}
                          </div>

                          {groupSlots && groupSlots.length > 0 && (
                            <div className="flex flex-wrap gap-1 items-center pt-1.5 border-t border-[var(--border)]">
                              {groupSlots.map((slotTime, sIdx) => {
                                const isCurrent = slotTime.slice(0, 5) === item.start_time.slice(0, 5);
                                return (
                                  <span 
                                    key={sIdx} 
                                    className={`rounded-lg px-2 py-0.5 text-[9px] font-bold font-mono ${
                                      isCurrent 
                                        ? "bg-[var(--accent)] text-[var(--bg-primary)] shadow-sm" 
                                        : "bg-white/5 text-[var(--text-muted)]"
                                    }`}
                                  >
                                    {slotTime.slice(0, 5)}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-[var(--border)] bg-white/[0.01]">
                          <FaUser className="h-4 w-4 text-[var(--text-muted)]" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Reserva Individual
                          </span>
                        </div>
                      )}

                      {/* Payment Badge */}
                      {payment ? (
                        <div className="pt-1">
                          <div className={`p-3 rounded-2xl border flex flex-col gap-2 ${paymentVisual?.accentClass ?? "bg-emerald-500/5 text-emerald-400 border-emerald-500/15"}`}>
                            <div className="flex items-center gap-2">
                              {paymentVisual && (
                                <Image
                                  src={paymentVisual.iconSrc}
                                  alt={paymentVisual.iconAlt}
                                  width={22}
                                  height={22}
                                  className="h-[22px] w-[22px] object-contain"
                                />
                              )}
                              <span className="font-black uppercase text-[10px] tracking-wider">
                                {paymentVisual?.label ?? `Prepago: ${payment.method}`}
                              </span>
                            </div>
                            <div className="grid gap-1 pl-7 text-[10px]">
                              {payment.amount && (
                                <p className="text-[var(--text-secondary)]">
                                  Monto: <span className="font-bold">{payment.currency === "PEN" ? "S/ " : ""}{payment.amount}</span>
                                </p>
                              )}
                              {payment.phone && (
                                <p className="text-[var(--text-secondary)]">
                                  Celular: <span className="font-bold">{payment.phone}</span>
                                </p>
                              )}
                              {payment.cardLabel && (
                                <p className="text-[var(--text-secondary)]">
                                  Tarjeta: <span className="font-bold">{payment.cardLabel}</span>
                                </p>
                              )}
                              <p className="text-[10px] text-[var(--text-muted)] font-mono leading-none">
                                ID: <span className="text-[var(--text-secondary)] font-bold">{payment.tx}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1">
                          <div className="p-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] flex items-center gap-2">
                            <FaRegCircleCheck className="h-4 w-4" />
                            <span className="font-bold text-[10px] tracking-wider uppercase">
                              Sin información de pago
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: User Notes */}
                {userNote && (
                  <div className="mt-4 pt-3 border-t border-[var(--border)]">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1.5 pl-1">
                      Nota del Cliente
                    </p>
                    <blockquote 
                      className="text-xs italic pl-3 border-l-2 py-1 rounded-r bg-[var(--bg-secondary)]/20"
                      style={{ borderLeftColor: "var(--accent)" }}
                    >
                      &quot;{userNote}&quot;
                    </blockquote>
                  </div>
                )}
              </div>
            );
          })}

              {/* Load more button */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 15)}
                    className="group flex items-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-8 py-3 text-sm font-bold text-[var(--text-secondary)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] hover:shadow-lg"
                  >
                    <svg className="h-4 w-4 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    Ver más citas
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-mono text-[var(--text-muted)] group-hover:bg-[var(--accent)]/10 group-hover:text-[var(--accent)]">
                      {visibleItems.length - visibleCount} restantes
                    </span>
                  </button>
                </div>
              )}

              {/* Summary footer */}
              {paginatedItems.length > 0 && (
                <div className="flex items-center justify-center gap-3 pt-2 text-[11px] text-[var(--text-muted)]">
                  <span>Mostrando {paginatedItems.length} de {visibleItems.length} citas</span>
                  {visibleItems.length < sortedItems.length && (
                    <span className="text-[var(--accent)]">(filtradas de {sortedItems.length} totales)</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
