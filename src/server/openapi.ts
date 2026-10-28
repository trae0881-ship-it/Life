export const LIFE_OPENAPI = {
  openapi: "3.1.0",
  info: {
    title: "LIFE API",
    version: "1.0.0",
    description: "Documentation for verified LIFE application routes. Protected chart operations accept a LIFE session or a scoped API key issued through LIFE API Management. Private saved-chart and profile data are not exposed through these endpoints.",
  },
  servers: [{ url: "/", description: "Current LIFE application origin (HTTPS in production)" }],
  tags: [
    { name: "Health" },
    { name: "Locations" },
    { name: "Charts" },
    { name: "Transits" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Check calculation engine and database health",
        operationId: "getHealth",
        description: "Public readiness check. Scoped API keys may authenticate to consume and inspect their usage quota.",
        security: [{ bearerApiKey: [] }, {}],
        responses: {
          "200": { description: "Engine and application are ready.", content: { "application/json": { schema: { $ref: "#/components/schemas/Health" } } } },
          "503": { description: "One or more health checks are unavailable.", content: { "application/json": { schema: { $ref: "#/components/schemas/Health" } } } },
        },
      },
    },
    "/api/locations": {
      get: {
        tags: ["Locations"],
        summary: "Search the bundled birthplace gazetteer",
        operationId: "searchLocations",
        security: [{ sessionCookie: [] }, { bearerApiKey: [] }],
        parameters: [{ name: "q", in: "query", required: true, schema: { type: "string", minLength: 2, maxLength: 80 }, description: "Place name prefix or phrase." }],
        responses: {
          "200": { description: "Matching locations and match counts.", content: { "application/json": { schema: { $ref: "#/components/schemas/LocationSearchResult" } } } },
          "401": { description: "Sign-in required.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "422": { description: "Search query is invalid.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "429": { description: "Rate limit reached.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "503": { description: "Local gazetteer is unavailable.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/charts": {
      post: {
        tags: ["Charts"],
        summary: "Calculate a birth chart",
        operationId: "calculateBirthChart",
        security: [{ sessionCookie: [] }, { bearerApiKey: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ChartRequest" }, example: { localDate: "1990-05-15", localTime: "10:30", timeZone: "Asia/Kolkata", latitude: 19.076, longitude: 72.8777, coordinateSource: "manual-unknown", birthTimeAccuracy: "exact", ayanamsa: "Lahiri", houseSystem: "WholeSign", nodeMode: "both" } } },
        },
        responses: {
          "200": { description: "Calculated chart result. Exact fields are versioned with the LIFE chart engine.", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
          "401": { description: "Sign-in required.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Origin or access not allowed.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "422": { description: "Birth details or chart options are invalid or unsupported.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "429": { description: "Rate limit reached.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "503": { description: "Calculation engine is unavailable.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/transits": {
      post: {
        tags: ["Transits"],
        summary: "Calculate planetary transits for an instant",
        operationId: "calculateTransits",
        security: [{ sessionCookie: [] }, { bearerApiKey: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", additionalProperties: true, description: "Transit instant, IANA timezone, coordinates and supported ayanamsa; validated by the existing transit input resolver." }, example: { localDate: "2026-10-26", localTime: "12:00", timeZone: "Asia/Kolkata", latitude: 19.076, longitude: 72.8777, ayanamsa: "Lahiri" } } },
        },
        responses: {
          "200": { description: "Calculated transit positions.", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
          "401": { description: "Sign-in required.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "422": { description: "Transit input is invalid.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "429": { description: "Rate limit reached.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "503": { description: "Calculation engine is unavailable.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/developer/test": {
      get: {
        tags: ["Health"],
        summary: "Verify a scoped API key and inspect its remaining quota",
        operationId: "testDeveloperApiKey",
        security: [{ bearerApiKey: [] }],
        responses: {
          "200": { description: "Authenticated key scopes, rate limit and remaining quotas." },
          "401": { description: "API key is missing, invalid, inactive or expired.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Key lacks this endpoint scope or account access was disabled.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "429": { description: "Per-minute, daily or monthly quota reached.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      sessionCookie: { type: "apiKey", in: "cookie", name: "life_session", description: "Use the LIFE sign-in page in this browser session. In production the cookie name is __Host-life_session. External clients should use a scoped bearer API key." },
      bearerApiKey: { type: "http", scheme: "bearer", bearerFormat: "LIFE API key", description: "Use an API key created in the authenticated Developer Dashboard. The secret is displayed only once." },
    },
    schemas: {
      Error: { type: "object", required: ["error", "code"], properties: { error: { type: "string" }, code: { type: "string" }, details: {} } },
      Health: { type: "object", properties: { ready: { type: "boolean" }, engineReady: { type: "boolean" }, database: { type: "object", additionalProperties: true } }, additionalProperties: true },
      LocationSearchResult: { type: "object", properties: { matches: { type: "array", items: { type: "object", additionalProperties: true } }, totalMatches: { type: "integer", minimum: 0 }, ambiguous: { type: "boolean" } }, required: ["matches", "totalMatches", "ambiguous"] },
      ChartRequest: {
        type: "object",
        required: ["localDate", "localTime", "timeZone", "latitude", "longitude"],
        properties: {
          fullName: { type: "string", maxLength: 120 },
          birthPlace: { type: "string", maxLength: 160 },
          localDate: { type: "string", format: "date" },
          localTime: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
          timeZone: { type: "string", description: "IANA timezone identifier." },
          latitude: { type: "number", minimum: -90, maximum: 90 },
          longitude: { type: "number", minimum: -180, maximum: 180 },
          coordinateSource: { type: "string", enum: ["birth-record", "gazetteer", "manual-unknown"] },
          birthTimeAccuracy: { type: "string" },
          ayanamsa: { type: "string" },
          houseSystem: { type: "string" },
          nodeMode: { type: "string", enum: ["mean", "true", "both"] },
        },
        additionalProperties: true,
      },
    },
  },
} as const;
