// pm2 process file.   Start:  pm2 start ecosystem.config.cjs   ·   Save:  pm2 save
//
// Port: 3199 by default (3000 is taken on the server). Change GTL_PORT below or
// start with  GTL_PORT=3200 pm2 start ecosystem.config.cjs --update-env
// and point your reverse proxy (nginx etc.) at the same port.

const PORT = process.env.GTL_PORT || "3199";

module.exports = {
  apps: [
    {
      name: "gtl-web",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${PORT}`,
      env: { NODE_ENV: "production", PORT },
      instances: 1, // SQLite: keep a single instance
      autorestart: true,
      max_memory_restart: "600M",
      time: true,
    },
    {
      // Sends due nurture / reminder emails once an hour, then exits.
      name: "gtl-nurture-cron",
      cwd: __dirname,
      script: "scripts/cron-nurture.cjs",
      env: { GTL_PORT: PORT },
      cron_restart: "0 * * * *",
      autorestart: false,
      time: true,
    },
  ],
};
