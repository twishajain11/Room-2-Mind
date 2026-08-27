import { spawn, spawnSync } from "node:child_process";

/**
 * Production entry point.
 *
 * Migrations run here rather than in the build, and a migration failure is
 * logged loudly but does not stop the server. The reason is that most of this
 * product does not need the database at all: capture, scoring, interventions,
 * the weights panel, Recovery Mode and the simulation are entirely client side.
 * Only storing a calibration response needs Postgres. Taking the whole site
 * down because a database is not wired yet would trade a working product for a
 * broken one.
 *
 * The API routes fail on their own terms in that state, with a 500 and a
 * message, which is the correct blast radius.
 */

function run(command, args) {
  console.log(`[start] ${command} ${args.join(" ")}`);
  return spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
}

if (!process.env.DATABASE_URL) {
  console.warn(
    "[start] DATABASE_URL is not set. Skipping migrations. The site will serve, " +
      "but anything that stores a calibration response will return an error."
  );
} else {
  const result = run("npx", ["prisma", "migrate", "deploy"]);
  if (result.status !== 0) {
    console.error(
      `[start] prisma migrate deploy exited with ${result.status}. Serving anyway; ` +
        "database-backed routes will fail until this is resolved."
    );
  } else {
    console.log("[start] migrations are up to date");
  }
}

const next = spawn("npx", ["next", "start", "-p", process.env.PORT ?? "10000"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

next.on("exit", (code) => process.exit(code ?? 0));
