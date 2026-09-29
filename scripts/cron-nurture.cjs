// Calls the nurture endpoint on the locally running site. Run hourly by pm2
// (see ecosystem.config.cjs). Reads CRON_SECRET from the environment or .env.

const fs = require("node:fs");
const path = require("node:path");

function fromDotEnv(key) {
  try {
    const text = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
    const m = text.match(new RegExp(`^${key}=(.*)$`, "m"));
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
  } catch {
    return undefined;
  }
}

const secret = process.env.CRON_SECRET || fromDotEnv("CRON_SECRET");
const url = process.env.GTL_CRON_URL || `http://127.0.0.1:${process.env.GTL_PORT || 3199}/api/cron/nurture`;

if (!secret) {
  console.error("CRON_SECRET is not set (env or .env) — skipping");
  process.exit(1);
}

fetch(url, { headers: { Authorization: `Bearer ${secret}` } })
  .then(async (res) => {
    const body = await res.text();
    console.log(`${new Date().toISOString()} ${res.status} ${body}`);
    process.exit(res.ok ? 0 : 1);
  })
  .catch((e) => {
    console.error(`${new Date().toISOString()} nurture cron failed: ${e.message}`);
    process.exit(1);
  });
