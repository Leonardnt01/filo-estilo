import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

let cachedRegisteredUser = null;
let cachedClientFixture = null;
let cachedAdminFixture = null;

function requiredEnv(name) {
  const value = process.env[name];
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean.length > 0 ? clean : null;
}

function resolvePath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function parseExpected(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

function randomEmail() {
  return `bdd_${Date.now()}_${Math.floor(Math.random() * 100000)}@mail.com`;
}

function formatDateOffset(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function getSupabaseAdminClientForBdd() {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  assert.ok(url && serviceRoleKey, "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para crear fixtures BDD.");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  });
}

async function ensureFixtureUser(role, options = {}) {
  const { ignoreEnv = false } = options;
  const cached = role === "admin" ? cachedAdminFixture : cachedClientFixture;
  if (cached) return cached;

  const envEmail = ignoreEnv ? null : requiredEnv(role === "admin" ? "BDD_ADMIN_EMAIL" : "BDD_CLIENT_EMAIL");
  const envPassword = ignoreEnv ? null : requiredEnv(role === "admin" ? "BDD_ADMIN_PASSWORD" : "BDD_CLIENT_PASSWORD");
  if (!ignoreEnv && envEmail && envPassword) {
    const fromEnv = { email: envEmail, password: envPassword, full_name: role === "admin" ? "Administrador BDD Configurado" : "Cliente BDD Configurado" };
    if (role === "admin") cachedAdminFixture = fromEnv;
    else cachedClientFixture = fromEnv;
    return fromEnv;
  }

  const admin = getSupabaseAdminClientForBdd();
  const randomSuffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const email = `bdd_${role}_${randomSuffix}@mail.com`;
  const password = `Bdd_${role}_123456`;

  const createRes = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: role === "admin" ? "Administrador BDD Auto" : "Cliente BDD Auto" },
  });

  assert.ok(!createRes.error && createRes.data.user, `No se pudo crear fixture ${role} BDD: ${createRes.error?.message ?? "sin detalle"}`);

  const userId = createRes.data.user.id;
  const profilePayload = {
    id: userId,
    full_name: role === "admin" ? "Administrador BDD Auto" : "Cliente BDD Auto",
    role: role === "admin" ? "admin" : "client",
  };

  const { error: profileError } = await admin.from("profiles").upsert(profilePayload, { onConflict: "id" });
  assert.ok(!profileError, `No se pudo upsert perfil fixture ${role}: ${profileError?.message ?? "sin detalle"}`);

  const fixture = {
    email,
    password,
    full_name: profilePayload.full_name,
  };

  if (role === "admin") cachedAdminFixture = fixture;
  else cachedClientFixture = fixture;

  return fixture;
}

Given("genero un cliente de prueba", function () {
  this.testUser = {
    email: randomEmail(),
    password: "Test123456",
    full_name: "Cliente BDD",
  };
});

Given("existe un cliente de prueba registrado", async function () {
  if (cachedRegisteredUser) {
    this.testUser = { ...cachedRegisteredUser };
    return;
  }

  if (!this.testUser) {
    this.testUser = {
      email: randomEmail(),
      password: "Test123456",
      full_name: "Cliente BDD",
    };
  }

  const response = await this.request("POST", "/api/auth/register", this.testUser);
  const allowed = new Set([201, 409]);
  assert.ok(
    allowed.has(response.status),
    `No se pudo garantizar usuario de prueba. Status: ${response.status}, Body: ${response.text}`,
  );
  cachedRegisteredUser = { ...this.testUser };
});

Given("existe un cliente confirmado para pruebas BDD", async function () {
  const candidate = await ensureFixtureUser("client");
  this.testUser = candidate;

  await this.request("POST", "/api/auth/login", {
    email: candidate.email,
    password: candidate.password,
  });

  if (this.lastResponse.status !== 200) {
    cachedClientFixture = null;
    this.testUser = await ensureFixtureUser("client", { ignoreEnv: true });
  }

  this.clearSession();
});

Given("existe un administrador confirmado para pruebas BDD", async function () {
  const candidate = await ensureFixtureUser("admin");
  this.testUser = candidate;

  await this.request("POST", "/api/auth/login", {
    email: candidate.email,
    password: candidate.password,
  });

  if (this.lastResponse.status !== 200) {
    cachedAdminFixture = null;
    this.testUser = await ensureFixtureUser("admin", { ignoreEnv: true });
  }

  this.clearSession();
});

Given("inicio sesion con el cliente de prueba", async function () {
  assert.ok(this.testUser, "No existe cliente de prueba en contexto");
  await this.request("POST", "/api/auth/login", {
    email: this.testUser.email,
    password: this.testUser.password,
  });
  assert.equal(
    this.lastResponse.status,
    200,
    `No se pudo iniciar sesion de prueba: ${this.lastResponse.text}`,
  );
});

Given("inicio sesion con el administrador de prueba", async function () {
  assert.ok(this.testUser, "No existe administrador de prueba en contexto");
  await this.request("POST", "/api/auth/login", {
    email: this.testUser.email,
    password: this.testUser.password,
  });
  assert.equal(
    this.lastResponse.status,
    200,
    `No se pudo iniciar sesion admin de prueba: ${this.lastResponse.text}`,
  );
});

Given("no tengo sesion autenticada", function () {
  this.clearSession();
});

When("registro el cliente de prueba", async function () {
  assert.ok(this.testUser, "No existe cliente de prueba en contexto");
  await this.request("POST", "/api/auth/register", this.testUser);
  if (this.lastResponse.status === 201 || this.lastResponse.status === 409) {
    cachedRegisteredUser = { ...this.testUser };
  }
});

When("intento registrar nuevamente el mismo cliente", async function () {
  assert.ok(this.testUser, "No existe cliente de prueba en contexto");
  await this.request("POST", "/api/auth/register", this.testUser);
});

When("inicio sesion con password incorrecta", async function () {
  assert.ok(this.testUser, "No existe cliente de prueba en contexto");
  await this.request("POST", "/api/auth/login", {
    email: this.testUser.email,
    password: `${this.testUser.password}_incorrecta`,
  });
});

When("realizo 6 intentos fallidos de inicio de sesion", async function () {
  assert.ok(this.testUser, "No existe cliente de prueba en contexto");
  for (let i = 0; i < 6; i += 1) {
    await this.request("POST", "/api/auth/login", {
      email: this.testUser.email,
      password: `${this.testUser.password}_incorrecta`,
    });
  }
});

When("cierro la sesion actual", async function () {
  await this.request("POST", "/api/auth/logout");
});

When("consulto el catalogo general", async function () {
  await this.request("GET", "/api/booking/catalog");
  this.catalog = this.lastResponse.json;
});

When("consulto el catalogo de la primera sede", async function () {
  assert.ok(this.catalog?.branches?.length, "No hay sedes para consultar catalogo filtrado");
  this.selectedBranchId = this.catalog.branches[0].id;
  await this.request("GET", `/api/booking/catalog?branch_id=${this.selectedBranchId}`);
});

When("consulto mis citas", async function () {
  await this.request("GET", "/api/my/appointments");
});

When("consulto salud administrativa", async function () {
  await this.request("GET", "/api/admin/health");
});

Given("encuentro un horario reservable", async function () {
  const catalogResponse = await this.request("GET", "/api/booking/catalog");
  assert.equal(catalogResponse.status, 200, `Catalogo no disponible: ${catalogResponse.text}`);

  const branches = catalogResponse.json?.branches ?? [];
  const services = catalogResponse.json?.services ?? [];
  const barbers = catalogResponse.json?.barbers ?? [];
  assert.ok(branches.length > 0, "No hay sedes activas para pruebas BDD");

  let found = null;
  for (const branch of branches) {
    const service = services.find((s) => s.branch_id === branch.id);
    const barber = barbers.find((b) => b.branch_id === branch.id);
    if (!service || !barber) continue;

    for (let dayOffset = 1; dayOffset <= 14; dayOffset += 1) {
      const appointmentDate = formatDateOffset(dayOffset);
      const availability = await this.request("POST", "/api/booking/availability", {
        branch_id: branch.id,
        barber_id: barber.id,
        service_id: service.id,
        appointment_date: appointmentDate,
      });
      if (availability.status !== 200) continue;
      const slots = availability.json?.slots ?? [];
      if (slots.length === 0) continue;

      found = {
        branch_id: branch.id,
        barber_id: barber.id,
        service_id: service.id,
        appointment_date: appointmentDate,
        start_time: slots[0].start_time,
        notes: "Reserva automatizada BDD",
      };
      this.reservationCandidates = slots.slice(0, 5).map((slot) => ({
        branch_id: branch.id,
        barber_id: barber.id,
        service_id: service.id,
        appointment_date: appointmentDate,
        start_time: slot.start_time,
        notes: "Reserva automatizada BDD",
      }));
      break;
    }
    if (found) break;
  }

  assert.ok(found, "No se encontro horario reservable en 14 dias para pruebas BDD");
  this.reservationPayload = found;
});

When("creo una reserva con el horario encontrado", async function () {
  assert.ok(this.reservationPayload, "No existe payload de reserva preparado");
  const candidates = this.reservationCandidates?.length
    ? this.reservationCandidates
    : [this.reservationPayload];

  let last = null;
  for (const candidate of candidates) {
    await this.request("POST", "/api/my/appointments", candidate);
    last = this.lastResponse;
    if (this.lastResponse.status === 201) {
      this.reservationPayload = candidate;
      return;
    }
  }

  this.lastResponse = last;
});

When("intento crear la misma reserva nuevamente", async function () {
  assert.ok(this.reservationPayload, "No existe payload de reserva preparado");
  await this.request("POST", "/api/my/appointments", this.reservationPayload);
});

Given("preparo un payload de reserva con fecha pasada", async function () {
  const catalogResponse = await this.request("GET", "/api/booking/catalog");
  assert.equal(catalogResponse.status, 200, `Catalogo no disponible: ${catalogResponse.text}`);
  const branch = catalogResponse.json?.branches?.[0];
  const service = (catalogResponse.json?.services ?? []).find((s) => s.branch_id === branch?.id);
  const barber = (catalogResponse.json?.barbers ?? []).find((b) => b.branch_id === branch?.id);
  assert.ok(branch && service && barber, "No hay datos minimos (sede/servicio/barbero) para probar reserva invalida");

  const yesterday = formatDateOffset(-1);
  this.invalidReservationPayload = {
    branch_id: branch.id,
    barber_id: barber.id,
    service_id: service.id,
    appointment_date: yesterday,
    start_time: "09:00",
    notes: "Reserva invalida BDD",
  };
});

When("intento crear una reserva invalida", async function () {
  assert.ok(this.invalidReservationPayload, "No existe payload invalido preparado");
  await this.request("POST", "/api/my/appointments", this.invalidReservationPayload);
});

Then("la respuesta debe tener codigo {int}", function (statusCode) {
  assert.ok(this.lastResponse, "No hay respuesta previa para validar");
  assert.equal(
    this.lastResponse.status,
    statusCode,
    `Codigo inesperado. Esperado ${statusCode}, recibido ${this.lastResponse.status}. Body: ${this.lastResponse.text}`,
  );
});

Then('la respuesta JSON debe tener {string} igual a {string}', function (path, rawExpected) {
  assert.ok(this.lastResponse?.json, "La respuesta no contiene JSON");
  const actual = resolvePath(this.lastResponse.json, path);
  const expected = parseExpected(rawExpected);
  assert.equal(actual, expected, `Valor inesperado para ${path}. Esperado ${expected}, recibido ${actual}`);
});

Then("el catalogo debe incluir al menos una sede", function () {
  const branches = this.lastResponse?.json?.branches ?? [];
  assert.ok(branches.length > 0, "El catalogo no devolvio sedes activas");
});

Then("el catalogo filtrado solo contiene elementos de esa sede", function () {
  assert.ok(this.selectedBranchId, "No existe sede seleccionada en contexto");
  const body = this.lastResponse?.json ?? {};
  const services = body.services ?? [];
  const barbers = body.barbers ?? [];

  for (const service of services) assert.equal(service.branch_id, this.selectedBranchId);
  for (const barber of barbers) assert.equal(barber.branch_id, this.selectedBranchId);
});

Then('la cabecera {string} debe existir', function (headerName) {
  assert.ok(this.lastResponse?.headers, "No hay cabeceras para validar");
  const value = this.lastResponse.headers.get(headerName);
  assert.ok(value && String(value).trim().length > 0, `No existe cabecera esperada: ${headerName}`);
});

