import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { spawn } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVAL_ROOT = join(__dirname, "..");
const CORPUS_URL = process.env.CORPUS_URL ?? "http://localhost:3000";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "agent-results-saver",
      configureServer(server) {
        server.middlewares.use("/api/save-agent-results", (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }

          let body = "";
          req.on("data", (chunk) => { body += chunk.toString(); });
          req.on("end", () => {
            try {
              const data = JSON.parse(body);
              const json = JSON.stringify(data, null, 2);
              writeFileSync(join(EVAL_ROOT, "results/agent-results.json"), json);
              writeFileSync(join(__dirname, "public/agent-results.json"), json);
              // Archive every run for F3 (multi-run mean ± SD)
              const stamp = String(data.timestamp ?? new Date().toISOString()).replace(/[:.]/g, "-");
              mkdirSync(join(EVAL_ROOT, "results/runs"), { recursive: true });
              writeFileSync(join(EVAL_ROOT, `results/runs/agent-${stamp}.json`), json);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true }));
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
            }
          });
        });
      },
    },
    {
      name: "axe-runner",
      configureServer(server) {
        server.middlewares.use("/api/run-axe", (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }

          const tsxCli = join(EVAL_ROOT, "node_modules/tsx/dist/cli.mjs");
          const scriptPath = join(EVAL_ROOT, "scripts/run-axe.ts");
          const child = spawn(process.execPath, [tsxCli, scriptPath], {
            env: { ...process.env, APP_URL: CORPUS_URL },
            cwd: EVAL_ROOT,
          });

          let stderr = "";
          child.stderr?.on("data", (d) => { stderr += d.toString(); });

          child.on("close", (code) => {
            res.setHeader("Content-Type", "application/json");
            if (code === 0) {
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true }));
            } else {
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, error: stderr }));
            }
          });
        });
      },
    },
  ],
  server: {
    port: 4000,
    fs: { allow: [EVAL_ROOT] },
  },
});
