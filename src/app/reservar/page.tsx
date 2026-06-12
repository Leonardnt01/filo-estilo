"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useToast } from "@/components/toast";

type Service = { id: string; name: string; description: string | null; price: number; duration_minutes: number; branch_id: string | null };
type Barber = { id: string; full_name: string; specialty: string | null; branch_id?: string | null; image_url?: string | null };
type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  hero_image_url?: string | null;
  cover_image_url?: string | null;
};
type Slot = { start_time: string; end_time: string };
type CalendarCell = { iso: string; day: number; inMonth: boolean; disabled: boolean; isToday: boolean };
type Stage = "branch" | "booking" | "payment";
type PayMethod = "qr" | "cash" | "card";
const DEMO_CARD = {
  number: "4242 4242 4242 4242",
  holder: "CLIENTE DEMO",
  expiry: "12/30",
  cvv: "123",
};

const BRANCH_IMAGE_MAP: Record<string, string> = {
  "sede-principal": "https://www.businessempresarial.com.pe/wp-content/uploads/2025/09/Montalvo-For-Men-780x470.jpeg",
  "sede-norte": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1200&auto=format&fit=crop",
};

const SERVICE_IMAGE_POOL = [
  "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=900&auto=format&fit=crop",
];

function getServiceImage(serviceName: string, idx: number) {
  const key = serviceName.toLowerCase();
  if (key.includes("barba")) return "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?q=80&w=900&auto=format&fit=crop";
  if (key.includes("corte")) return "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=900&auto=format&fit=crop";
  if (key.includes("premium")) return "https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=900&auto=format&fit=crop";
  return SERVICE_IMAGE_POOL[idx % SERVICE_IMAGE_POOL.length];
}

const BARBER_IMAGE_MAP: Record<string, string> = {
  carlos: "https://images.unsplash.com/photo-1618077360395-f3068be8e001?q=80&w=600&auto=format&fit=crop", // Carlos Martínez
  javier: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop", // Javier Ramírez
  jefferson: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop", // Jefferson
  miguel: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop", // Miguel Ángel
};

function getBarberImage(fullName: string) {
  const name = fullName.toLowerCase();
  if (name.includes("carlos")) return BARBER_IMAGE_MAP.carlos;
  if (name.includes("javier")) return BARBER_IMAGE_MAP.javier;
  if (name.includes("jefferson")) return BARBER_IMAGE_MAP.jefferson;
  if (name.includes("miguel")) return BARBER_IMAGE_MAP.miguel;
  return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop";
}

function formatCardNumber(input: string) {
  return input
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function normalizeCardText(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function ReservarPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>("branch");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [branchId, setBranchId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [people, setPeople] = useState(1);
  const [validationModalMessage, setValidationModalMessage] = useState<string | null>(null);
  const [serviceSelectionModalIdx, setServiceSelectionModalIdx] = useState<number | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("qr");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Estados de progreso de confirmación animada
  const [bookingStatus, setBookingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bookingErrorMsg, setBookingErrorMsg] = useState<string | null>(null);
  const [currentBookingIndex, setCurrentBookingIndex] = useState(0);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [requestedServiceId, setRequestedServiceId] = useState("");

  const minDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  }, []);

  const maxDate = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + 60);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  }, []);

  const calendarLabel = useMemo(
    () => calendarMonth.toLocaleDateString("es-PE", { month: "long", year: "numeric" }),
    [calendarMonth],
  );

  const services = useMemo(() => allServices.filter((s) => s.branch_id === branchId), [allServices, branchId]);

  const monthMatrix = useMemo(() => {
    const start = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const firstWeekDay = (start.getDay() + 6) % 7;
    const matrixStart = new Date(start);
    matrixStart.setDate(start.getDate() - firstWeekDay);

    const minTime = new Date(`${minDate}T00:00:00`).getTime();
    const maxTime = new Date(`${maxDate}T00:00:00`).getTime();
    const todayIso = new Date().toISOString().slice(0, 10);

    const cells: CalendarCell[] = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(matrixStart);
      d.setDate(matrixStart.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const stamp = new Date(`${iso}T00:00:00`).getTime();
      cells.push({
        iso,
        day: d.getDate(),
        inMonth: d.getMonth() === calendarMonth.getMonth(),
        disabled: stamp < minTime || stamp > maxTime,
        isToday: iso === todayIso,
      });
    }

    return cells;
  }, [calendarMonth, minDate, maxDate]);

  useEffect(() => {
    async function loadCatalog() {
      const res = await fetch("/api/booking/catalog");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "No se pudo cargar catálogo");
        return;
      }

      const fetchedBranches = json.branches ?? [];
      const fetchedServices = json.services ?? [];
      setBranches(fetchedBranches);
      setAllServices(fetchedServices);

      const requestedService = searchParams.get("service_id");
      const requestedBranch = searchParams.get("branch_id");

      if (requestedService && fetchedServices.some((s: Service) => s.id === requestedService)) {
        setRequestedServiceId(requestedService);
        setServiceId(requestedService);
        const serviceBranch = fetchedServices.find((s: Service) => s.id === requestedService)?.branch_id;
        if (serviceBranch) setBranchId(serviceBranch);
      }

      if (requestedBranch && fetchedBranches.some((b: Branch) => b.id === requestedBranch)) {
        setBranchId(requestedBranch);
      } else if (!requestedService && fetchedBranches?.[0]?.id) {
        setBranchId(fetchedBranches[0].id);
      }
    }

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => ({}));
        setIsAuthenticated(!!json.authenticated);
        if (!json.authenticated) setShowAuthModal(true);
      } catch {
        setIsAuthenticated(false);
        setShowAuthModal(true);
      }
    }

    void loadCatalog();
    void checkAuth();
  }, [searchParams]);

  useEffect(() => {
    if (!branchId) return;
    const branchServices = allServices.filter((s) => s.branch_id === branchId);
    if (!branchServices.find((s) => s.id === serviceId)) {
      if (requestedServiceId && branchServices.find((s) => s.id === requestedServiceId)) {
        setTimeout(() => setServiceId(requestedServiceId), 0);
        return;
      }
      const nextServiceId = branchServices?.[0]?.id ?? "";
      setTimeout(() => setServiceId(nextServiceId), 0);
    }

    async function loadBranchDetails() {
      const res = await fetch(`/api/booking/catalog?branch_id=${branchId}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "No se pudo cargar datos de sede");
        return;
      }
      const fetchedBarbers = json.barbers ?? [];
      setBarbers(fetchedBarbers);
      setBarberId((prev) => (fetchedBarbers.some((b: Barber) => b.id === prev) ? prev : (fetchedBarbers?.[0]?.id ?? "")));
      setSelectedSlots([]);
      setSlots([]);
    }

    void loadBranchDetails();
  }, [allServices, branchId, serviceId, requestedServiceId]);

  const loadSlots = useCallback(async () => {
    setError(null);
    if (!branchId || !serviceId || !barberId || !date) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    const res = await fetch("/api/booking/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch_id: branchId, service_id: serviceId, barber_id: barberId, appointment_date: date }),
    });
    const json = await res.json().catch(() => ({}));
    setLoadingSlots(false);

    if (!res.ok) {
      setError(json.error ?? "No se pudo consultar disponibilidad");
      setSlots([]);
      return;
    }

    setSlots(json.slots ?? []);
  }, [barberId, branchId, date, serviceId]);

  useEffect(() => {
    // Only refresh availability while user is in booking stage.
    // Prevents clearing selected group slots when advancing to payment.
    if (stage !== "booking") return;
    if (!branchId || !serviceId || !barberId || !date) return;
    const timer = setTimeout(() => {
      void loadSlots();
    }, 0);
    return () => clearTimeout(timer);
  }, [stage, branchId, serviceId, barberId, date, loadSlots]);

  const selectedBarber = useMemo(() => barbers.find((b) => b.id === barberId) ?? null, [barbers, barberId]);
  const selectedBranch = useMemo(() => branches.find((b) => b.id === branchId) ?? null, [branches, branchId]);
  const normalizedServiceIds = useMemo(
    () => selectedServiceIds.filter((id) => services.some((s) => s.id === id)).slice(0, people),
    [selectedServiceIds, services, people],
  );
  const selectedServices = useMemo(
    () => normalizedServiceIds.map((id) => services.find((s) => s.id === id)).filter((s): s is Service => !!s),
    [normalizedServiceIds, services],
  );
  const totalServicesAmount = useMemo(
    () => selectedServices.reduce((acc, s) => acc + s.price, 0),
    [selectedServices],
  );

  const whatsappUrl = useMemo(() => {
    const whatsappPhone = selectedBranch?.phone ? selectedBranch.phone.replace(/\D/g, "") : "51999999999";
    const waNumber = whatsappPhone.startsWith("51") ? whatsappPhone : `51${whatsappPhone}`;
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(
      `Hola, me comunico de Filo Estilo. Quisiera solicitar una reserva personalizada para ${people} personas en la sede ${selectedBranch?.name ?? ""}.`
    )}`;
  }, [selectedBranch, people]);

  function updatePeople(nextValue: number) {
    const safe = Math.max(1, nextValue);
    setPeople(safe);
    setSelectedSlots((prev) => prev.slice(0, safe));
    setSelectedServiceIds((prev) => {
      if (prev.length >= safe) {
        return prev.slice(0, safe);
      }
      const newItems = Array(safe - prev.length).fill(serviceId || services[0]?.id || "");
      return [...prev, ...newItems];
    });
  }

  function addCompanion() {
    const nextPeople = people + 1;
    setPeople(nextPeople);
    setSelectedServiceIds((prev) => {
      const fallback = serviceId || services[0]?.id || "";
      return [...prev, fallback];
    });
    toast(`Persona ${nextPeople} agregada al grupo. Por favor selecciona su horario y servicio.`);
  }

  function removeCompanion(idx: number) {
    if (people <= 1) return;
    const nextPeople = people - 1;
    setPeople(nextPeople);
    setSelectedServiceIds((prev) => {
      const draft = [...prev];
      draft.splice(idx, 1);
      return draft;
    });
    setSelectedSlots((prev) => {
      const draft = [...prev];
      if (draft.length > nextPeople) {
        draft.pop();
      }
      return draft;
    });
    toast("Acompañante removido del grupo.");
  }

  function updateServiceSelection(index: number, nextServiceId: string) {
    setSelectedServiceIds((prev) => {
      const draft = [...prev];
      draft[index] = nextServiceId;
      return draft;
    });
  }

  function validateGroupSelections(): string | null {
    const missingServices = Math.max(0, people - normalizedServiceIds.length);
    const missingSlots = Math.max(0, people - selectedSlots.length);
    if (missingServices === 0 && missingSlots === 0) return null;
    const msgs: string[] = [];
    if (missingServices > 0) {
      msgs.push(`Te falta agregar ${missingServices} servicio${missingServices > 1 ? "s" : ""} más.`);
    }
    if (missingSlots > 0) {
      msgs.push(`Te falta agregar ${missingSlots} horario${missingSlots > 1 ? "s" : ""} más.`);
    }
    return msgs.join(" ");
  }

  function toggleSlotSelection(slotTime: string) {
    if (selectedSlots.includes(slotTime)) {
      setSelectedSlots((prev) => prev.filter((value) => value !== slotTime));
      return;
    }
    if (selectedSlots.length >= people) {
      toast(`Solo puedes seleccionar ${people} horarios`, "error");
      return;
    }
    setSelectedSlots((prev) => [...prev, slotTime]);
  }

  function validatePayment() {
    if (paymentMethod !== "card") return true;

    if (!/^\d{4} \d{4} \d{4} \d{4}$/.test(cardNumber)) {
      toast("Tarjeta invalida. Debe tener 16 digitos", "error");
      return false;
    }
    if (!cardHolder.trim()) {
      toast("Ingresa el nombre del titular", "error");
      return false;
    }
    if (!/^(0[1-9]|1[0-2])\/(\d{2})$/.test(cardExpiry)) {
      toast("Fecha invalida. Usa MM/AA", "error");
      return false;
    }
    if (!/^\d{3}$/.test(cardCvv)) {
      toast("CVV invalido. Debe tener 3 digitos", "error");
      return false;
    }

    const isDemoValid =
      cardNumber === DEMO_CARD.number &&
      normalizeCardText(cardHolder) === DEMO_CARD.holder &&
      cardExpiry === DEMO_CARD.expiry &&
      cardCvv === DEMO_CARD.cvv;

    if (!isDemoValid) {
      const message = "Tarjeta demo invalida. Usa las credenciales ficticias mostradas abajo.";
      setValidationModalMessage(message);
      toast(message, "error");
      return false;
    }
    return true;
  }

  async function book(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    const groupValidationError = validateGroupSelections();
    if (groupValidationError) {
      setValidationModalMessage(groupValidationError);
      toast(groupValidationError, "error");
      return;
    }
    if (!validatePayment()) return;

    setLoading(true);
    setError(null);
    setBookingStatus("loading");
    setBookingErrorMsg(null);
    setCurrentBookingIndex(0);

    try {
      for (const [index, slot] of selectedSlots.entries()) {
        setCurrentBookingIndex(index);
        const txId = `TX-${Date.now().toString(36).toUpperCase()}`;
        const paymentMeta =
          paymentMethod === "qr"
            ? `[PAGO FICTICIO] metodo:QR tx:${txId}`
            : paymentMethod === "cash"
              ? `[PAGO FICTICIO] metodo:EFECTIVO tx:${txId}`
              : `[PAGO FICTICIO] metodo:TARJETA tx:${txId} card:${cardNumber.slice(-4)}`;

        const res = await fetch("/api/my/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branch_id: branchId,
            barber_id: barberId,
            service_id: normalizedServiceIds[index] ?? serviceId,
            appointment_date: date,
            start_time: slot,
            initial_status: "pending",
            notes: `${paymentMeta} | Personas:${people} | Horarios del grupo: [${selectedSlots.join(", ")}]${notes ? ` | ${notes}` : ""}`,
          }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "No se pudo registrar uno de los horarios");
        }
      }

      setBookingStatus("success");
      toast(`¡Excelente! Se registraron con éxito tus ${selectedSlots.length} citas.`);
      setTimeout(() => {
        router.push("/mis-citas?created=1");
      }, 2200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo crear la cita";
      toast(message, "error");
      setError(message);
      setBookingStatus("error");
      setBookingErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { key: "branch", label: "Sede y servicio", done: stage !== "branch", icon: "M17.657 16.657L13.414 12.414A6 6 0 1012 13.828l4.243 4.243a1 1 0 001.414-1.414zM8 12a4 4 0 110-8 4 4 0 010 8z" },
    { key: "booking", label: "Barbero y horario", done: stage === "payment", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { key: "payment", label: "Pago y confirmación", done: false, icon: "M17 9V7a5 5 0 00-10 0v2m-2 0h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z" },
  ] as const;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stage]);

  return (
    <>
      <main className="flex-1 pt-36 pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-8">
            <span className="section-label">Reservación</span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Reserva tu <span className="text-[var(--accent)]">Cita</span>
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Flujo rápido: sede, barbero, horario y pago.</p>
          </div>

          <div className="mb-6 flex justify-center px-1">
            <div className="inline-flex items-center gap-2">
              {steps.map((step, idx) => {
                const isActive = stage === step.key;
                return (
                  <div key={step.key} className="flex items-center gap-2">
                    <div className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold border sm:px-4 ${isActive ? "bg-[var(--accent)] text-[var(--bg-primary)] border-[var(--accent)]" : step.done ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-border)]" : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-strong)]"}`}>
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d={step.icon} />
                      </svg>
                      <span className="hidden sm:inline">{step.label}</span>
                    </div>
                    {idx < steps.length - 1 && <div className="h-px w-4 bg-[var(--border-strong)] sm:w-5" />}
                  </div>
                );
              })}
            </div>
          </div>

          {stage === "branch" && (
            <section className="glass-card p-4 sm:p-6 space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-base font-semibold">1. Elige sede y confirma servicio</h2>
                <span className="text-xs text-[var(--text-muted)]">Vista tipo sedes</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {branches.map((b) => {
                  const branchServices = allServices.filter((s) => s.branch_id === b.id).slice(0, 4);
                  const isActive = b.id === branchId;
                  const branchImage =
                    BRANCH_IMAGE_MAP[b.slug] ||
                    b.cover_image_url ||
                    b.hero_image_url ||
                    "https://images.unsplash.com/photo-1512690459411-b0fd1b0b34fe?q=80&w=1400&auto=format&fit=crop";
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBranchId(b.id)}
                      className={`text-left rounded-xl border overflow-hidden transition-all ${isActive ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--accent-border)]"}`}
                    >
                      <img src={branchImage} alt={b.name} className="h-32 w-full object-cover" />
                      <div className="p-4">
                        <p className="font-semibold text-lg">{b.name}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{b.address ?? "Dirección por confirmar"}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {branchServices.map((s) => (
                            <span key={s.id} className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">{s.name}</span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Servicios de la sede elegida</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {services.map((s, idx) => {
                    const isSelected = serviceId === s.id;
                    const serviceImage = getServiceImage(s.name, idx);
                    
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setServiceId(s.id)}
                        className={`text-left rounded-xl border p-3 transition-all duration-300 overflow-hidden flex gap-4 items-center relative cursor-pointer group ${
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_15px_rgba(212,168,67,0.12)] ring-1 ring-[var(--accent)]"
                            : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-surface-hover)]"
                        }`}
                      >
                        {/* Image Container with Hover zoom */}
                        <div className="w-24 h-20 sm:w-28 sm:h-22 rounded-lg overflow-hidden shrink-0 border border-[var(--border-strong)] relative">
                          <img
                            src={serviceImage}
                            alt={s.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[var(--accent)]/15 backdrop-blur-[1px] flex items-center justify-center animate-fade-in">
                              <span className="bg-[var(--accent)] text-[var(--bg-primary)] p-1 rounded-full text-[10px] font-bold">✓</span>
                            </div>
                          )}
                        </div>

                        {/* Info details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                              {s.name}
                            </span>
                            <span className="text-sm font-bold text-[var(--accent)] font-mono shrink-0">
                              S/ {s.price}
                            </span>
                          </div>
                          
                          {/* Duration Badge */}
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-[var(--accent)]">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            {s.duration_minutes} min
                          </div>

                          {s.description && (
                            <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-1 leading-relaxed">
                              {s.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedServiceIds((prev) => (prev.length > 0 ? prev : (serviceId ? [serviceId] : prev)));
                    setStage("booking");
                  }}
                  disabled={!branchId || !serviceId}
                  className="btn-gold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            </section>
          )}

          {stage === "booking" && (
            <section className="glass-card p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-base font-semibold">2. Barbero y horario</h2>
                <button type="button" onClick={() => setStage("branch")} className="text-xs text-[var(--accent)] hover:underline">Cambiar sede/servicio</button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {barbers.map((b) => {
                  const isActive = barberId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBarberId(b.id)}
                      className={`group flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all ${isActive ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--accent-border)]"}`}
                    >
                      <img
                        src={getBarberImage(b.full_name)}
                        alt={b.full_name}
                        className="h-10 w-10 rounded-full object-cover border border-[var(--accent-border)] shrink-0 transition-transform duration-300 group-hover:scale-105"
                      />
                      <div>
                        <p className="text-sm font-medium">{b.full_name}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{b.specialty ?? "Barbero"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 lg:grid-cols-[300px,1fr]">
                <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <button type="button" onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="h-7 w-7 rounded border border-[var(--border-strong)]">‹</button>
                    <p className="text-xs font-semibold capitalize">{calendarLabel}</p>
                    <button type="button" onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="h-7 w-7 rounded border border-[var(--border-strong)]">›</button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[var(--text-muted)] mb-1">{"LMXJVSD".split("").map((d) => <span key={d}>{d}</span>)}</div>
                  <div className="grid grid-cols-7 gap-1">
                    {monthMatrix.map((cell) => (
                      <button
                        key={cell.iso}
                        type="button"
                        disabled={cell.disabled}
                        onClick={() => setDate(cell.iso)}
                        className={`h-8 rounded text-xs border ${date === cell.iso ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-primary)]" : cell.disabled ? "border-transparent opacity-30" : "border-[var(--border)] hover:border-[var(--accent-border)]"} ${cell.isToday && date !== cell.iso ? "ring-1 ring-[var(--accent-border)]" : ""}`}
                      >
                        {cell.day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {/* Premium Counter Component (No Limit) */}
                    <div className="flex items-center justify-between rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 h-10 select-none">
                      <span className="text-xs text-[var(--text-muted)] font-medium">Asistentes:</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updatePeople(people - 1)}
                          className="w-6 h-6 rounded bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/80 text-[var(--accent)] flex items-center justify-center font-bold text-sm transition-all border border-[var(--accent-border)] active:scale-95 cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={people}
                          onChange={(e) => updatePeople(Number(e.target.value))}
                          className="w-10 bg-transparent text-center text-sm font-bold text-[var(--text-primary)] focus:outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => updatePeople(people + 1)}
                          className="w-6 h-6 rounded bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/80 text-[var(--accent)] flex items-center justify-center font-bold text-sm transition-all border border-[var(--accent-border)] active:scale-95 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-muted)] flex items-center justify-between h-10">
                      <span>Disponibles</span>
                      <span>{loadingSlots ? "Actualizando..." : `${slots.length} horarios`}</span>
                    </div>
                  </div>

                  <div className="grid gap-2 grid-cols-3 sm:grid-cols-4">
                    {!loadingSlots && date && (
                      slots.length === 0 ? (
                        <div className="col-span-full text-center py-6 px-4 bg-red-950/10 border border-red-500/20 rounded-xl space-y-3 animate-fade-in">
                          <p className="text-sm text-[var(--text-muted)]">No hay horarios disponibles para esta fecha.</p>
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                          >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                              <path d="M12 .007c-6.617 0-12 5.391-12 12 0 2.115.549 4.16 1.595 5.977l-1.595 5.83 5.951-1.564c1.752.959 3.737 1.464 5.753 1.464h.003c6.616 0 12-5.39 12-12 0-3.2-1.243-6.206-3.5-8.46-2.256-2.254-5.262-3.497-8.462-3.497zm6.393 16.947c-.27.76-1.318 1.483-2.13 1.595-.54.075-1.242.1-3.607-.879-3.023-1.252-4.969-4.323-5.12-4.524-.152-.201-1.217-1.616-1.217-3.084 0-1.469.771-2.19 1.041-2.49.27-.3.59-.375.79-.375h.563c.18 0 .42-.068.653.495.24.577.818 2.002.893 2.152.075.15.128.323.023.533-.105.21-.158.338-.315.518-.158.18-.33.405-.472.54-.158.15-.323.315-.143.623.18.3.8 1.312 1.718 2.128.172.15.344.293.51.428.878.712 1.425.6 1.83.188.248-.255.772-.893.975-1.193.203-.3.405-.255.675-.15.27.105 1.718.81 2.018.96.3.15.5.225.57.345.075.12.075.69-.195 1.45z"/>
                            </svg>
                            Reserva por WhatsApp
                          </a>
                        </div>
                      ) : slots.length < people ? (
                        <div className="col-span-full text-center py-6 px-4 bg-[var(--accent-soft)]/20 border border-[var(--accent-border)] rounded-xl space-y-3.5 animate-fade-in">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-[var(--accent)]">
                              Reserva Grupal Personalizada
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              Has seleccionado <span className="font-semibold text-[var(--accent)]">{people} personas</span>, pero solo quedan <span className="font-semibold text-stone-200">{slots.length} horarios disponibles</span> para agendar en línea.
                            </p>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
                            No te preocupes. Para atender a tu grupo de forma coordinada y brindarte una experiencia premium a medida, por favor contáctanos directamente por WhatsApp. ¡Nosotros organizamos todo por ti!
                          </p>
                          <div className="flex justify-center">
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white px-5 py-2.5 text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                            >
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M12 .007c-6.617 0-12 5.391-12 12 0 2.115.549 4.16 1.595 5.977l-1.595 5.83 5.951-1.564c1.752.959 3.737 1.464 5.753 1.464h.003c6.616 0 12-5.39 12-12 0-3.2-1.243-6.206-3.5-8.46-2.256-2.254-5.262-3.497-8.462-3.497zm6.393 16.947c-.27.76-1.318 1.483-2.13 1.595-.54.075-1.242.1-3.607-.879-3.023-1.252-4.969-4.323-5.12-4.524-.152-.201-1.217-1.616-1.217-3.084 0-1.469.771-2.19 1.041-2.49.27-.3.59-.375.79-.375h.563c.18 0 .42-.068.653.495.24.577.818 2.002.893 2.152.075.15.128.323.023.533-.105.21-.158.338-.315.518-.158.18-.33.405-.472.54-.158.15-.323.315-.143.623.18.3.8 1.312 1.718 2.128.172.15.344.293.51.428.878.712 1.425.6 1.83.188.248-.255.772-.893.975-1.193.203-.3.405-.255.675-.15.27.105 1.718.81 2.018.96.3.15.5.225.57.345.075.12.075.69-.195 1.45z"/>
                              </svg>
                              Coordinar Reserva Personalizada
                            </a>
                          </div>
                        </div>
                      ) : (
                        slots.map((slot) => (
                          <button
                            key={slot.start_time}
                            type="button"
                            onClick={() => toggleSlotSelection(slot.start_time)}
                            className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                              selectedSlots.includes(slot.start_time)
                                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-primary)] shadow-md shadow-[var(--accent)]/10"
                                : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-surface-hover)]"
                            }`}
                          >
                            {slot.start_time}
                          </button>
                        ))
                      )
                    )}
                  </div>

                  {/* Tarjeta de Grupo y Servicios Rediseñada */}
                  <div className="rounded-xl border border-[var(--accent-border)]/40 bg-[var(--bg-surface)] p-4 sm:p-5 space-y-4 shadow-[0_4px_20px_rgba(212,168,67,0.05)] animate-fade-in">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
                          Servicios y Asistentes del Grupo
                        </h3>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Cada persona seleccionará su servicio preferido</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent-border)] px-2.5 py-1 rounded-full">
                          {people} {people === 1 ? "Persona" : "Personas"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {normalizedServiceIds.map((serviceSelectionId, idx) => {
                        const isMainUser = idx === 0;
                        const currentService = services.find(s => s.id === serviceSelectionId);
                        
                        return (
                          <div 
                            key={`service-selection-${idx}`} 
                            className="group relative rounded-xl border border-[var(--border-strong)] bg-[var(--bg-secondary)]/50 p-3.5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between transition-all duration-300 hover:border-[var(--accent-border)] hover:bg-[var(--bg-surface-hover)]"
                          >
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              {/* Avatar/Badge for Assistant */}
                              <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] flex items-center justify-center font-bold text-xs shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-[var(--text-primary)]">
                                  {isMainUser ? "Tú (Cliente Principal)" : `Acompañante ${idx + 1}`}
                                </p>
                                <p className="text-[10px] text-[var(--text-muted)] truncate">
                                  {currentService ? `${currentService.duration_minutes} min de duración` : "Servicio por elegir"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0 min-w-0">
                              {/* Botón de Selección con Imagen y Nombre del Servicio */}
                              <button
                                type="button"
                                onClick={() => setServiceSelectionModalIdx(idx)}
                                className="flex-1 sm:w-auto inline-flex items-center justify-between gap-3.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-2 text-xs font-semibold cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)] transition-all group min-w-0 sm:min-w-[200px] text-left active:scale-[0.98]"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img 
                                    src={getServiceImage(currentService?.name ?? "", services.findIndex(s => s.id === serviceSelectionId))} 
                                    alt={currentService?.name} 
                                    className="w-8 h-8 rounded-lg object-cover border border-[var(--border-strong)] group-hover:border-[var(--accent-border)] shrink-0 transition-transform group-hover:scale-105"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-[11px] text-[var(--text-primary)] font-bold truncate group-hover:text-[var(--accent)] transition-colors">
                                      {currentService?.name ?? "Elegir Servicio"}
                                    </p>
                                    <p className="text-[9px] text-[var(--text-muted)] font-medium">
                                      {currentService?.duration_minutes} min
                                    </p>
                                  </div>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors shrink-0">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                </svg>
                              </button>

                              {/* Price and Delete Action */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-bold text-[var(--accent)] min-w-[50px] text-right font-mono">
                                  S/ {currentService?.price ?? 0}
                                </span>
                                
                                {!isMainUser && (
                                  <button
                                    type="button"
                                    onClick={() => removeCompanion(idx)}
                                    title="Eliminar acompañante"
                                    className="p-1.5 rounded-lg border border-transparent text-[var(--text-muted)] hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer shrink-0"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer add button & Subtotal inside card */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border)]">
                      <button
                        type="button"
                        onClick={addCompanion}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/20 text-[var(--accent)] font-semibold text-xs py-2.5 px-4 transition-all duration-300 active:scale-[0.98] cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Añadir Acompañante
                      </button>

                      <div className="text-right w-full sm:w-auto flex sm:flex-col justify-between sm:justify-start items-center sm:items-end">
                        <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Subtotal del Grupo:</span>
                        <span className="text-sm font-bold text-[var(--accent)] font-mono sm:mt-0.5">
                          S/ {totalServicesAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const groupValidationError = validateGroupSelections();
                    if (groupValidationError) {
                      setValidationModalMessage(groupValidationError);
                      return;
                    }
                    setStage("payment");
                  }}
                  className="btn-gold active:scale-[0.98] transition-all duration-300"
                >
                  Ir a pago
                </button>
              </div>
            </section>
          )}

          {stage === "payment" && (
            <form onSubmit={book} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Ticket-like Reservation Summary */}
              <section className="relative overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 lg:col-span-7">
                {/* Decorative Side Ticket Stubs (cutouts) */}
                <div className="absolute -left-3 top-[68%] w-6 h-6 bg-[var(--bg-primary)] rounded-full border-r border-[var(--border-strong)] z-10 hidden sm:block"></div>
                <div className="absolute -right-3 top-[68%] w-6 h-6 bg-[var(--bg-primary)] rounded-full border-l border-[var(--border-strong)] z-10 hidden sm:block"></div>

                <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-semibold bg-[var(--accent-soft)] px-2.5 py-1 rounded-full border border-[var(--accent-border)]">
                      Pre-Reserva Confirmada
                    </span>
                    <h2 className="text-xl font-bold mt-2 font-display" style={{ fontFamily: "var(--font-playfair), serif" }}>
                      Resumen del Ticket
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStage("booking")}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/20 px-3 py-1.5 rounded-lg border border-[var(--accent-border)]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                    Editar
                  </button>
                </div>

                {/* Ticket Details Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Sede */}
                  <div className="flex gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/50">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Sede</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedBranch?.name ?? "-"}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">{selectedBranch?.address}</p>
                    </div>
                  </div>

                  {/* Servicio */}
                  <div className="flex gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/50">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Servicio</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {selectedServices.length > 0 ? `${selectedServices[0].name}${selectedServices.length > 1 ? ` +${selectedServices.length - 1}` : ""}` : "-"}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{selectedServices.length} servicio(s) seleccionados</p>
                    </div>
                  </div>

                  {/* Barbero */}
                  <div className="flex gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/50">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Especialista</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedBarber?.full_name ?? "-"}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{selectedBarber?.specialty ?? "Barbero Profesional"}</p>
                    </div>
                  </div>

                  {/* Fecha y Hora */}
                  <div className="flex gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/50">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Fecha y Hora</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{date || "-"} ({selectedSlots.length} horario(s))</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">Hora local confirmada</p>
                    </div>
                  </div>

                  {/* Personas */}
                  <div className="flex gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/50 sm:col-span-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Asistentes</p>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{people} {people === 1 ? "Persona" : "Personas"}</p>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] italic">Reserva múltiple habilitada</span>
                    </div>
                  </div>
                </div>

                {/* Dashed Separator mimicking a coupon rip strip */}
                <div className="relative my-6">
                  <div className="absolute left-[-32px] right-[-32px] top-1/2 -translate-y-1/2 border-t-2 border-dashed border-[var(--border-strong)]"></div>
                  <div className="relative flex justify-center">
                    <span className="bg-[var(--bg-surface)] px-4 text-[10px] text-[var(--text-muted)] tracking-wider uppercase font-semibold">
                      Detalle de Facturación
                    </span>
                  </div>
                </div>

                {/* Billing Breakdown */}
                <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-secondary)]/30 p-4 sm:p-5 text-sm space-y-3">
                  <div className="flex justify-between items-center text-[var(--text-secondary)]">
                    <span>Servicios del Grupo</span>
                    <span className="font-semibold text-[var(--text-primary)]">S/ {totalServicesAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--text-secondary)]">
                    <span>IGV (18% incluido)</span>
                    <span className="font-mono text-xs text-[var(--text-muted)]">S/ {(totalServicesAmount * 0.18 / 1.18).toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t border-[var(--border)] pt-4 flex justify-between items-baseline">
                    <span className="font-bold text-base text-[var(--text-primary)] font-display" style={{ fontFamily: "var(--font-playfair), serif" }}>
                      Total Neto a Pagar
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-2xl text-[var(--accent)] tracking-tight">
                        S/ {totalServicesAmount.toFixed(2)}
                      </span>
                      <p className="text-[10px] text-[var(--text-muted)] font-medium">Moneda Nacional (PEN)</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-[var(--text-muted)]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                    Notas o Requerimientos Especiales (opcional)
                  </label>
                  <textarea
                    placeholder="Ej. Tengo alergias a algún producto, prefiero un corte específico, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-dark !h-24 resize-none text-sm transition-all focus:border-[var(--accent)] hover:border-[var(--border-strong)]"
                  />
                </div>
              </section>

              {/* Right Column: Premium Payment Form */}
              <section className="glass-card p-6 sm:p-8 space-y-6 flex flex-col justify-between lg:col-span-5">
                <div className="space-y-4">
                  <div className="border-b border-[var(--border)] pb-3">
                    <h2 className="text-lg font-bold font-display" style={{ fontFamily: "var(--font-playfair), serif" }}>
                      Métodos de Pago
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">Elige tu forma de pago preferida</p>
                  </div>

                  {/* Tabs Selector with Icons */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* QR Tab */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("qr")}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all duration-300 cursor-pointer ${
                        paymentMethod === "qr"
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_12px_rgba(212,168,67,0.15)]"
                          : "border-[var(--border-strong)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75ZM13.5 16.5h.75v.75h-.75v-.75ZM16.5 13.5h.75v.75h-.75v-.75ZM18 15h.75v.75H18V15ZM15 15h.75v.75H15V15ZM13.5 15h.75v.75h-.75V15ZM15 18h.75v.75H15V18ZM18 18h.75v.75H18V18ZM19.5 18h.75v.75h-.75V18ZM19.5 15h.75v.75h-.75V15ZM19.5 13.5h.75v.75h-.75v-.75Z" />
                      </svg>
                      <span className="text-[10px] sm:text-xs">QR Digital</span>
                    </button>

                    {/* Cash Tab */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all duration-300 cursor-pointer ${
                        paymentMethod === "cash"
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_12px_rgba(212,168,67,0.15)]"
                          : "border-[var(--border-strong)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5M3.75 20.25h16.5M3 7.5h18M3 16.5h18m-18-9v9m18-9v9M5.25 5.25h13.5m-13.5 13.5h13.5" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
                      </svg>
                      <span className="text-[10px] sm:text-xs">Efectivo</span>
                    </button>

                    {/* Card Tab */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all duration-300 cursor-pointer ${
                        paymentMethod === "card"
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_12px_rgba(212,168,67,0.15)]"
                          : "border-[var(--border-strong)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-19.5 5.25h19.5m-19.5 0h19.5M2.25 12h19.5m-19.5 0h19.5M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                      </svg>
                      <span className="text-[10px] sm:text-xs">Tarjeta</span>
                    </button>
                  </div>

                  {/* QR Method Detail */}
                  {paymentMethod === "qr" && (
                    <div className="space-y-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-secondary)]/30 p-5 animate-fade-in">
                      <div className="text-center">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Escanea el código QR Oficial</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Compatible con Yape, Plin y Banca Móvil</p>
                      </div>
                      
                      <div className="flex justify-center py-2">
                        <div className="relative p-3 bg-white rounded-2xl border-4 border-[var(--accent)] shadow-2xl flex items-center justify-center group overflow-hidden">
                          <img
                            src="/qr-yape-jefferson.png"
                            alt="QR Yape - Angel Jefferson Gonzalez Chaca"
                            className="h-36 w-36 rounded transition-all duration-300 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.src = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=FiloEstilo-QR-Test";
                            }}
                          />
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="space-y-2.5 border-t border-[var(--border)] pt-4 text-[11px] text-[var(--text-secondary)]">
                        <div className="flex gap-2">
                          <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] font-bold shrink-0">1</span>
                          <p>Escanea el QR y transfiere el monto exacto: <strong className="text-[var(--accent)]">S/ {totalServicesAmount.toFixed(2)}</strong></p>
                        </div>
                        <div className="flex gap-2">
                          <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] font-bold shrink-0">2</span>
                          <p>Verifica que figure la razón social **Filo & Estilo S.A.C.**</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] font-bold shrink-0">3</span>
                          <p>Completa el registro presionando el botón &quot;Confirmar y Registrar Cita&quot;. Validaremos tu transacción en sede.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cash Method Detail */}
                  {paymentMethod === "cash" && (
                    <div className="space-y-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 animate-fade-in text-sm text-[var(--text-secondary)]">
                      <div className="flex gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.745 3.745 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-[var(--text-primary)]">Pago Físico en Establecimiento</h4>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">Reserva 100% segura y garantizada</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-xs text-[var(--text-secondary)] border-t border-[var(--border)] pt-4">
                        <p>
                          Tu cita se guardará de inmediato. Podrás efectuar el pago completo de su monto de **S/ {totalServicesAmount.toFixed(2)}** en efectivo, tarjeta de débito/crédito o transferencia al culminar tu atención.
                        </p>
                        <p className="font-medium text-[var(--accent)]">
                          Nota: Te solicitamos llegar al menos 10 minutos antes de tu cita programada.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Card Method Detail with interactive Card Mockup */}
                  {paymentMethod === "card" && (
                    <div className="space-y-5 animate-fade-in">
                      {/* CSS Interactive Metallic Virtual Credit Card */}
                      <div 
                        className={`w-full max-w-[310px] mx-auto h-[180px] rounded-2xl relative shadow-2xl overflow-hidden p-5 flex flex-col justify-between transition-all duration-500 transform hover:scale-[1.03] border bg-gradient-to-br from-[#1d1e26] via-[#13141a] to-[#0a0a0f] ${
                          focusedField === "cvv" ? "border-red-400/30" : "border-amber-500/25"
                        }`}
                      >
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none rounded-2xl shimmer-card"></div>
                        
                        {/* Card Header */}
                        <div className="flex justify-between items-start z-10">
                          <div className="text-left">
                            <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest font-display" style={{ fontFamily: "var(--font-playfair), serif" }}>
                              Filo Estilo
                            </p>
                            <p className="text-[7px] text-[var(--text-muted)] tracking-wider uppercase font-mono">Barbería Premium</p>
                          </div>
                          {/* Secure Card Shield Symbol */}
                          <div className="text-[var(--accent)] font-semibold flex items-center gap-1">
                            <span className="text-[8px] uppercase tracking-wider font-mono opacity-80">VIP</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M12.516 2.185a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.97a.75.75 0 0 0-.722-.515 11.24 11.24 0 0 1-7.877-3.08Z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>

                        {/* Card Chip & Wi-Fi */}
                        <div className="flex justify-between items-center z-10">
                          {/* Electronic Chip */}
                          <div className="w-9 h-7 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 rounded-md opacity-85 shadow-md flex flex-col justify-around p-1">
                            <div className="border-b border-black/10 w-full h-px"></div>
                            <div className="border-b border-black/10 w-full h-px"></div>
                            <div className="border-b border-black/10 w-full h-px"></div>
                          </div>
                          {/* Wi-Fi contactless wave */}
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white/50 rotate-90">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.375 9a3.75 3.75 0 1 1 0 7.5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.625 5.625a8.75 8.75 0 1 1 0 12.75" />
                          </svg>
                        </div>

                        {/* Card Number display */}
                        <div className="text-center z-10">
                          <p className="text-sm font-mono tracking-widest text-stone-100 font-semibold drop-shadow-md">
                            {cardNumber || "•••• •••• •••• ••••"}
                          </p>
                        </div>

                        {/* Card Footer details */}
                        <div className="flex justify-between items-end z-10">
                          <div className="text-left max-w-[70%]">
                            <p className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-mono">Titular de Tarjeta</p>
                            <p className="text-[10px] font-mono tracking-wider text-stone-200 font-semibold truncate uppercase">
                              {cardHolder || "NOMBRE COMPLETO"}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-mono">Expiración</p>
                            <p className="text-[10px] font-mono text-stone-200 font-semibold">{cardExpiry || "MM/AA"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-mono">CVV</p>
                            <p className={`text-[10px] font-mono text-stone-200 font-semibold bg-black/30 px-1.5 py-0.5 rounded border ${focusedField === "cvv" ? "border-red-400 bg-red-950/20 text-red-300" : "border-transparent"}`}>
                              {cardCvv || "•••"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card Input Fields Form */}
                      <div className="space-y-3.5 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-secondary)]/30 p-4 sm:p-5">
                        {/* Card Number Input */}
                        <div className="input-icon-wrap with-left-icon">
                          <input
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            onFocus={() => setFocusedField("number")}
                            onBlur={() => setFocusedField(null)}
                            placeholder="Número de Tarjeta (16 dígitos)"
                            className="input-dark text-sm"
                            maxLength={19}
                          />
                          <div className="input-icon-left">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-19.5 5.25h19.5m-19.5 0h19.5M2.25 12h19.5m-19.5 0h19.5M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                            </svg>
                          </div>
                        </div>

                        {/* Cardholder Input */}
                        <div className="input-icon-wrap with-left-icon">
                          <input
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                            onFocus={() => setFocusedField("holder")}
                            onBlur={() => setFocusedField(null)}
                            placeholder="Nombre del Titular (en Tarjeta)"
                            className="input-dark text-sm"
                          />
                          <div className="input-icon-left">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                            </svg>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          {/* Card Expiry */}
                          <div className="input-icon-wrap with-left-icon">
                            <input
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                              onFocus={() => setFocusedField("expiry")}
                              onBlur={() => setFocusedField(null)}
                              placeholder="MM/AA"
                              className="input-dark text-sm"
                              maxLength={5}
                            />
                            <div className="input-icon-left">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75" />
                              </svg>
                            </div>
                          </div>

                          {/* Card CVV */}
                          <div className="input-icon-wrap with-left-icon">
                            <input
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                              onFocus={() => setFocusedField("cvv")}
                              onBlur={() => setFocusedField(null)}
                              placeholder="CVV"
                              className="input-dark text-sm"
                              maxLength={3}
                            />
                            <div className="input-icon-left">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0V10.5m-2.25 0h13.5c.621 0 1.125.504 1.125 1.125v7.497c0 .621-.504 1.125-1.125 1.125H5.25a1.125 1.125 0 0 1-1.125-1.125v-7.497c0-.621.504-1.125 1.125-1.125Z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 bg-black/10 px-2.5 py-1.5 rounded-lg border border-[var(--border)]">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-emerald-400 shrink-0">
                            <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm3 4.25a.75.75 0 0 0-1.06-.02L7 8.67 6.06 7.73a.75.75 0 0 0-1.06 1.06l1.5 1.5a.75.75 0 0 0 1.08-.02l3.5-3.75a.75.75 0 0 0-.08-1.07Z" clipRule="evenodd" />
                          </svg>
                          Conexión segura SSL. Encriptación de datos de extremo a extremo.
                        </p>
                      </div>

                      
                    </div>
                  )}
                 

                  {error && (
                    <div className="alert-error animate-fade-in text-xs py-2 px-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 text-red-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                      </svg>
                      {error}
                    </div>
                  )}
                </div>

                <div className="space-y-3 mt-6 border-t border-[var(--border)] pt-5">
                  <button
                    type="submit"
                    disabled={loading || selectedSlots.length !== people || normalizedServiceIds.length !== people}
                    className="btn-gold w-full !py-3.5 disabled:opacity-40 disabled:cursor-not-allowed text-sm uppercase tracking-wider font-bold shadow-lg transition-all duration-300 hover:shadow-xl active:scale-[0.99] cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        {/* Elegant spinner */}
                        <svg className="animate-spin h-4.5 w-4.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Procesando Reserva...
                      </span>
                    ) : (
                      "Confirmar y Registrar Cita"
                    )}
                  </button>
                  <p className="text-[10px] text-[var(--text-muted)] text-center italic">
                    Se registrara en Supabase con estado inicial pending. El pago es simulado y usa una validacion ficticia interna.
                  </p>
                </div>
              </section>
            </form>
          )}
        </div>
      </main>

      {validationModalMessage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setValidationModalMessage(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--accent-border)] bg-[var(--bg-surface)] p-6 text-center animate-fade-in">
            <h3 className="text-lg font-bold text-[var(--accent)]">Faltan datos para continuar</h3>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">{validationModalMessage}</p>
            <button type="button" onClick={() => setValidationModalMessage(null)} className="btn-gold mt-5 animate-float">
              Entendido
            </button>
          </div>
        </div>
      )}

      {showAuthModal && !isAuthenticated && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-8 text-center animate-fade-in" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-strong)" }}>
            <h3 className="text-xl font-bold" style={{ fontFamily: "var(--font-playfair), serif" }}>Inicia sesion para reservar</h3>
            <div className="mt-6 space-y-3">
              <Link href="/login" className="btn-gold w-full !py-3">Iniciar sesion</Link>
              <Link href="/register" className="btn-outline w-full !py-3">Crear Cuenta</Link>
            </div>
          </div>
        </div>
      )}

      {serviceSelectionModalIdx !== null && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setServiceSelectionModalIdx(null)} />
          
          {/* Container */}
          <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--accent-border)] bg-[var(--bg-surface)] shadow-[0_10px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh] animate-fade-in-up">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-strong)] flex justify-between items-center bg-[var(--bg-secondary)]/50 shrink-0">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-semibold bg-[var(--accent-soft)] px-2.5 py-1 rounded-full border border-[var(--accent-border)]">
                  Catálogo de Cortes y Servicios
                </span>
                <h3 className="text-base font-bold text-[var(--text-primary)] mt-2 font-display">
                  Seleccionar Servicio para {serviceSelectionModalIdx === 0 ? "Tú (Cliente Principal)" : `Acompañante ${serviceSelectionModalIdx + 1}`}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setServiceSelectionModalIdx(null)}
                className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-border)] flex items-center justify-center transition-all cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Scrollable grid */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 custom-scrollbar flex-1 bg-[var(--bg-primary)]/10">
              <p className="text-xs text-[var(--text-secondary)]">Haz clic en el corte o servicio que deseas asignar:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((s, idx) => {
                  const isSelected = selectedServiceIds[serviceSelectionModalIdx] === s.id;
                  const serviceImage = getServiceImage(s.name, idx);
                  
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        updateServiceSelection(serviceSelectionModalIdx, s.id);
                        setServiceSelectionModalIdx(null);
                      }}
                      className={`text-left rounded-xl border p-3 transition-all duration-300 overflow-hidden flex gap-4 items-center relative cursor-pointer group ${
                        isSelected 
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_15px_rgba(212,168,67,0.12)] ring-1 ring-[var(--accent)]" 
                          : "border-[var(--border-strong)] bg-[var(--bg-secondary)]/50 hover:border-[var(--accent-border)] hover:bg-[var(--bg-surface-hover)]"
                      }`}
                    >
                      {/* Image Container with Hover zoom */}
                      <div className="w-24 h-20 sm:w-28 sm:h-22 rounded-lg overflow-hidden shrink-0 border border-[var(--border-strong)] relative">
                        <img 
                          src={serviceImage} 
                          alt={s.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[var(--accent)]/15 backdrop-blur-[1px] flex items-center justify-center animate-fade-in">
                            <span className="bg-[var(--accent)] text-[var(--bg-primary)] p-1 rounded-full text-[10px] font-bold">✓</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Info details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                            {s.name}
                          </span>
                          <span className="text-sm font-bold text-[var(--accent)] font-mono shrink-0">
                            S/ {s.price}
                          </span>
                        </div>
                        
                        {/* Duration Badge */}
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-medium">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-[var(--accent)]">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                          {s.duration_minutes} min
                        </div>

                        {s.description && (
                          <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-1 leading-relaxed">
                            {s.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-strong)] bg-[var(--bg-secondary)]/30 text-center shrink-0">
              <p className="text-[10px] text-[var(--text-muted)] italic">
                Sabor premium y atención personalizada de Filo Estilo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de progreso de reserva premium */}
      {bookingStatus !== "idle" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-fade-in bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b10]/95 p-8 text-center shadow-[0_0_60px_-15px_rgba(212,168,67,0.3)] backdrop-blur-2xl animate-scale-up">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent rounded-t-2xl" />
            
            {bookingStatus === "loading" && (
              <div className="space-y-6 py-4">
                {/* Gold luxury spinner */}
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-[var(--accent)]/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-[var(--accent)] animate-spin" />
                  <div className="h-10 w-10 rounded-full bg-[var(--accent-soft)]/20 border border-[var(--accent-border)]/30 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-[var(--accent)] animate-pulse">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-playfair), serif" }}>
                    Procesando Reserva
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                    Por favor espera un momento mientras registramos tu espacio exclusivo en Filo Estilo.
                  </p>
                </div>

                {/* Sub status details for group bookings */}
                {selectedSlots.length > 1 && (
                  <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-[11px] text-[var(--accent)] font-medium inline-flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
                    </span>
                    Procesando cita {currentBookingIndex + 1} de {selectedSlots.length}...
                  </div>
                )}
              </div>
            )}

            {bookingStatus === "success" && (
              <div className="space-y-6 py-4 animate-scale-up">
                {/* Gorgeous Green/Gold Success Checkmark */}
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] relative">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10 text-emerald-400 animate-scale-up">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-playfair), serif" }}>
                    ¡Reserva Confirmada!
                  </h3>
                  <p className="text-xs text-emerald-100/70 leading-relaxed max-w-xs mx-auto">
                    Tus citas se han programado con éxito. Redirigiendo a tu historial de citas...
                  </p>
                </div>
              </div>
            )}

            {bookingStatus === "error" && (
              <div className="space-y-6 py-4 animate-scale-up">
                {/* Red/Gold Error Icon */}
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] relative">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 text-red-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-playfair), serif" }}>
                    Error al Reservar
                  </h3>
                  <p className="text-xs text-red-400/80 leading-relaxed max-w-xs mx-auto">
                    {bookingErrorMsg || "No se pudieron programar tus citas. Por favor inténtalo de nuevo."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setBookingStatus("idle")}
                  className="btn-gold !py-2.5 px-6 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function ReservarPage() {
  return (
    <>
      <Navbar />
      <Suspense
        fallback={
          <main className="flex-1 pt-28 pb-20">
            <div className="mx-auto max-w-5xl px-6">
              <div className="glass-card p-6">Cargando reservación...</div>
            </div>
          </main>
        }
      >
        <ReservarPageContent />
      </Suspense>
      <Footer />
    </>
  );
}
