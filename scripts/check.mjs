/**
 * check.mjs — Zero-dependency sanity checks for the static site.
 *
 * Verifies:
 *   1. every local file referenced by a page exists on disk
 *   2. every internal link points at a page that exists
 *   3. required document landmarks are present (title, description, h1, main, nav)
 *   4. no stray characters from other scripts slipped into the copy
 *   5. <title> and meta description are unique per page and within sane lengths
 *   6. markup is balanced for the elements we care about
 *
 * Run with: npm run check
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set([".git", "node_modules", ".vscode"]);

const problems = [];
const notes = [];

const fail = (file, message) => problems.push(`${file}: ${message}`);

/* ---------------------------------------------------------------- helpers */

async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            files.push(...(await walk(join(dir, entry.name))));
        } else {
            files.push(join(dir, entry.name));
        }
    }
    return files;
}

async function exists(path) {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

const VOID_TAGS = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr"
]);

/** Counts opening vs closing tags, ignoring comments, scripts and void elements. */
function unbalancedTags(html) {
    const stripped = html
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "");

    const stack = [];
    const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
    let match;

    while ((match = re.exec(stripped)) !== null) {
        const [, closing, rawName, selfClose] = match;
        const name = rawName.toLowerCase();
        if (VOID_TAGS.has(name) || selfClose === "/") continue;

        if (closing) {
            const open = stack.pop();
            if (open !== name) {
                return `</${name}> menutup <${open ?? "tidak ada"}>`;
            }
        } else {
            stack.push(name);
        }
    }

    return stack.length ? `tag belum ditutup: ${stack.join(", ")}` : null;
}

/* ------------------------------------------------------------------ main */

const allFiles = await walk(ROOT);
const htmlFiles = allFiles.filter((f) => extname(f) === ".html");
const rel = (p) => p.slice(ROOT.length + 1).replace(/\\/g, "/");

if (htmlFiles.length === 0) {
    console.error("Tidak ada file .html ditemukan.");
    process.exit(1);
}

const seenTitles = new Map();
const seenDescriptions = new Map();

for (const file of htmlFiles) {
    const name = rel(file);
    const html = await readFile(file, "utf8");

    /* 3. required landmarks */
    const required = [
        [/<title>[^<]{5,}<\/title>/i, "<title> yang wajar"],
        [/<meta\s+name="description"\s+content="[^"]{20,}"/i, '<meta name="description"> yang wajar'],
        [/<h1[\s>]/i, "<h1>"],
        [/<main[\s>]/i, "<main>"],
        [/<nav[\s>]/i, "<nav>"],
        [/<html[^>]+lang="/i, 'atribut lang pada <html>'],
        [/<meta\s+name="viewport"/i, '<meta name="viewport">'],
        [/rel="canonical"/i, 'tautan rel="canonical"']
    ];
    for (const [re, label] of required) {
        if (!re.test(html)) fail(name, `tidak ada ${label}`);
    }

    /* 4. stray non-Latin characters (a symptom of copy-paste going wrong) */
    const suspicious = [...html.matchAll(/[\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/g)];
    if (suspicious.length) {
        const line = html.slice(0, suspicious[0].index).split("\n").length;
        fail(name, `karakter asing di baris ~${line} (kemungkinan teks rusak)`);
    }

    /* 5. uniqueness + length */
    const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1];
    if (title) {
        if (title.length > 65) fail(name, `<title> ${title.length} karakter (disarankan < 65)`);
        if (seenTitles.has(title)) fail(name, `<title> duplikat dengan ${seenTitles.get(title)}`);
        seenTitles.set(title, name);
    }

    const description = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1];
    if (description) {
        if (description.length > 165) {
            fail(name, `meta description ${description.length} karakter (disarankan < 165)`);
        }
        if (seenDescriptions.has(description)) {
            fail(name, `meta description duplikat dengan ${seenDescriptions.get(description)}`);
        }
        seenDescriptions.set(description, name);
    }

    /* 6. balanced markup */
    const imbalance = unbalancedTags(html);
    if (imbalance) fail(name, `markup tidak seimbang — ${imbalance}`);

    /* 1. local assets referenced by the page must exist */
    const assetRefs = new Set();
    for (const re of [
        /(?:src|href)="(\.\/[^"#?]+)"/g,
        /content="(\.\/[^"]+\.(?:png|jpg|jpeg|svg|webp|ico|json|xml|txt|webmanifest))"/g,
        /data-logo-(?:dark|light)="(\.\/[^"]+)"/g
    ]) {
        let m;
        while ((m = re.exec(html)) !== null) assetRefs.add(m[1]);
    }

    for (const ref of assetRefs) {
        const target = resolve(dirname(file), ref);
        if (!(await exists(target))) fail(name, `aset hilang: ${ref}`);
    }

    /* 2. internal page links must exist */
    const pageRefs = new Set();
    for (const m of html.matchAll(/href="(\.\/[a-z0-9-]+\.html)(?:[?#][^"]*)?"/gi)) {
        pageRefs.add(m[1]);
    }
    for (const ref of pageRefs) {
        const target = resolve(dirname(file), ref);
        if (!(await exists(target))) fail(name, `tautan internal rusak: ${ref}`);
    }

    /* every page should be reachable from the main nav */
    const navLinks = [...html.matchAll(/class="nav__link"[^>]*href="\.\/([^"]+)"/g)].map((m) => m[1]);
    if (navLinks.length < 4) fail(name, `nav hanya punya ${navLinks.length} tautan (harus 4)`);

    /* the shared script and the four stylesheets must be linked */
    for (const asset of [
        "./js/main.js",
        "./styles/tokens.css",
        "./styles/base.css",
        "./styles/components.css",
        "./styles/pages.css"
    ]) {
        if (!html.includes(asset)) fail(name, `tidak memuat ${asset}`);
    }
}

/* ------------------------------------------- cross-page consistency checks */

const pageNames = htmlFiles.map(rel);
for (const required of ["index.html", "about.html", "portofolio.html", "contact.html"]) {
    if (!pageNames.includes(required)) fail("site", `halaman wajib hilang: ${required}`);
}

/* Contact form wiring: the WhatsApp number and channel must be declared. */
const contact = htmlFiles.find((f) => rel(f) === "contact.html");
if (contact) {
    const html = await readFile(contact, "utf8");
    if (!/data-phone="\d{10,15}"/.test(html)) fail("contact.html", 'atribut data-phone pada form tidak valid');
    if (!/data-channel="(whatsapp|mailto)"/.test(html)) fail("contact.html", 'atribut data-channel pada form hilang');
    for (const id of ["name", "email", "subject", "message"]) {
        if (!new RegExp(`id="${id}"`).test(html)) fail("contact.html", `field #${id} tidak ada`);
    }
}

/* Portfolio filters: at least one control and a matching grid. */
const portfolio = htmlFiles.find((f) => rel(f) === "portofolio.html");
if (portfolio) {
    const html = await readFile(portfolio, "utf8");
    const controls = [...html.matchAll(/data-filter="([a-z0-9-]+)"/g)].map((m) => m[1]);
    if (!controls.includes("all")) fail("portofolio.html", 'filter "all" tidak ada');
    const projects = [...html.matchAll(/data-category="([^"]+)"/g)].map((m) => m[1].trim().split(/\s+/));
    if (projects.length < 6) fail("portofolio.html", `hanya ${projects.length} project (minimal 6)`);

    for (const category of controls) {
        if (category === "all") continue;
        if (!projects.some((list) => list.includes(category))) {
            fail("portofolio.html", `filter "${category}" tidak cocok dengan satu pun project`);
        }
    }
    notes.push(`${projects.length} project, ${controls.length - 1} kategori filter`);
}

/* ----------------------------------------------------------------- report */

console.log(`Memeriksa ${htmlFiles.length} halaman di ${rel(ROOT) || "."}\n`);

if (notes.length) {
    notes.forEach((n) => console.log(`  info  ${n}`));
}

if (problems.length === 0) {
    console.log("  OK    semua pemeriksaan lolos");
    process.exit(0);
}

console.log("");
problems.forEach((p) => console.log(`  FAIL  ${p}`));
console.log(`\n${problems.length} masalah ditemukan.`);
process.exit(1);
