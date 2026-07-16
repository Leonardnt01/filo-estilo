"use client";

import Image from "next/image";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/components/auth-session-provider";
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
type PayMethod = "yape" | "card";
type FooterSettings = {
  brand_name?: string;
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
};
type BranchContact = {
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

type BookingDraft = {
  stage: Stage;
  branchId: string;
  serviceId: string;
  barberId: string;
  date: string;
  selectedSlots: string[];
  selectedServiceIds: string[];
  notes: string;
  people: number;
  paymentMethod: PayMethod;
  calendarMonthIso: string | null;
};

type CulqiToken = {
  id: string;
  card_number?: string;
  last_four?: string;
  number_phone?: string;
  phone_number?: string;
  metadata?: Record<string, unknown> | null;
  source?: Record<string, unknown> | null;
  [key: string]: unknown;
};
type CulqiCheckoutError = { user_message?: string; merchant_message?: string };
type CulqiCheckoutInstance = {
  open: () => void;
  close: () => void;
  token?: CulqiToken;
  error?: CulqiCheckoutError;
  culqi?: () => void | Promise<void>;
};

declare global {
  interface Window {
    CulqiCheckout?: new (publicKey: string, config: Record<string, unknown>) => CulqiCheckoutInstance;
    __filoCulqiCheckoutPromise?: Promise<void>;
  }
}

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

const BOOKING_DRAFT_STORAGE_KEY = "filo-estilo.booking-draft";

function loadCulqiCheckoutScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Culqi checkout is only available in the browser"));
  }

  if (window.CulqiCheckout) {
    return Promise.resolve();
  }

  if (window.__filoCulqiCheckoutPromise) {
    return window.__filoCulqiCheckoutPromise;
  }

  window.__filoCulqiCheckoutPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://js.culqi.com/checkout-js"]');
    if (existingScript) {
      if (window.CulqiCheckout) {
        resolve();
        return;
      }
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("No se pudo cargar Culqi Checkout")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.culqi.com/checkout-js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Culqi Checkout"));
    document.body.appendChild(script);
  });

  return window.__filoCulqiCheckoutPromise;
}

function getTokenStringValue(token: CulqiToken, keys: string[]) {
  for (const key of keys) {
    const value = token[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const metadata = token.metadata;
  if (metadata && typeof metadata === "object") {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  const source = token.source;
  if (source && typeof source === "object") {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
}

function getCulqiPaymentDetails(token: CulqiToken, method: PayMethod) {
  return {
    phone:
      method === "yape"
        ? getTokenStringValue(token, ["number_phone", "phone_number", "phone"])
        : null,
    card_last4:
      method === "card"
        ? getTokenStringValue(token, ["last_four", "card_last4", "card_number"])
            ?.replace(/\s+/g, "")
            .slice(-4) ?? null
        : null,
  };
}

function ReservarPageContent({
  initialBranches,
  initialServices,
  initialBarbers,
}: {
  initialBranches: Branch[];
  initialServices: Service[];
  initialBarbers: Barber[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuthSession();

  const [stage, setStage] = useState<Stage>("branch");
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

  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("yape");

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

  // Estados de progreso de confirmación animada
  const [bookingStatus, setBookingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bookingErrorMsg, setBookingErrorMsg] = useState<string | null>(null);
  const [currentBookingIndex, setCurrentBookingIndex] = useState(0);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [requestedServiceId, setRequestedServiceId] = useState("");
  const [bookingDraftHydrated, setBookingDraftHydrated] = useState(false);
  const [restoredBookingDraft, setRestoredBookingDraft] = useState(false);

  const authEmail = user?.email ?? "";
  const isAuthenticated = !!user;

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

  const branchById = useMemo(
    () => new Map(initialBranches.map((branch) => [branch.id, branch])),
    [initialBranches],
  );

  const servicesByBranchId = useMemo(() => {
    const map = new Map<string, Service[]>();

    for (const service of initialServices) {
      if (!service.branch_id) continue;
      const branchServices = map.get(service.branch_id);
      if (branchServices) {
        branchServices.push(service);
      } else {
        map.set(service.branch_id, [service]);
      }
    }

    return map;
  }, [initialServices]);

  const barbersByBranchId = useMemo(() => {
    const map = new Map<string, Barber[]>();

    for (const barber of initialBarbers) {
      if (!barber.branch_id) continue;
      const branchBarbers = map.get(barber.branch_id);
      if (branchBarbers) {
        branchBarbers.push(barber);
      } else {
        map.set(barber.branch_id, [barber]);
      }
    }

    return map;
  }, [initialBarbers]);

  const serviceById = useMemo(
    () => new Map(initialServices.map((service) => [service.id, service])),
    [initialServices],
  );

  const serviceImagesById = useMemo(
    () => new Map(initialServices.map((service, idx) => [service.id, getServiceImage(service.name, idx)])),
    [initialServices],
  );

  const services = useMemo(
    () => servicesByBranchId.get(branchId) ?? [],
    [servicesByBranchId, branchId],
  );
  const barbers = useMemo(
    () => barbersByBranchId.get(branchId) ?? [],
    [barbersByBranchId, branchId],
  );
  const branchServiceIds = useMemo(
    () => new Set(services.map((service) => service.id)),
    [services],
  );

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
    if (typeof window === "undefined") return;

    const timer = window.setTimeout(() => {
      try {
        const rawDraft = window.sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
        if (!rawDraft) {
          setBookingDraftHydrated(true);
          return;
        }

        const parsed = JSON.parse(rawDraft) as Partial<BookingDraft>;
        const nextStage = parsed.stage;
        const nextPaymentMethod = parsed.paymentMethod;
        const nextCalendarMonthIso = parsed.calendarMonthIso;

        if (parsed.branchId) setBranchId(parsed.branchId);
        if (parsed.serviceId) setServiceId(parsed.serviceId);
        if (parsed.barberId) setBarberId(parsed.barberId);
        if (parsed.date) setDate(parsed.date);
        if (Array.isArray(parsed.selectedSlots)) {
          setSelectedSlots(parsed.selectedSlots.filter((slot): slot is string => typeof slot === "string"));
        }
        if (Array.isArray(parsed.selectedServiceIds)) {
          setSelectedServiceIds(parsed.selectedServiceIds.filter((service): service is string => typeof service === "string"));
        }
        if (typeof parsed.notes === "string") setNotes(parsed.notes);
        if (typeof parsed.people === "number" && parsed.people > 0) setPeople(parsed.people);
        if (nextPaymentMethod === "yape" || nextPaymentMethod === "card") setPaymentMethod(nextPaymentMethod);
        if (nextStage === "branch" || nextStage === "booking" || nextStage === "payment") setStage(nextStage);
        if (typeof nextCalendarMonthIso === "string") {
          const parsedMonth = new Date(nextCalendarMonthIso);
          if (!Number.isNaN(parsedMonth.getTime())) {
            setCalendarMonth(new Date(parsedMonth.getFullYear(), parsedMonth.getMonth(), 1));
          }
        }

        setRestoredBookingDraft(true);
      } catch {
        window.sessionStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
      } finally {
        setBookingDraftHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!bookingDraftHydrated) return;

    if (restoredBookingDraft) {
      return;
    }

    function syncInitialCatalogState() {
      const requestedService = searchParams.get("service_id");
      const requestedBranch = searchParams.get("branch_id");

      if (requestedService && serviceById.has(requestedService)) {
        setRequestedServiceId(requestedService);
        setServiceId(requestedService);
        const serviceBranch = serviceById.get(requestedService)?.branch_id;
        if (serviceBranch) setBranchId(serviceBranch);
      }

      if (requestedBranch && branchById.has(requestedBranch)) {
        setBranchId(requestedBranch);
      } else if (!requestedService && initialBranches[0]?.id) {
        setBranchId(initialBranches[0].id);
      }
    }

    syncInitialCatalogState();
  }, [bookingDraftHydrated, restoredBookingDraft, branchById, initialBranches, searchParams, serviceById]);

  useEffect(() => {
    if (!bookingDraftHydrated || typeof window === "undefined" || bookingStatus === "success") {
      return;
    }

    const draft: BookingDraft = {
      stage,
      branchId,
      serviceId,
      barberId,
      date,
      selectedSlots,
      selectedServiceIds,
      notes,
      people,
      paymentMethod,
      calendarMonthIso: calendarMonth.toISOString(),
    };

    window.sessionStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [
    bookingDraftHydrated,
    bookingStatus,
    stage,
    branchId,
    serviceId,
    barberId,
    date,
    selectedSlots,
    selectedServiceIds,
    notes,
    people,
    paymentMethod,
    calendarMonth,
  ]);

  useEffect(() => {
    if (!branchId) return;
    if (!branchServiceIds.has(serviceId)) {
      if (requestedServiceId && branchServiceIds.has(requestedServiceId)) {
        setTimeout(() => setServiceId(requestedServiceId), 0);
        return;
      }
      const nextServiceId = services[0]?.id ?? "";
      setTimeout(() => setServiceId(nextServiceId), 0);
    }
    const syncTimer = setTimeout(() => {
      setBarberId((prev) => (barbers.some((b) => b.id === prev) ? prev : (barbers[0]?.id ?? "")));
      setSlots([]);
    }, 0);

    return () => clearTimeout(syncTimer);
  }, [barbers, branchId, branchServiceIds, requestedServiceId, serviceId, services]);

  useEffect(() => {
    if (!branchId || !serviceId || !branchServiceIds.has(serviceId)) return;

    const syncTimer = setTimeout(() => {
      setSelectedServiceIds((prev) => {
        const next = [...prev].filter((id) => branchServiceIds.has(id));
        const fallbackServiceId = serviceId || services[0]?.id || "";

        while (next.length < people) {
          next.push(fallbackServiceId);
        }

        if (next.length > people) {
          next.length = people;
        }

        if (next.length === prev.length && next.every((value, index) => value === prev[index])) {
          return prev;
        }

        return next;
      });
    }, 0);

    return () => clearTimeout(syncTimer);
  }, [branchId, branchServiceIds, people, serviceId, services]);

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
  const selectedBranch = useMemo(() => branchById.get(branchId) ?? null, [branchById, branchId]);
  const normalizedServiceIds = useMemo(
    () => selectedServiceIds.filter((id) => branchServiceIds.has(id)).slice(0, people),
    [branchServiceIds, selectedServiceIds, people],
  );
  const selectedServices = useMemo(
    () => normalizedServiceIds.map((id) => serviceById.get(id)).filter((s): s is Service => !!s),
    [normalizedServiceIds, serviceById],
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

  const submitWaitlistRequest = useCallback(async () => {
    if (!branchId || !serviceId || !date) {
      toast("Selecciona sede, servicio y fecha antes de solicitar lista de espera.", "error");
      return;
    }

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setJoiningWaitlist(true);
    try {
      const preferredStartTime = selectedSlots[0] ?? null;
      const res = await fetch("/api/my/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: branchId,
          service_id: serviceId,
          barber_id: barberId || null,
          desired_date: date,
          selected_start_time: preferredStartTime,
          notes: notes?.trim() || null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(json.error ?? "No se pudo crear la solicitud en lista de espera.", "error");
        return;
      }

      toast("Te uniste a la lista de espera. Te avisaremos si se libera un cupo.");
    } finally {
      setJoiningWaitlist(false);
    }
  }, [barberId, branchId, date, isAuthenticated, notes, selectedSlots, serviceId, toast]);

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

  function resetSelectedAvailability() {
    setSelectedSlots([]);
    setSlots([]);
  }

  async function finalizeCulqiBooking(
    tokenId: string,
    paymentDetails?: { phone: string | null; card_last4: string | null },
  ) {
    setLoading(true);
    setError(null);
    setBookingStatus("loading");
    setBookingErrorMsg(null);
    setCurrentBookingIndex(0);

    try {
      console.log("[CULQI][CLIENT] finalizeCulqiBooking payload", {
        tokenId,
        paymentMethod,
        branchId,
        barberId,
        appointmentDate: date,
        selectedSlots,
        normalizedServiceIds,
        paymentDetails,
      });

      const res = await fetch("/api/payments/culqi/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_id: tokenId,
          payment_method: paymentMethod,
          payment_details: paymentDetails ?? null,
          branch_id: branchId,
          barber_id: barberId,
          appointment_date: date,
          selections: selectedSlots.map((slot, index) => ({
            service_id: normalizedServiceIds[index] ?? serviceId,
            start_time: slot,
          })),
          notes,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.error("[CULQI][CLIENT] finalizeCulqiBooking error response", {
          status: res.status,
          body: json,
        });
        throw new Error(json.error ?? "No se pudo procesar el pago con Culqi");
      }

      const successJson = await res.json().catch(() => ({}));
      console.log("[CULQI][CLIENT] finalizeCulqiBooking success response", successJson);

      setBookingStatus("success");
      toast(`¡Excelente! Se registraron con éxito tus ${selectedSlots.length} citas.`);
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
        }
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

  async function openCulqiCheckout() {
    const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;

    if (!publicKey) {
      throw new Error("Falta configurar NEXT_PUBLIC_CULQI_PUBLIC_KEY");
    }

    if (!authEmail) {
      throw new Error("No se encontró el correo del usuario autenticado para iniciar Culqi");
    }

    await loadCulqiCheckoutScript();

    if (!window.CulqiCheckout) {
      throw new Error("Culqi Checkout no está disponible");
    }

    const paymentMethods = {
      tarjeta: paymentMethod === "card",
      yape: paymentMethod === "yape",
      billetera: false,
      bancaMovil: false,
      agente: false,
      cuotealo: false,
    };

    const settings: Record<string, unknown> = {
      title: "Filo Estilo",
      currency: "PEN",
      amount: Math.round(totalServicesAmount * 100),
    };

    if (process.env.NEXT_PUBLIC_CULQI_RSA_ID && process.env.NEXT_PUBLIC_CULQI_RSA_PUBLIC_KEY) {
      settings.xculqirsaid = process.env.NEXT_PUBLIC_CULQI_RSA_ID;
      settings.rsapublickey = process.env.NEXT_PUBLIC_CULQI_RSA_PUBLIC_KEY;
    }

    const culqi = new window.CulqiCheckout(publicKey, {
      settings,
      client: {
        email: authEmail,
      },
      options: {
        lang: "es",
        modal: true,
        installments: false,
        paymentMethods,
        paymentMethodsSort: Object.entries(paymentMethods)
          .filter(([, enabled]) => enabled)
          .map(([key]) => key),
      },
    });

    culqi.culqi = () => {
      if (culqi.token?.id) {
        culqi.close();
        void finalizeCulqiBooking(culqi.token.id, getCulqiPaymentDetails(culqi.token, paymentMethod));
        return;
      }

      const message =
        culqi.error?.user_message ??
        culqi.error?.merchant_message ??
        "No se pudo generar el token de pago en Culqi";
      setError(message);
      toast(message, "error");
    };

    culqi.open();
  }

  async function validateSelectedSlotsAvailability() {
    const selections = selectedSlots.map((slot, index) => ({
      slot,
      serviceId: normalizedServiceIds[index] ?? serviceId,
    }));

    const availabilityResults = await Promise.all(
      selections.map(async ({ slot, serviceId: currentServiceId }) => {
        const res = await fetch("/api/booking/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branch_id: branchId,
            service_id: currentServiceId,
            barber_id: barberId,
            appointment_date: date,
          }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json.error ?? "No se pudo validar la disponibilidad actual");
        }

        const availableSlots = Array.isArray(json.slots) ? (json.slots as unknown[]) : [];
        const availableStartTimes = availableSlots
          .map((item: unknown) =>
            item && typeof item === "object" && "start_time" in item && typeof item.start_time === "string"
              ? item.start_time
              : null,
          )
          .filter((value): value is string => !!value);

        return {
          slot,
          serviceId: currentServiceId,
          isAvailable: availableStartTimes.includes(slot),
          availableSlots,
        };
      }),
    );

    const unavailableSelections = availabilityResults.filter((result) => !result.isAvailable);

    if (unavailableSelections.length === 0) {
      return true;
    }

    console.warn("[BOOKING] selected slots became unavailable before checkout", {
      branchId,
      barberId,
      appointmentDate: date,
      unavailableSelections,
    });

    const stillAvailableSlots = new Set(
      availabilityResults.filter((result) => result.isAvailable).map((result) => result.slot),
    );

    setSelectedSlots((prev) => prev.filter((slot) => stillAvailableSlots.has(slot)));
    setStage("booking");
    void loadSlots();

    throw new Error("Uno de los horarios seleccionados ya fue tomado. Te mostramos nuevamente los horarios libres.");
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

    try {
      await validateSelectedSlotsAvailability();
      await openCulqiCheckout();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo iniciar Culqi Checkout";
      setError(message);
      toast(message, "error");
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
                {initialBranches.map((b) => {
                  const branchServices = (servicesByBranchId.get(b.id) ?? []).slice(0, 4);
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
                      onClick={() => {
                        if (branchId !== b.id) {
                          resetSelectedAvailability();
                        }
                        setBranchId(b.id);
                      }}
                      className={`text-left rounded-xl border overflow-hidden transition-all ${isActive ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--accent-border)]"}`}
                    >
                      <div className="relative h-32 w-full">
                        <Image src={branchImage} alt={b.name} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
                      </div>
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
                        onClick={() => {
                          if (serviceId !== s.id) {
                            resetSelectedAvailability();
                          }
                          setServiceId(s.id);
                        }}
                        className={`text-left rounded-xl border p-3 transition-all duration-300 overflow-hidden flex gap-4 items-center relative cursor-pointer group ${
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_15px_rgba(212,168,67,0.12)] ring-1 ring-[var(--accent)]"
                            : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-surface-hover)]"
                        }`}
                      >
                        {/* Image Container with Hover zoom */}
                        <div className="w-24 h-20 sm:w-28 sm:h-22 rounded-lg overflow-hidden shrink-0 border border-[var(--border-strong)] relative">
                          {/* eslint-disable-next-line @next/next/no-img-element -- catalog images may be user-uploaded URLs from unconfigured hosts; <img> avoids next/image host allowlist failures */}
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
                      onClick={() => {
                        if (barberId !== b.id) {
                          resetSelectedAvailability();
                        }
                        setBarberId(b.id);
                      }}
                      className={`group flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all ${isActive ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--accent-border)]"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- catalog images may be user-uploaded URLs from unconfigured hosts; <img> avoids next/image host allowlist failures */}
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
                        onClick={() => {
                          if (date !== cell.iso) {
                            resetSelectedAvailability();
                          }
                          setDate(cell.iso);
                        }}
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
                          <div className="flex flex-wrap justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => void submitWaitlistRequest()}
                              disabled={joiningWaitlist}
                              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-[var(--bg-primary)] transition-all shadow-md active:scale-95 disabled:opacity-60"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6.75h-9A2.25 2.25 0 005.25 9v8.25A2.25 2.25 0 007.5 19.5h9a2.25 2.25 0 002.25-2.25V9a2.25 2.25 0 00-2.25-2.25z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 3h4M8.25 4.5h7.5" />
                              </svg>
                              {joiningWaitlist ? "Enviando..." : "Unirme a lista de espera"}
                            </button>
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M12 .007c-6.617 0-12 5.391-12 12 0 2.115.549 4.16 1.595 5.977l-1.595 5.83 5.951-1.564c1.752.959 3.737 1.464 5.753 1.464h.003c6.616 0 12-5.39 12-12 0-3.2-1.243-6.206-3.5-8.46-2.256-2.254-5.262-3.497-8.462-3.497zm6.393 16.947c-.27.76-1.318 1.483-2.13 1.595-.54.075-1.242.1-3.607-.879-3.023-1.252-4.969-4.323-5.12-4.524-.152-.201-1.217-1.616-1.217-3.084 0-1.469.771-2.19 1.041-2.49.27-.3.59-.375.79-.375h.563c.18 0 .42-.068.653.495.24.577.818 2.002.893 2.152.075.15.128.323.023.533-.105.21-.158.338-.315.518-.158.18-.33.405-.472.54-.158.15-.323.315-.143.623.18.3.8 1.312 1.718 2.128.172.15.344.293.51.428.878.712 1.425.6 1.83.188.248-.255.772-.893.975-1.193.203-.3.405-.255.675-.15.27.105 1.718.81 2.018.96.3.15.5.225.57.345.075.12.075.69-.195 1.45z"/>
                              </svg>
                              Coordinar por WhatsApp
                            </a>
                          </div>
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
                        const currentService = serviceById.get(serviceSelectionId);
                        
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
                                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-[var(--border-strong)] group-hover:border-[var(--accent-border)]">
                                    <Image
                                      src={serviceImagesById.get(serviceSelectionId) ?? getServiceImage(currentService?.name ?? "", idx)}
                                      alt={currentService?.name ?? "Servicio"}
                                      fill
                                      sizes="32px"
                                      className="object-cover transition-transform group-hover:scale-105"
                                    />
                                  </div>
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
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{date || "-"}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {selectedSlots.length > 0 ? selectedSlots.join(", ") : "Horario pendiente"}
                      </p>
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
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Yape Tab */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("yape")}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all duration-300 cursor-pointer ${
                        paymentMethod === "yape"
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_12px_rgba(212,168,67,0.15)]"
                          : "border-[var(--border-strong)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                      }`}
                      >
                      <Image src="/yape.svg" alt="Yape" width={18} height={18} className="h-[18px] w-[18px]" />
                      <span className="text-[10px] sm:text-xs">Yape</span>
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
                      <Image src="/visa.svg" alt="Tarjeta" width={20} height={14} className="h-[14px] w-[20px] object-contain" />
                      <span className="text-[10px] sm:text-xs">Tarjeta</span>
                    </button>
                  </div>

                  {/* Yape Method Detail */}
                  {paymentMethod === "yape" && (
                    <div className="space-y-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-secondary)]/30 p-5 animate-fade-in">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10">
                          <Image src="/yape.svg" alt="Yape" width={24} height={24} className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">Paga con Yape</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">Confirma tu pago de forma rápida, segura y sin salir del flujo de reserva.</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 border-t border-[var(--border)] pt-4 text-[11px] text-[var(--text-secondary)]">
                        <div className="flex gap-2">
                          <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] font-bold shrink-0">1</span>
                          <p>Completa la confirmación desde tu billetera y valida el pago en pocos pasos.</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] font-bold shrink-0">2</span>
                          <p>Tu operación se procesa con verificación segura para proteger tus datos y tu reserva.</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] font-bold shrink-0">3</span>
                          <p>Una vez aprobado el pago por <strong className="text-[var(--accent)]">S/ {totalServicesAmount.toFixed(2)}</strong>, tu cita quedará registrada automáticamente.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card Method Detail */}
                  {paymentMethod === "card" && (
                    <div className="space-y-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 animate-fade-in text-sm text-[var(--text-secondary)]">
                      <div className="flex gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 shrink-0">
                          <Image src="/visa.svg" alt="Tarjeta" width={24} height={16} className="h-4 w-6 object-contain" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-[var(--text-primary)]">Paga con Tarjeta</h4>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">Realiza tu pago con una experiencia ágil y protegida para confirmar tu reserva.</p>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs text-[var(--text-secondary)] border-t border-[var(--border)] pt-4">
                        <p>
                          Confirma el pago de <strong className="text-blue-300">S/ {totalServicesAmount.toFixed(2)}</strong> y asegura tu horario seleccionado al instante.
                        </p>
                        <p>
                          Tu reserva solo se registra cuando el pago es validado correctamente.
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 bg-black/10 px-2.5 py-1.5 rounded-lg border border-[var(--border)]">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-emerald-400 shrink-0">
                            <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm3 4.25a.75.75 0 0 0-1.06-.02L7 8.67 6.06 7.73a.75.75 0 0 0-1.06 1.06l1.5 1.5a.75.75 0 0 0 1.08-.02l3.5-3.75a.75.75 0 0 0-.08-1.07Z" clipRule="evenodd" />
                          </svg>
                          Pago protegido con cifrado y validación segura de la transacción.
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
                      "Pagar Ahora"
                    )}
                  </button>
                  <p className="text-[10px] text-[var(--text-muted)] text-center italic">
                    Tu reserva se confirmará automáticamente al completar el pago.
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] text-center leading-5">
                    Al continuar aceptas nuestros{" "}
                    <Link href="/terminos-condiciones" className="text-[var(--accent)] underline underline-offset-2">
                      Términos y Condiciones
                    </Link>
                    , la{" "}
                    <Link href="/politica-cambios-devoluciones" className="text-[var(--accent)] underline underline-offset-2">
                      Política de Cambios y Devoluciones
                    </Link>
                    {" "}y puedes registrar cualquier incidencia en el{" "}
                    <Link href="/libro-de-reclamaciones" className="text-[var(--accent)] underline underline-offset-2">
                      Libro de Reclamaciones
                    </Link>
                    .
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
                        <Image
                          src={serviceImage}
                          alt={s.name}
                          fill
                          sizes="(max-width: 640px) 96px, 112px"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
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

export default function ReservarPageClient({
  initialBranches,
  initialServices,
  initialBarbers,
  footerSettings,
  footerBranchContact,
}: {
  initialBranches: Branch[];
  initialServices: Service[];
  initialBarbers: Barber[];
  footerSettings: FooterSettings;
  footerBranchContact: BranchContact | null;
}) {
  return (
    <>
      <Suspense
        fallback={
          <main className="flex-1 pt-28 pb-20">
            <div className="mx-auto max-w-5xl px-6">
              <div className="glass-card p-6">Cargando reservación...</div>
            </div>
          </main>
        }
      >
        <ReservarPageContent
          initialBranches={initialBranches}
          initialServices={initialServices}
          initialBarbers={initialBarbers}
        />
      </Suspense>
      <Footer
        initialSettings={footerSettings}
        initialBranchContact={footerBranchContact}
      />
    </>
  );
}
