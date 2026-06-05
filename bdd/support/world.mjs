import fs from "node:fs";
import path from "node:path";
import { setWorldConstructor, setDefaultTimeout } from "@cucumber/cucumber";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const normalized = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed;

    const separator = normalized.indexOf("=");
    if (separator <= 0) continue;

    const key = normalized.slice(0, separator).trim();
    let value = normalized.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

const projectRoot = process.cwd();
loadEnvFile(path.join(projectRoot, ".env.local"));
loadEnvFile(path.join(projectRoot, ".env"));
setDefaultTimeout(30_000);

function parseSetCookieHeader(value) {
  if (!value) return [];
  return value.split(/,(?=[^;]+=[^;]+)/g).map((part) => part.trim());
}

class ApiWorld {
  constructor() {
    this.baseUrl = process.env.BDD_BASE_URL || "http://localhost:3000";
    this.clientIp = `10.10.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;
    this.cookies = new Map();
    this.lastResponse = null;
    this.testUser = null;
    this.catalog = null;
    this.selectedBranchId = null;
    this.reservationPayload = null;
  }

  clearSession() {
    this.cookies.clear();
  }

  getCookieHeader() {
    if (this.cookies.size === 0) return "";
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  saveCookiesFromResponse(response) {
    const setCookieValues =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : parseSetCookieHeader(response.headers.get("set-cookie"));

    for (const cookieLine of setCookieValues) {
      const firstPart = cookieLine.split(";")[0];
      const separator = firstPart.indexOf("=");
      if (separator <= 0) continue;

      const name = firstPart.slice(0, separator).trim();
      const value = firstPart.slice(separator + 1).trim();
      if (!name) continue;
      this.cookies.set(name, value);
    }
  }

  async request(method, path, body) {
    const headers = {
      Accept: "application/json",
      "x-forwarded-for": this.clientIp,
    };
    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) headers.Cookie = cookieHeader;

    const options = { method, headers };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, options);
    this.saveCookiesFromResponse(response);

    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    this.lastResponse = { status: response.status, text, json, headers: response.headers };
    return this.lastResponse;
  }
}

setWorldConstructor(ApiWorld);

