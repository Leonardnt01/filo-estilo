type HttpMethod = "GET" | "POST" | "PATCH";

type DocEndpoint = {
  id: string;
  operationId: string;
  section: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  requestBody?: string;
  requestSchema?: string;
  successResponse: string;
  successSchema?: string;
  requiresAuth?: boolean;
  statuses: Array<{ code: string; description: string }>;
};

const jsonContent = (schemaName: string, example: string) => ({
  "application/json": {
    schema: {
      $ref: `#/components/schemas/${schemaName}`,
    },
    examples: {
      principal: {
        value: JSON.parse(example),
      },
    },
  },
});

export const apiDocs: DocEndpoint[] = [
  {
    id: "auth-login",
    operationId: "authLogin",
    section: "Autenticacion",
    method: "POST",
    path: "/api/auth/login",
    summary: "Iniciar sesion de cliente o administrador",
    description:
      "Autentica al usuario con email y password. Si las credenciales son correctas, crea la sesion segura con cookies HttpOnly y devuelve rol, memberships e indicador de staff.",
    requestBody: `{
  "email": "admin@mail.com",
  "password": "123456"
}`,
    requestSchema: "LoginRequest",
    successResponse: `{
  "ok": true,
  "user": {
    "id": "uuid",
    "email": "admin@mail.com",
    "role": "admin",
    "full_name": "Administrador",
    "is_staff": true,
    "memberships": []
  }
}`,
    successSchema: "LoginResponse",
    statuses: [
      { code: "200", description: "Sesion creada correctamente" },
      { code: "400", description: "Payload invalido" },
      { code: "401", description: "Credenciales incorrectas" },
      { code: "429", description: "Rate limit activado" },
    ],
  },
  {
    id: "auth-me",
    operationId: "authMe",
    section: "Autenticacion",
    method: "GET",
    path: "/api/auth/me",
    summary: "Verificar sesion actual",
    description:
      "Devuelve el estado de autenticacion del usuario actual y, si existe sesion, su informacion resumida.",
    requiresAuth: true,
    successResponse: `{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "admin@mail.com",
    "role": "admin",
    "is_staff": true,
    "memberships": []
  }
}`,
    successSchema: "AuthMeResponse",
    statuses: [{ code: "200", description: "Responde con sesion activa o no activa" }],
  },
  {
    id: "auth-logout",
    operationId: "authLogout",
    section: "Autenticacion",
    method: "POST",
    path: "/api/auth/logout",
    summary: "Cerrar sesion actual",
    description:
      "Finaliza la sesion del usuario autenticado y limpia las cookies manejadas por Supabase SSR.",
    requiresAuth: true,
    successResponse: `{
  "ok": true
}`,
    successSchema: "SimpleOkResponse",
    statuses: [
      { code: "200", description: "Sesion cerrada correctamente" },
      { code: "500", description: "Error al cerrar sesion" },
    ],
  },
  {
    id: "booking-catalog",
    operationId: "bookingCatalog",
    section: "Reserva Cliente",
    method: "GET",
    path: "/api/booking/catalog",
    summary: "Obtener catalogo publico",
    description:
      "Devuelve las sedes activas, servicios visibles y barberos disponibles para iniciar el flujo de reservas.",
    successResponse: `{
  "ok": true,
  "branches": [
    {
      "id": "uuid",
      "name": "Sede Principal",
      "slug": "sede-principal"
    }
  ],
  "services": [
    {
      "id": "uuid",
      "name": "Corte Clasico",
      "price": 30,
      "duration_minutes": 30,
      "branch_id": "uuid"
    }
  ],
  "barbers": [
    {
      "id": "uuid",
      "full_name": "Barbero Demo",
      "specialty": "Fade",
      "branch_id": "uuid"
    }
  ]
}`,
    successSchema: "CatalogResponse",
    statuses: [
      { code: "200", description: "Catalogo cargado correctamente" },
      { code: "500", description: "Error interno al consultar datos" },
    ],
  },
  {
    id: "booking-availability",
    operationId: "bookingAvailability",
    section: "Reserva Cliente",
    method: "POST",
    path: "/api/booking/availability",
    summary: "Consultar horarios disponibles",
    description:
      "Calcula los slots disponibles de un barbero segun sede, servicio, fecha y citas activas ya registradas.",
    requestBody: `{
  "branch_id": "{{branchId}}",
  "barber_id": "{{barberId}}",
  "service_id": "{{serviceId}}",
  "appointment_date": "2026-06-20"
}`,
    requestSchema: "AvailabilityRequest",
    successResponse: `{
  "ok": true,
  "slots": [
    {
      "start_time": "10:00",
      "end_time": "10:45"
    }
  ]
}`,
    successSchema: "AvailabilityResponse",
    statuses: [
      { code: "200", description: "Slots calculados correctamente" },
      { code: "400", description: "Payload invalido o recurso inactivo" },
      { code: "500", description: "Error interno del servidor" },
    ],
  },
  {
    id: "my-appointments-create",
    operationId: "createMyAppointment",
    section: "Reserva Cliente",
    method: "POST",
    path: "/api/my/appointments",
    summary: "Crear cita del cliente",
    description:
      "Registra una cita usando la sesion autenticada del cliente y valida fecha, sede, servicio, barbero y conflicto de horario.",
    requestBody: `{
  "branch_id": "{{branchId}}",
  "barber_id": "{{barberId}}",
  "service_id": "{{serviceId}}",
  "appointment_date": "2026-06-20",
  "start_time": "10:00",
  "notes": "Reserva desde Bruno"
}`,
    requestSchema: "CreateAppointmentRequest",
    successResponse: `{
  "ok": true,
  "item": {
    "id": "uuid",
    "client_id": "uuid",
    "barber_id": "uuid",
    "service_id": "uuid",
    "appointment_date": "2026-06-20",
    "start_time": "10:00",
    "end_time": "10:45",
    "status": "pending",
    "notes": "Reserva desde Bruno"
  }
}`,
    successSchema: "AppointmentMutationResponse",
    requiresAuth: true,
    statuses: [
      { code: "201", description: "Cita creada correctamente" },
      { code: "400", description: "Fecha o payload invalido" },
      { code: "401", description: "Usuario sin sesion" },
      { code: "409", description: "Horario ya ocupado" },
      { code: "500", description: "Error interno del servidor" },
    ],
  },
  {
    id: "my-appointments-list",
    operationId: "listMyAppointments",
    section: "Reserva Cliente",
    method: "GET",
    path: "/api/my/appointments",
    summary: "Listar mis citas",
    description:
      "Devuelve solo las citas del usuario autenticado. Acepta filtros opcionales por estado, fecha y limite.",
    successResponse: `{
  "ok": true,
  "count": 1,
  "items": [
    {
      "id": "uuid",
      "appointment_date": "2026-06-20",
      "start_time": "10:00",
      "end_time": "10:45",
      "status": "pending"
    }
  ]
}`,
    successSchema: "AppointmentListResponse",
    requiresAuth: true,
    statuses: [
      { code: "200", description: "Listado correcto de citas propias" },
      { code: "401", description: "Usuario sin sesion" },
      { code: "400", description: "Filtro invalido" },
    ],
  },
  {
    id: "admin-health",
    operationId: "adminHealth",
    section: "Administracion Base",
    method: "GET",
    path: "/api/admin/health",
    summary: "Validar acceso administrativo",
    description:
      "Comprueba si el usuario actual tiene permisos administrativos por rol global o memberships activas.",
    requiresAuth: true,
    successResponse: `{
  "ok": true,
  "role": "admin",
  "memberships": [
    {
      "branch_id": "uuid",
      "role": "owner"
    }
  ],
  "user_id": "uuid"
}`,
    successSchema: "AdminHealthResponse",
    statuses: [
      { code: "200", description: "Acceso permitido" },
      { code: "401", description: "Usuario no autenticado" },
      { code: "403", description: "Usuario sin permisos administrativos" },
    ],
  },
  {
    id: "admin-branches",
    operationId: "adminBranches",
    section: "Administracion Base",
    method: "GET",
    path: "/api/admin/branches",
    summary: "Listar sedes autorizadas",
    description:
      "Devuelve las sedes que el usuario autenticado puede administrar, segun su rol y memberships vigentes.",
    requiresAuth: true,
    successResponse: `{
  "ok": true,
  "items": [
    {
      "id": "uuid",
      "name": "Sede Principal",
      "slug": "sede-principal",
      "address": "Av. Principal 123",
      "phone": "999999999",
      "is_active": true
    }
  ]
}`,
    successSchema: "BranchesResponse",
    statuses: [
      { code: "200", description: "Sedes cargadas correctamente" },
      { code: "401", description: "Usuario no autenticado" },
      { code: "403", description: "Acceso no permitido" },
    ],
  },
  {
    id: "admin-services-create",
    operationId: "createAdminService",
    section: "Administracion Operativa",
    method: "POST",
    path: "/api/admin/services",
    summary: "Crear servicio por sede",
    description:
      "Registra un nuevo servicio administrativo asociado a una sede y lo deja disponible para el catalogo publico si esta activo.",
    requestBody: `{
  "branch_id": "{{branchId}}",
  "name": "Corte Skin Fade",
  "description": "Servicio premium",
  "price": 35,
  "duration_minutes": 45
}`,
    requestSchema: "CreateServiceRequest",
    successResponse: `{
  "ok": true,
  "item": {
    "id": "uuid",
    "name": "Corte Skin Fade",
    "description": "Servicio premium",
    "price": 35,
    "duration_minutes": 45,
    "is_active": true
  }
}`,
    successSchema: "ServiceMutationResponse",
    requiresAuth: true,
    statuses: [
      { code: "201", description: "Servicio creado correctamente" },
      { code: "400", description: "Payload invalido" },
      { code: "403", description: "Sin permisos administrativos" },
      { code: "500", description: "Error interno del servidor" },
    ],
  },
  {
    id: "admin-appointments-list",
    operationId: "listAdminAppointments",
    section: "Administracion Operativa",
    method: "GET",
    path: "/api/admin/appointments",
    summary: "Listar citas administrativas",
    description:
      "Permite revisar citas de forma operativa con filtros por estado, barbero, servicio, sede y rango de fechas.",
    requiresAuth: true,
    successResponse: `{
  "ok": true,
  "count": 1,
  "items": [
    {
      "id": "uuid",
      "customer_name": "Cliente Demo",
      "customer_email": "cliente@mail.com",
      "status": "pending",
      "appointment_date": "2026-06-20",
      "start_time": "10:00"
    }
  ]
}`,
    successSchema: "AdminAppointmentsResponse",
    statuses: [
      { code: "200", description: "Citas listadas correctamente" },
      { code: "400", description: "Filtro invalido" },
      { code: "403", description: "Sin permisos administrativos" },
      { code: "500", description: "Error interno del servidor" },
    ],
  },
  {
    id: "admin-appointments-update",
    operationId: "updateAdminAppointment",
    section: "Administracion Operativa",
    method: "PATCH",
    path: "/api/admin/appointments/{id}",
    summary: "Cambiar estado de una cita",
    description:
      "Actualiza el estado y las notas de una cita desde el panel administrativo para controlar el flujo operativo.",
    requestBody: `{
  "status": "confirmed",
  "notes": "Cliente confirmado por WhatsApp"
}`,
    requestSchema: "UpdateAppointmentRequest",
    successResponse: `{
  "ok": true,
  "item": {
    "id": "uuid",
    "status": "confirmed",
    "notes": "Cliente confirmado por WhatsApp"
  }
}`,
    successSchema: "AppointmentMutationResponse",
    requiresAuth: true,
    statuses: [
      { code: "200", description: "Cita actualizada correctamente" },
      { code: "400", description: "Payload invalido" },
      { code: "403", description: "Sin permisos administrativos" },
      { code: "500", description: "Error interno del servidor" },
    ],
  },
];

const sectionDescriptions: Record<string, string> = {
  Autenticacion:
    "Controla inicio de sesion, verificacion de identidad y cierre de sesion con cookies seguras.",
  "Reserva Cliente":
    "Agrupa los endpoints publicos y privados necesarios para reservar una cita como cliente.",
  "Administracion Base":
    "Valida permisos administrativos y resuelve el contexto multi-sede del usuario autenticado.",
  "Administracion Operativa":
    "Incluye endpoints de gestion que ayudan a operar servicios y citas desde el panel admin.",
};

export const apiSections = Object.entries(sectionDescriptions).map(([title, description]) => ({
  title,
  description,
  endpoints: apiDocs.filter((endpoint) => endpoint.section === title),
}));

const components = {
  securitySchemes: {
    cookieAuth: {
      type: "apiKey",
      in: "cookie",
      name: "sb-access-token",
      description:
        "Sesion basada en cookies. En desarrollo, primero ejecuta el login desde Scalar y luego prueba los endpoints protegidos en la misma pestaña.",
    },
  },
  schemas: {
    ErrorResponse: {
      type: "object",
      properties: {
        error: { type: "string", example: "Invalid payload" },
      },
    },
    SimpleOkResponse: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
      },
    },
    Membership: {
      type: "object",
      properties: {
        branch_id: { type: "string", format: "uuid" },
        role: { type: "string", example: "owner" },
      },
    },
    UserSummary: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        email: { type: "string", format: "email" },
        role: { type: "string", example: "admin", nullable: true },
        full_name: { type: "string", example: "Administrador", nullable: true },
        is_staff: { type: "boolean", example: true },
        memberships: {
          type: "array",
          items: { $ref: "#/components/schemas/Membership" },
        },
      },
    },
    LoginRequest: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string", example: "123456" },
      },
    },
    LoginResponse: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        user: { $ref: "#/components/schemas/UserSummary" },
      },
    },
    AuthMeResponse: {
      type: "object",
      properties: {
        authenticated: { type: "boolean", example: true },
        user: {
          oneOf: [{ $ref: "#/components/schemas/UserSummary" }, { type: "null" }],
        },
      },
    },
    Branch: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string", example: "Sede Principal" },
        slug: { type: "string", example: "sede-principal" },
        address: { type: "string", example: "Av. Principal 123", nullable: true },
        phone: { type: "string", example: "999999999", nullable: true },
        is_active: { type: "boolean", example: true },
      },
    },
    Service: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string", example: "Corte Clasico" },
        description: { type: "string", nullable: true },
        price: { type: "number", example: 30 },
        duration_minutes: { type: "integer", example: 30 },
        branch_id: { type: "string", format: "uuid" },
        is_active: { type: "boolean", example: true },
      },
    },
    Barber: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        full_name: { type: "string", example: "Barbero Demo" },
        specialty: { type: "string", example: "Fade", nullable: true },
        branch_id: { type: "string", format: "uuid" },
      },
    },
    CatalogResponse: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        branches: { type: "array", items: { $ref: "#/components/schemas/Branch" } },
        services: { type: "array", items: { $ref: "#/components/schemas/Service" } },
        barbers: { type: "array", items: { $ref: "#/components/schemas/Barber" } },
      },
    },
    AvailabilityRequest: {
      type: "object",
      required: ["branch_id", "barber_id", "service_id", "appointment_date"],
      properties: {
        branch_id: { type: "string", format: "uuid" },
        barber_id: { type: "string", format: "uuid" },
        service_id: { type: "string", format: "uuid" },
        appointment_date: { type: "string", format: "date", example: "2026-06-20" },
      },
    },
    Slot: {
      type: "object",
      properties: {
        start_time: { type: "string", example: "10:00" },
        end_time: { type: "string", example: "10:45" },
      },
    },
    AvailabilityResponse: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        slots: { type: "array", items: { $ref: "#/components/schemas/Slot" } },
      },
    },
    CreateAppointmentRequest: {
      type: "object",
      required: ["branch_id", "barber_id", "service_id", "appointment_date", "start_time"],
      properties: {
        branch_id: { type: "string", format: "uuid" },
        barber_id: { type: "string", format: "uuid" },
        service_id: { type: "string", format: "uuid" },
        appointment_date: { type: "string", format: "date" },
        start_time: { type: "string", example: "10:00" },
        notes: { type: "string", nullable: true },
      },
    },
    Appointment: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        client_id: { type: "string", format: "uuid", nullable: true },
        barber_id: { type: "string", format: "uuid" },
        service_id: { type: "string", format: "uuid" },
        appointment_date: { type: "string", format: "date" },
        start_time: { type: "string", example: "10:00" },
        end_time: { type: "string", example: "10:45", nullable: true },
        status: { type: "string", example: "pending" },
        notes: { type: "string", nullable: true },
        customer_name: { type: "string", nullable: true },
        customer_email: { type: "string", nullable: true },
      },
    },
    AppointmentMutationResponse: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        item: { $ref: "#/components/schemas/Appointment" },
      },
    },
    AppointmentListResponse: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        count: { type: "integer", example: 1 },
        items: {
          type: "array",
          items: { $ref: "#/components/schemas/Appointment" },
        },
      },
    },
    AdminHealthResponse: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        role: { type: "string", example: "admin", nullable: true },
        memberships: {
          type: "array",
          items: { $ref: "#/components/schemas/Membership" },
        },
        user_id: { type: "string", format: "uuid" },
      },
    },
    BranchesResponse: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        items: { type: "array", items: { $ref: "#/components/schemas/Branch" } },
      },
    },
    CreateServiceRequest: {
      type: "object",
      required: ["branch_id", "name", "price", "duration_minutes"],
      properties: {
        branch_id: { type: "string", format: "uuid" },
        name: { type: "string", example: "Corte Skin Fade" },
        description: { type: "string", nullable: true },
        price: { type: "number", example: 35 },
        duration_minutes: { type: "integer", example: 45 },
      },
    },
    ServiceMutationResponse: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        item: { $ref: "#/components/schemas/Service" },
      },
    },
    AdminAppointmentsResponse: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        count: { type: "integer", example: 1 },
        items: { type: "array", items: { $ref: "#/components/schemas/Appointment" } },
      },
    },
    UpdateAppointmentRequest: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"],
        },
        notes: { type: "string", nullable: true },
      },
    },
  },
};

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Filo Estilo API",
    version: "1.1.0",
    description:
      "Especificacion OpenAPI de los endpoints principales de Filo Estilo para autenticacion, reservas y administracion. Esta version esta preparada para exploracion interactiva en Scalar.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Servidor local",
    },
  ],
  tags: [
    { name: "Autenticacion", description: sectionDescriptions.Autenticacion },
    { name: "Reserva Cliente", description: sectionDescriptions["Reserva Cliente"] },
    { name: "Administracion Base", description: sectionDescriptions["Administracion Base"] },
    { name: "Administracion Operativa", description: sectionDescriptions["Administracion Operativa"] },
  ],
  components,
  paths: apiDocs.reduce<Record<string, Record<string, unknown>>>((paths, endpoint) => {
    const methodKey = endpoint.method.toLowerCase();
    const requestBody =
      endpoint.requestBody && endpoint.requestSchema
        ? {
            requestBody: {
              required: true,
              content: jsonContent(endpoint.requestSchema, endpoint.requestBody),
            },
          }
        : {};

    if (!paths[endpoint.path]) {
      paths[endpoint.path] = {};
    }

    paths[endpoint.path][methodKey] = {
      tags: [endpoint.section],
      operationId: endpoint.operationId,
      summary: endpoint.summary,
      description: endpoint.description,
      security: endpoint.requiresAuth ? [{ cookieAuth: [] }] : [],
      ...requestBody,
      responses: Object.fromEntries(
        endpoint.statuses.map((status) => [
          status.code,
          {
            description: status.description,
            content:
              status.code.startsWith("2") && endpoint.successSchema
                ? jsonContent(endpoint.successSchema, endpoint.successResponse)
                : {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/ErrorResponse",
                      },
                    },
                  },
          },
        ]),
      ),
    };

    return paths;
  }, {}),
} as const;
