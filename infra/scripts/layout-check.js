/**
 * Layout Check Script
 * Validates project structure against Digitesia Blueprint v1.0
 *
 * Run: pnpm layout:check
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

/** @type {string[]} */
const errors = [];

/**
 * @param {string} path
 * @param {string} description
 */
function checkExists(path, description) {
  if (!existsSync(join(ROOT, path))) {
    errors.push(`MISSING: ${path} - ${description}`);
  }
}

/**
 * @param {string} path
 * @param {string} description
 */
function checkForbidden(path, description) {
  if (existsSync(join(ROOT, path))) {
    errors.push(`FORBIDDEN: ${path} - ${description}`);
  }
}

// Read README flags
const readmePath = join(ROOT, "README.md");
if (!existsSync(readmePath)) {
  errors.push("CRITICAL: README.md missing");
} else {
  const readme = readFileSync(readmePath, "utf-8");

  // Check required flags
  const requiredFlags = [
    "Repo Profile:",
    "Uses Database:",
    "CI Uses Compose:",
    "Prod Single Node Supported:",
    "Automated Deploy (GitHub Actions):",
  ];

  for (const flag of requiredFlags) {
    if (!readme.includes(flag)) {
      errors.push(`MISSING README FLAG: ${flag}`);
    }
  }

  // Extract profile
  const profileMatch = readme.match(/Repo Profile:\s*(A|B|C|D)/);
  const profile = profileMatch ? profileMatch[1] : null;

  if (!profile) {
    errors.push("INVALID: Repo Profile must be A, B, C, or D");
  } else {
    console.log(`Validating Profile ${profile} layout...`);

    // Profile B validation (Web + API)
    if (profile === "B") {
      // Required directories
      checkExists("apps/api", "API app required for Profile B");
      checkExists("apps/api/src", "API src directory required");
      checkExists("apps/api/Dockerfile", "API Dockerfile required");
      checkExists("apps/api/package.json", "API package.json required");
      checkExists("apps/api/.env.example", "API .env.example required");

      checkExists("apps/web", "Web app required for Profile B");
      checkExists("apps/web/src", "Web src directory required");
      checkExists("apps/web/package.json", "Web package.json required");
      checkExists("apps/web/.env.example", "Web .env.example required");

      // Check database flag
      const usesDb = readme.includes("Uses Database: true");
      if (usesDb) {
        checkExists(
          "apps/api/prisma",
          "Prisma directory required when Uses Database: true"
        );
      }

      // Infra directories
      checkExists("infra/compose", "infra/compose required");
      checkExists("infra/scripts", "infra/scripts required");
      checkExists("infra/deploy", "infra/deploy required");

      // Docs directories
      checkExists("docs/architecture", "docs/architecture required");
      checkExists("docs/runbooks", "docs/runbooks required");
      checkExists("docs/decisions", "docs/decisions required");

      // Workflows
      checkExists(".github/workflows/ci.yml", "CI workflow required");
      checkExists(".github/workflows/release.yml", "Release workflow required");

      // Forbidden patterns
      checkForbidden("server", "server/ at root is forbidden");
      checkForbidden("backend", "backend/ at root is forbidden");
      checkForbidden("frontend", "frontend/ at root is forbidden");
      checkForbidden(
        "scripts",
        "scripts/ at root is forbidden (use infra/scripts/)"
      );
      checkForbidden(
        "deploy",
        "deploy/ at root is forbidden (use infra/deploy/)"
      );
      checkForbidden("docker", "docker/ at root is forbidden");
    }
  }
}

// Report results
console.log("");
if (errors.length === 0) {
  console.log("✅ Layout check passed!");
  process.exit(0);
} else {
  console.log("❌ Layout check failed:");
  for (const error of errors) {
    console.log(`  - ${error}`);
  }
  process.exit(1);
}
