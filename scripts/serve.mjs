/**
 * serve.mjs — Minimal static file server for local preview.
 *
 * Zero dependencies, Node 18+. Usage:
 *   npm run dev            # http://localhost:5173
 *   npm run dev -- 8080    # custom port
 */

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.argv[2]) || Number(process.env.PORT) || 5173;

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8"
};

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname.endsWith("/")) pathname += "index.html";

    // Resolve inside ROOT only — blocks ../ traversal.
    const filePath = join(ROOT, normalize(pathname));
    if (!filePath.startsWith(ROOT + sep) && filePath !== ROOT) {
        res.writeHead(403, { "content-type": "text/plain" });
        res.end("403 Forbidden");
        return;
    }

    try {
        const info = await stat(filePath);
        if (info.isDirectory()) {
            res.writeHead(302, { location: pathname.replace(/\/?$/, "/") });
            res.end();
            return;
        }

        res.writeHead(200, {
            "content-type": MIME[extname(filePath).toLowerCase()] || "application/octet-stream",
            "content-length": info.size,
            "cache-control": "no-cache"
        });
        createReadStream(filePath).pipe(res);
    } catch {
        res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        res.end(`<!doctype html><meta charset="utf-8"><title>404</title>
            <body style="font:16px system-ui;padding:3rem">
            <h1>404</h1><p><code>${pathname}</code> tidak ditemukan.</p>
            <p><a href="/">Kembali ke beranda</a></p>`);
    }
});

server.listen(PORT, () => {
    console.log(`\n  Portofolio berjalan di  http://localhost:${PORT}\n`);
    console.log("  Halaman:");
    for (const page of ["/", "/about.html", "/portofolio.html", "/contact.html"]) {
        console.log(`    http://localhost:${PORT}${page}`);
    }
    console.log("\n  Ctrl+C untuk menghentikan.\n");
});
