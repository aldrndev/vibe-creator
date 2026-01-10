import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

const BLOCKED_HOSTNAMES = new Set(["localhost"]);

const IPV4_RANGES = [
  { start: "0.0.0.0", end: "0.255.255.255" },
  { start: "10.0.0.0", end: "10.255.255.255" },
  { start: "100.64.0.0", end: "100.127.255.255" },
  { start: "127.0.0.0", end: "127.255.255.255" },
  { start: "169.254.0.0", end: "169.254.255.255" },
  { start: "172.16.0.0", end: "172.31.255.255" },
  { start: "192.168.0.0", end: "192.168.255.255" },
  { start: "224.0.0.0", end: "255.255.255.255" },
];

function ipv4ToInt(ip: string): number {
  return ip
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .reduce((acc, part) => (acc << 8) + part, 0) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return IPV4_RANGES.some((range) => {
    const start = ipv4ToInt(range.start);
    const end = ipv4ToInt(range.end);
    return value >= start && value <= end;
  });
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:172.") ||
    normalized.startsWith("::ffff:192.168.") ||
    normalized.startsWith("::ffff:169.254.")
  );
}

async function resolveAndValidate(hostname: string): Promise<void> {
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("Unsafe URL");
  }

  const ipType = isIP(hostname);
  if (ipType === 4) {
    if (isPrivateIpv4(hostname)) {
      throw new Error("Unsafe URL");
    }
    return;
  }

  if (ipType === 6) {
    if (isPrivateIpv6(hostname)) {
      throw new Error("Unsafe URL");
    }
    return;
  }

  const records = await lookup(hostname, { all: true });
  if (records.length === 0) {
    throw new Error("Unsafe URL");
  }

  for (const record of records) {
    if (record.family === 4 && isPrivateIpv4(record.address)) {
      throw new Error("Unsafe URL");
    }
    if (record.family === 6 && isPrivateIpv6(record.address)) {
      throw new Error("Unsafe URL");
    }
  }
}

/**
 * Validate URL to mitigate SSRF (private IPs, localhost, DNS rebinding).
 */
export async function assertSafeUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Unsafe URL");
  }

  if (!parsed.protocol || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
    throw new Error("Unsafe URL");
  }

  await resolveAndValidate(parsed.hostname);
}
