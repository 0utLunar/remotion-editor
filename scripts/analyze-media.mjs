#!/usr/bin/env node
// Transforma vídeos (arquivo, pasta, links.txt ou URL do YouTube) em dossiês
// compactos para o Claude analisar: cortes, ritmo, contact sheets, loudness,
// transcrição e momentos candidatos. Tudo cacheado em out/analysis/.
//
// Uso:
//   node scripts/analyze-media.mjs <arquivo|pasta|links.txt|url> --slug <slug> [opções]
//
// Opções:
//   --slug <slug>        vídeo do projeto (footage vai para out/analysis/<slug>/)
//   --kind ref|footage   padrão: "ref" para URLs e pastas references/, senão "footage"
//   --section a-b        só um trecho (ex. 01:20-03:00)
//   --lang pt            idioma da fala para a transcrição (padrão: pt)
//   --model small        modelo whisper (tiny, base, small, medium, large-v3-turbo)
//   --no-transcript      pula a transcrição
//   --subs-only          URL: não baixa vídeo, só metadados + legenda
//   --keep               URL: mantém o mp4 baixado em out/cache/refs/
//   --frame-at <t>       extrai 1 frame em resolução cheia no tempo t (ex. 02:13.4)
//   --force              ignora o cache

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const MEDIA_EXT = new Set([".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"]);
const SHEET_COLS = 4;
const SHEET_ROWS = 4;
const MAX_SAMPLES = 96;
const MAX_GAP_SECONDS = 10;
const SCENE_THRESHOLD = 0.3;

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    slug: { type: "string" },
    kind: { type: "string" },
    section: { type: "string" },
    lang: { type: "string", default: "pt" },
    model: { type: "string", default: "small" },
    "no-transcript": { type: "boolean", default: false },
    "subs-only": { type: "boolean", default: false },
    keep: { type: "boolean", default: false },
    "frame-at": { type: "string" },
    force: { type: "boolean", default: false },
  },
});

// ---------- utilidades ----------

const log = (...a) => console.error("›", ...a);

const parseTime = (s) =>
  s
    .split(":")
    .map(Number)
    .reduce((acc, n) => acc * 60 + n, 0);

const fmt = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
};

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

const median = (arr) => {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const percentile = (arr, p) => {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};

const ffmpegPath = () => {
  const p = require("ffmpeg-static");
  if (!existsSync(p)) {
    log("baixando binário do ffmpeg (ffmpeg-static)...");
    spawnSync(process.execPath, [require.resolve("ffmpeg-static/install.js")], {
      stdio: "inherit",
      cwd: path.dirname(require.resolve("ffmpeg-static/package.json")),
    });
  }
  return p;
};

const FFMPEG = ffmpegPath();

const ffmpeg = (args, { binary = false } = {}) => {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-nostdin", ...args], {
    maxBuffer: 1024 * 1024 * 1024,
    encoding: binary ? "buffer" : "utf8",
  });
  if (r.status !== 0) {
    const err = binary ? r.stderr.toString() : r.stderr;
    throw new Error(`ffmpeg falhou: ${err.split("\n").slice(-6).join("\n")}`);
  }
  return r;
};

const findFont = () => {
  const candidates = [
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  ];
  return candidates.find((c) => existsSync(c)) ?? null;
};

const FONT = findFont();

const ytDlp = () => {
  const tries = [
    ["yt-dlp", []],
    ["python", ["-m", "yt_dlp"]],
    ["py", ["-m", "yt_dlp"]],
  ];
  for (const [cmd, pre] of tries) {
    const r = spawnSync(cmd, [...pre, "--version"], { encoding: "utf8" });
    if (r.status === 0) {
      return (args) => {
        // yt-dlp precisa de um runtime JS para o YouTube; o Node já está aqui.
        const res = spawnSync(cmd, [...pre, "--js-runtimes", `node:${process.execPath}`, ...args], {
          encoding: "utf8",
          maxBuffer: 256 * 1024 * 1024,
        });
        if (res.status !== 0) {
          throw new Error(`yt-dlp falhou: ${res.stderr.split("\n").slice(-6).join("\n")}`);
        }
        return res.stdout;
      };
    }
  }
  throw new Error(
    "yt-dlp não encontrado. Instale uma vez com `winget install yt-dlp.yt-dlp` (ou `pip install yt-dlp`).",
  );
};

// ---------- etapas da análise ----------

const probe = (file) => {
  const { stderr } = spawnSync(FFMPEG, ["-hide_banner", "-i", file], { encoding: "utf8" });
  const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(stderr);
  const v = /Video: .*?, (\d{2,5})x(\d{2,5}).*?, ([\d.]+) (?:fps|tbr)/.exec(stderr);
  return {
    duration: d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : 0,
    width: v ? +v[1] : null,
    height: v ? +v[2] : null,
    fps: v ? +v[3] : null,
    hasAudio: /Audio: /.test(stderr),
  };
};

const detectCuts = (file) => {
  const { stderr } = ffmpeg([
    "-i", file,
    "-an",
    "-vf", `scale=320:-2,select='gt(scene,${SCENE_THRESHOLD})',showinfo`,
    "-f", "null", "-",
  ]);
  return [...stderr.matchAll(/pts_time:([\d.]+)/g)].map((m) => round(+m[1]));
};

const pacing = (cuts, duration) => {
  const bounds = [0, ...cuts, duration];
  const shots = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const len = bounds[i + 1] - bounds[i];
    if (len > 0.05) shots.push({ start: bounds[i], end: bounds[i + 1], len });
  }
  const lens = shots.map((s) => s.len);
  const perMinute = [];
  for (let m = 0; m < Math.ceil(duration / 60); m++) {
    perMinute.push(cuts.filter((c) => c >= m * 60 && c < (m + 1) * 60).length);
  }
  return {
    shots,
    stats: {
      shotCount: shots.length,
      avgShot: round(lens.reduce((a, b) => a + b, 0) / (lens.length || 1)),
      medianShot: round(median(lens)),
      minShot: round(Math.min(...lens)),
      maxShot: round(Math.max(...lens)),
      cutsPerMinute: round(cuts.length / (duration / 60 || 1), 1),
      cutsPerMinuteTimeline: perMinute,
    },
  };
};

// 1 amostra no meio de cada plano; planos longos ganham amostras extras.
const sampleTimes = (shots) => {
  const times = [];
  for (const s of shots) {
    const extra = Math.floor(s.len / MAX_GAP_SECONDS);
    const n = extra + 1;
    for (let i = 0; i < n; i++) times.push(s.start + (s.len * (i + 0.5)) / n);
  }
  if (times.length <= MAX_SAMPLES) return times;
  const step = times.length / MAX_SAMPLES;
  return Array.from({ length: MAX_SAMPLES }, (_, i) => times[Math.floor(i * step)]);
};

const escapeDrawtext = (t) => t.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");

const contactSheets = (file, times, dir, offset) => {
  const framesDir = path.join(dir, "frames");
  const sheetsDir = path.join(dir, "sheets");
  rmSync(framesDir, { recursive: true, force: true });
  rmSync(sheetsDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  mkdirSync(sheetsDir, { recursive: true });

  times.forEach((t, i) => {
    const label = escapeDrawtext(`#${i + 1}  ${fmt(t + offset)}`);
    const text = FONT
      ? `,drawtext=fontfile='${escapeDrawtext(FONT)}':text='${label}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=6`
      : "";
    ffmpeg([
      "-ss", String(t), "-i", file,
      "-frames:v", "1",
      "-vf", `scale=480:270:force_original_aspect_ratio=decrease,pad=480:270:(ow-iw)/2:(oh-ih)/2${text}`,
      "-q:v", "4", "-y",
      path.join(framesDir, `${String(i + 1).padStart(4, "0")}.jpg`),
    ]);
  });

  const perSheet = SHEET_COLS * SHEET_ROWS;
  const sheets = [];
  for (let s = 0; s * perSheet < times.length; s++) {
    const out = path.join(sheetsDir, `sheet-${String(s + 1).padStart(2, "0")}.jpg`);
    ffmpeg([
      "-start_number", String(s * perSheet + 1),
      "-i", path.join(framesDir, "%04d.jpg"),
      "-frames:v", "1",
      "-vf", `tile=${SHEET_COLS}x${Math.ceil(Math.min(perSheet, times.length - s * perSheet) / SHEET_COLS)}:padding=4:color=black`,
      "-q:v", "4", "-y", out,
    ]);
    sheets.push({
      file: path.relative(ROOT, out).replace(/\\/g, "/"),
      from: s * perSheet + 1,
      to: Math.min((s + 1) * perSheet, times.length),
    });
  }
  rmSync(framesDir, { recursive: true, force: true });
  return sheets;
};

// Loudness momentânea (EBU R128, janelas de 100 ms) → curva por segundo,
// picos (gritos, explosões) e silêncios (tempo morto ou pausa).
const loudness = (file, duration) => {
  const { stderr } = ffmpeg(["-i", file, "-vn", "-af", "ebur128", "-f", "null", "-"]);
  const points = [...stderr.matchAll(/t:\s*([\d.]+)\s+TARGET.*?M:\s*(-?[\d.]+|-inf)/g)].map((m) => ({
    t: +m[1],
    m: m[2] === "-inf" ? -120 : +m[2],
  }));
  const integrated = +(/I:\s+(-?[\d.]+) LUFS/.exec(stderr.split("Summary:").pop())?.[1] ?? -23);

  const perSecond = [];
  for (let s = 0; s < Math.ceil(duration); s++) {
    const win = points.filter((p) => p.t > s && p.t <= s + 1).map((p) => p.m);
    perSecond.push(win.length ? Math.max(...win) : -120);
  }

  // Relativo ao nível típico (mediana) do próprio vídeo: pico = bem acima do
  // normal; silêncio = bem abaixo.
  const typical = median(perSecond);
  const peakThreshold = Math.max(percentile(perSecond, 0.9), typical + 6);
  const silenceThreshold = typical - 15;
  const segments = (pred) => {
    const out = [];
    let start = null;
    perSecond.forEach((v, i) => {
      if (pred(v) && start === null) start = i;
      if ((!pred(v) || i === perSecond.length - 1) && start !== null) {
        const end = pred(v) ? i + 1 : i;
        out.push({ start, end, max: Math.max(...perSecond.slice(start, end)) });
        start = null;
      }
    });
    return out;
  };

  return {
    integrated,
    typical: round(typical, 1),
    peakThreshold: round(peakThreshold, 1),
    perSecond: perSecond.map((v) => round(v, 1)),
    peaks: segments((v) => v >= peakThreshold),
    silences: segments((v) => v <= silenceThreshold).filter((s) => s.end - s.start >= 2),
  };
};

const transcribeFile = async (file, { lang, model }) => {
  const whisper = await import("@remotion/whisper-webgpu");
  const support = await whisper.canUseWhisperWebGpu();
  if (!support.supported) {
    log(`transcrição pulada: ${support.detailedReason ?? "sem WebGPU"}`);
    return null;
  }
  const { stdout } = ffmpeg(
    ["-i", file, "-vn", "-ac", "1", "-ar", String(whisper.WHISPER_WEBGPU_SAMPLE_RATE), "-f", "f32le", "-"],
    { binary: true },
  );
  const channelWaveform = new Float32Array(stdout.buffer, stdout.byteOffset, stdout.byteLength / 4);
  const multilingual = !model.endsWith(".en");
  log(`transcrevendo com whisper "${model}" (${multilingual ? lang : "en"})...`);
  await whisper.downloadWhisperModel({ model });
  const result = await whisper.transcribe({
    channelWaveform,
    model,
    ...(multilingual ? { language: lang } : {}),
  });
  return whisper.toCaptions({ whisperWebGpuOutput: result }).captions;
};

// Legenda VTT do YouTube → Caption[] (remove tags e as linhas repetidas das auto-legendas).
const parseVtt = (vtt) => {
  const captions = [];
  let last = "";
  for (const block of vtt.split(/\r?\n\r?\n/)) {
    const m = /(\d+:\d+:[\d.]+) --> (\d+:\d+:[\d.]+)/.exec(block);
    if (!m) continue;
    const lines = block
      .split(/\r?\n/)
      .slice(block.split(/\r?\n/).findIndex((l) => l.includes("-->")) + 1)
      .map((l) => l.replace(/<[^>]+>/g, "").trim())
      .filter(Boolean);
    const text = lines.filter((l) => l !== last).join(" ").trim();
    if (lines.length) last = lines[lines.length - 1];
    if (!text) continue;
    const startMs = Math.round(parseTime(m[1]) * 1000);
    captions.push({ text, startMs, endMs: Math.round(parseTime(m[2]) * 1000), timestampMs: startMs, confidence: null });
  }
  return captions;
};

const LAUGH = /\b(k{3,}|(ha){2,}|(he){2,}|(rs){2,}|lol|lmao)\b|\[(risos|laughter|laughs)\]/i;

// Momentos candidatos: picos de áudio + risadas/exclamações na fala + rajadas de cortes.
const candidateMoments = ({ peaks, cuts, captions }) => {
  const moments = peaks.map((p) => ({ start: p.start, end: p.end, score: p.max, reasons: ["pico de áudio"] }));
  for (const c of captions ?? []) {
    const t = c.startMs / 1000;
    if (LAUGH.test(c.text) || /!{1,}/.test(c.text)) {
      const near = moments.find((m) => t >= m.start - 2 && t <= m.end + 2);
      if (near) {
        near.score += 6;
        near.reasons.push("risada/exclamação");
      } else {
        moments.push({ start: Math.floor(t), end: Math.ceil(c.endMs / 1000), score: -10, reasons: ["risada/exclamação"] });
      }
    }
  }
  for (let i = 0; i + 3 < cuts.length; i++) {
    if (cuts[i + 3] - cuts[i] < 2) {
      const near = moments.find((m) => cuts[i] >= m.start - 2 && cuts[i] <= m.end + 2);
      if (near && !near.reasons.includes("rajada de cortes")) {
        near.score += 3;
        near.reasons.push("rajada de cortes");
      }
    }
  }
  const textAround = (m) =>
    (captions ?? [])
      .filter((c) => c.startMs / 1000 >= m.start - 3 && c.startMs / 1000 <= m.end + 3)
      .map((c) => c.text.trim())
      .join(" ")
      .slice(0, 160);
  return moments
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .sort((a, b) => a.start - b.start)
    .map((m) => ({ ...m, speech: textAround(m) }));
};

const transcriptLines = (captions, offset) => {
  const lines = [];
  let cur = null;
  for (const c of captions) {
    const t = c.startMs / 1000;
    if (!cur || t - cur.start > 8 || /[.!?]$/.test(cur.text)) {
      if (cur) lines.push(cur);
      cur = { start: t, text: c.text.trim() };
    } else {
      cur.text += ` ${c.text.trim()}`;
    }
  }
  if (cur) lines.push(cur);
  return lines.map((l) => `[${fmt(l.start + offset)}] ${l.text}`).join("\n");
};

const writeDossier = (dir, d) => {
  const o = d.offset;
  const md = [];
  md.push(`# Dossiê: ${d.title}`);
  md.push("");
  md.push(`- Fonte: ${d.source}`);
  if (o) md.push(`- Trecho analisado começa em ${fmt(o)}; todos os tempos abaixo já são do vídeo original`);
  if (d.meta) md.push(`- Duração: ${fmt(d.meta.duration)} · ${d.meta.width}x${d.meta.height} · ${d.meta.fps} fps`);
  if (d.chapters?.length) {
    md.push("", "## Capítulos", ...d.chapters.map((c) => `- ${fmt(c.start_time)} ${c.title}`));
  }
  if (d.pace) {
    const s = d.pace.stats;
    md.push(
      "",
      "## Ritmo (cortes detectados)",
      `- ${s.shotCount} planos · ${s.cutsPerMinute} cortes/min`,
      `- Plano: média ${s.avgShot}s · mediana ${s.medianShot}s · mín ${s.minShot}s · máx ${s.maxShot}s`,
      `- Cortes por minuto ao longo do vídeo: ${s.cutsPerMinuteTimeline.join(" · ")}`,
    );
  }
  if (d.loud) {
    md.push(
      "",
      "## Áudio",
      `- Loudness integrada: ${d.loud.integrated} LUFS · nível típico: ${d.loud.typical} LUFS · limiar de pico: ${d.loud.peakThreshold} LUFS`,
      `- Silêncios ≥2s: ${d.loud.silences.map((s) => `${fmt(s.start + o)}–${fmt(s.end + o)}`).join(", ") || "nenhum"}`,
    );
  }
  if (d.moments?.length) {
    md.push("", "## Momentos candidatos", "| Tempo | Sinais | Fala |", "|---|---|---|");
    for (const m of d.moments) {
      md.push(`| ${fmt(m.start + o)}–${fmt(m.end + o)} | ${m.reasons.join(", ")} | ${m.speech.replace(/\|/g, "/")} |`);
    }
  }
  if (d.sheets?.length) {
    md.push(
      "",
      "## Contact sheets",
      `Grade ${SHEET_COLS}x${SHEET_ROWS}, 1 frame por plano (planos longos: 1 a cada ${MAX_GAP_SECONDS}s), cada um com #número e tempo.`,
      ...d.sheets.map((s) => `- ${s.file} (#${s.from}–#${s.to})`),
      "",
      "Frame em resolução cheia: `node scripts/analyze-media.mjs <fonte> --frame-at <tempo>`",
    );
  }
  if (d.description) md.push("", "## Descrição", d.description.slice(0, 1500));
  if (d.captions?.length) {
    md.push("", `## Transcrição (${d.captionSource})`, "", transcriptLines(d.captions, o));
  }
  writeFileSync(path.join(dir, "dossier.md"), md.join("\n") + "\n");
};

// ---------- orquestração ----------

const cacheDirFor = (key, kind) =>
  kind === "ref" ? path.join(OUT, "analysis", "_refs", key) : path.join(OUT, "analysis", opts.slug ?? "_sem-slug", key);

const analyzeFile = async (file, { key, kind, title, source, offset = 0, extra = {} }) => {
  const dir = cacheDirFor(key, kind);
  const done = path.join(dir, "dossier.md");
  if (existsSync(done) && !opts.force) {
    log(`cache: ${path.relative(ROOT, done)}`);
    return done;
  }
  mkdirSync(dir, { recursive: true });
  log(`analisando ${source}`);

  const meta = probe(file);
  writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2));

  log("detectando cortes...");
  const cuts = detectCuts(file);
  const pace = pacing(cuts, meta.duration);
  writeFileSync(path.join(dir, "cuts.json"), JSON.stringify({ offset, cuts, ...pace }, null, 2));

  log("gerando contact sheets...");
  const sheets = contactSheets(file, sampleTimes(pace.shots), dir, offset);

  let loud = null;
  if (meta.hasAudio) {
    log("medindo loudness...");
    loud = loudness(file, meta.duration);
    writeFileSync(path.join(dir, "loudness.json"), JSON.stringify({ offset, ...loud }, null, 2));
  }

  let captions = extra.captions ?? null;
  let captionSource = extra.captionSource ?? "whisper";
  if (!captions && meta.hasAudio && !opts["no-transcript"]) {
    captions = await transcribeFile(file, opts);
    captionSource = `whisper ${opts.model}`;
  }
  if (captions) writeFileSync(path.join(dir, "transcript.json"), JSON.stringify(captions, null, 2));

  const moments = loud ? candidateMoments({ peaks: loud.peaks, cuts, captions }) : [];
  writeDossier(dir, { title, source, offset, meta, pace, loud, sheets, moments, captions, captionSource, ...extra });
  return done;
};

const fileKey = (file) => {
  const st = statSync(file);
  const h = createHash("sha1").update(`${path.resolve(file)}|${st.size}|${st.mtimeMs}`).digest("hex").slice(0, 8);
  return `${path.parse(file).name}-${h}`;
};

const analyzeUrl = async (url, { section, subsOnly } = {}) => {
  const yt = ytDlp();
  const info = JSON.parse(yt(["-J", "--no-playlist", url]));
  const [a, b] = section ? section.split("-").map(parseTime) : [0, null];
  const key = `yt-${info.id}${section ? `-${a}-${b}` : ""}${subsOnly ? "-subs" : ""}`;
  const dir = cacheDirFor(key, "ref");
  if (existsSync(path.join(dir, "dossier.md")) && !opts.force) {
    log(`cache: ${path.relative(ROOT, path.join(dir, "dossier.md"))}`);
    return path.join(dir, "dossier.md");
  }
  mkdirSync(dir, { recursive: true });

  // Legenda do YouTube (manual ou automática), se houver: dispensa o whisper.
  // Só idiomas originais (sem ".*", que puxa dezenas de auto-traduções e leva 429).
  const subLangs = [...new Set([opts.lang, `${opts.lang}-orig`, `${opts.lang}-BR`, "en", "en-orig"])];
  try {
    yt([
      "--skip-download", "--no-playlist", "--write-subs", "--write-auto-subs",
      "--sub-langs", subLangs.join(","), "--sub-format", "vtt",
      "-o", path.join(dir, "subs"), url,
    ]);
  } catch (e) {
    log(`sem legenda do YouTube (${e.message.split("\n").pop()}); vai usar whisper`);
  }
  const vtts = readdirSync(dir).filter((f) => f.endsWith(".vtt"));
  const vtt = vtts.find((f) => f.includes(`.${opts.lang}`)) ?? vtts[0];
  let captions = vtt ? parseVtt(readFileSync(path.join(dir, vtt), "utf8")) : null;
  if (captions && section) {
    captions = captions
      .filter((c) => c.startMs / 1000 >= a && (b === null || c.startMs / 1000 <= b))
      .map((c) => ({ ...c, startMs: c.startMs - a * 1000, endMs: c.endMs - a * 1000, timestampMs: c.timestampMs - a * 1000 }));
  }
  const extra = {
    title: info.title,
    chapters: info.chapters,
    description: info.description,
    captions,
    captionSource: vtt ? `legenda do YouTube (${vtt.split(".").slice(-2, -1)[0]})` : undefined,
  };

  if (subsOnly) {
    writeDossier(dir, { source: url, offset: a, meta: { duration: info.duration, width: info.width, height: info.height, fps: info.fps }, ...extra });
    return path.join(dir, "dossier.md");
  }

  const cacheDir = path.join(OUT, "cache", "refs");
  mkdirSync(cacheDir, { recursive: true });
  const mp4 = path.join(cacheDir, `${key}.mp4`);
  if (!existsSync(mp4)) {
    log(`baixando ${section ? `trecho ${section} de ` : ""}${info.title} (≤480p)...`);
    yt([
      "--no-playlist", "-f", "bv*[height<=480]+ba/b[height<=480]/wv*+ba/w",
      "--merge-output-format", "mp4", "--ffmpeg-location", FFMPEG,
      ...(section ? ["--download-sections", `*${section}`] : []),
      "-o", mp4, url,
    ]);
  }
  const dossier = await analyzeFile(mp4, { key, kind: "ref", title: info.title, source: url, offset: a, extra });
  if (!opts.keep) rmSync(mp4, { force: true });
  return dossier;
};

const parseLinks = (file) =>
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*/, "").trim())
    .filter(Boolean)
    .map((l) => {
      const [url, ...rest] = l.split(/\s+/);
      return {
        url,
        section: rest.find((r) => /^[\d:.]+-[\d:.]+$/.test(r)),
        subsOnly: rest.includes("subs-only"),
      };
    });

const displayPath = (p) => {
  const rel = path.relative(ROOT, p);
  return (rel.startsWith("..") ? path.resolve(p) : rel).replace(/\\/g, "/");
};

const isUrl = (s) => /^https?:\/\//.test(s);

const kindFor = (p) => opts.kind ?? (isUrl(p) || /[\\/]references([\\/]|$)/.test(path.resolve(p)) ? "ref" : "footage");

const frameAt = (target) => {
  const t = parseTime(opts["frame-at"]);
  const dir = path.join(OUT, "frames");
  mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${path.parse(target).name}-${fmt(t).replace(/[:.]/g, "_")}.jpg`);
  ffmpeg(["-ss", String(t), "-i", target, "-frames:v", "1", "-q:v", "2", "-y", out]);
  console.log(path.relative(ROOT, out).replace(/\\/g, "/"));
};

const main = async () => {
  const target = positionals[0];
  if (!target) {
    console.error(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 20).join("\n"));
    process.exit(1);
  }

  if (opts["frame-at"]) {
    if (isUrl(target)) throw new Error("--frame-at precisa de arquivo local (use --keep ao analisar a URL).");
    return frameAt(target);
  }

  const results = [];
  const runOne = async (p) => {
    if (isUrl(p)) {
      results.push(await analyzeUrl(p, { section: opts.section, subsOnly: opts["subs-only"] }));
    } else if (path.basename(p) === "links.txt") {
      for (const link of parseLinks(p)) {
        try {
          results.push(await analyzeUrl(link.url, link));
        } catch (e) {
          log(`ERRO em ${link.url}: ${e.message}`);
        }
      }
    } else if (statSync(p).isDirectory()) {
      for (const f of readdirSync(p).sort()) {
        const full = path.join(p, f);
        if (MEDIA_EXT.has(path.extname(f).toLowerCase()) || f === "links.txt") await runOne(full);
      }
    } else {
      const section = opts.section ? opts.section.split("-").map(parseTime) : null;
      let file = p;
      let offset = 0;
      if (section) {
        file = path.join(OUT, "cache", `${path.parse(p).name}-${section.join("-")}.mp4`);
        mkdirSync(path.dirname(file), { recursive: true });
        ffmpeg(["-ss", String(section[0]), "-to", String(section[1]), "-i", p, "-c", "copy", "-y", file]);
        offset = section[0];
      }
      const key = fileKey(p) + (section ? `-${section.join("-")}` : "");
      results.push(await analyzeFile(file, { key, kind: kindFor(p), title: path.basename(p), source: displayPath(p), offset }));
      if (section) rmSync(file, { force: true });
    }
  };

  await runOne(target);
  console.log(results.map((r) => path.relative(ROOT, r).replace(/\\/g, "/")).join("\n"));
};

main().then(
  () => process.exit(0),
  (e) => {
    console.error(`ERRO: ${e.message}`);
    process.exit(1);
  },
);
