// ==UserScript==
// @name         Prompt Manager Rewriter (Local API) + Modes + Styles
// @namespace    https://tampermonkey.net/
// @version      1.2
// @description  Rewrite ChatGPT prompts via your local FastAPI Prompt Manager with 10 profiles, 10 styles, clean formatting, and resilient UI.
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @connect      127.0.0.1
// @connect      localhost
// ==/UserScript==

(function () {
  'use strict';

  const ENDPOINT = "http://127.0.0.1:8000/rewrite";
  const HOTKEY   = "r";
  const STORAGE_MODE  = "pmr_active_mode_v1";
  const STORAGE_STYLE = "pmr_active_style_v1";

  const MODES = [
    { key: "secplus_notes", label: "Security+ Study Notes", template:
`Role: Cybersecurity Educator
Goal: Produce concise Security+ study notes.
Task: Summarize key concepts as bullet points with brief definitions and 1 example each.
Output: Bulleted list, short sentences, include “Why it matters”.
Rules: Be clear, avoid fluff; keep list numbering simple (1 2 3 4 5).
Prompt: ` },
    { key: "exec_brief", label: "Executive Brief", template:
`Role: Technical Advisor
Goal: Brief a non-technical exec.
Task: 1 paragraph (4–6 sentences) + 3 bullets: Risks, Impact, Recommendation.
Rules: No jargon; focus on business outcomes; number lists plainly.
Prompt: ` },
    { key: "deep_explainer", label: "Deep Technical Explainer", template:
`Role: Senior Engineer
Goal: Explain deeply with clarity.
Task: Provide step-by-step breakdown, comparisons, pros/cons, pitfalls, and a short checklist.
Rules: Be precise; include commands/configs if relevant; number lists plainly.
Prompt: ` },
    { key: "troubleshoot_playbook", label: "Troubleshooting Playbook", template:
`Role: Incident Responder
Goal: Create a troubleshooting playbook.
Task: Sections -> Symptoms, Likely Causes, Diagnostics (commands/tools), Remediation, Prevention.
Rules: Actionable and concise; number steps plainly; include example outputs where useful.
Prompt: ` },
    { key: "flashcards", label: "Flashcards (Q/A)", template:
`Role: Tutor
Goal: Convert into flashcards.
Task: Produce 8–12 Q/A pairs; each A is 1–2 lines; include 1 “trick question” if appropriate.
Rules: Keep direct and study-ready; number cards plainly.
Prompt: ` },
    { key: "interview_answer", label: "Interview Answer (STAR)", template:
`Role: Career Coach
Goal: Craft an interview answer in STAR format.
Task: Situation (1–2 lines), Task (1 line), Actions (bullets), Result (metrics if possible).
Rules: Confident but concise; number lists plainly.
Prompt: ` },
    { key: "stakeholder_email", label: "Stakeholder Email", template:
`Role: Professional Communicator
Goal: Turn into a clear email.
Task: Subject, Greeting, 3–5 sentence body, bullets for options/next steps, Sign-off.
Rules: Courteous tone; specific ask; number lists plainly.
Prompt: ` },
    { key: "linkedin_post", label: "LinkedIn Post", template:
`Role: Content Creator
Goal: Create a LinkedIn post.
Task: Hook (1 line), Value (3–5 bullets), CTA (1 line), ≤3 relevant hashtags.
Rules: Friendly, useful, no hype; number lists plainly.
Prompt: ` },
    { key: "resume_bullet", label: "Resume Bullet Optimizer", template:
`Role: Resume Editor
Goal: Convert into 3 quantified bullet points.
Task: Action verb + task + metric/impact; keep each to 1 line.
Rules: Focus on outcomes; number bullets plainly.
Prompt: ` },
    { key: "git_commit_pr", label: "Git Commit & PR", template:
`Role: Software Engineer
Goal: Generate a commit subject & PR body.
Task: Commit (imperative 50-char-ish), PR sections: Context, Changes, Tests, Risks, Rollback.
Rules: Clear scope; number lists plainly.
Prompt: ` },
  ];

  const STYLES = [
    { key: "plain",          label: "Plain",            instructions: `Use a neutral style. Average sentence length. Avoid flourish.` },
    { key: "concise",        label: "Concise",          instructions: `Keep sentences short. Remove filler. Prefer bullets when possible.` },
    { key: "academic",       label: "Academic",         instructions: `Formal tone, precise terminology, cautious claims, cite concepts not sources.` },
    { key: "friendly",       label: "Friendly",         instructions: `Warm, approachable tone. Use everyday language. Encourage without hype.` },
    { key: "authoritative",  label: "Authoritative",    instructions: `Confident, directive voice. Use decisive phrasing and clear recommendations.` },
    { key: "exam_ready",     label: "Exam-Ready",       instructions: `Prioritize definitions, key facts, and common pitfalls. Highlight “gotchas”.` },
    { key: "beginner",       label: "Beginner-Friendly",instructions: `Assume zero prior knowledge. Define terms on first use. Avoid acronyms unless defined.` },
    { key: "bullet_heavy",   label: "Bullet-Heavy",     instructions: `Prefer bulleted lists over paragraphs. Keep each bullet ≤ 1 line.` },
    { key: "storytelling",   label: "Storytelling",     instructions: `Open with a short scenario; then distill lessons into bullets.` },
    { key: "clinical",       label: "Clinical",         instructions: `Dry, objective, no adjectives. Just facts, steps, and outcomes.` },
  ];

  const $ = (sel, root=document) => root.querySelector(sel);

  function findPromptBox() {
    return $('textarea[data-testid="prompt-textarea"]') || $('textarea') || $('[contenteditable="true"]');
  }
  function getValue(el) { return !el ? "" : (el.tagName === "TEXTAREA" ? el.value : (el.textContent || "")); }
  function setValue(el, text) {
    if (!el) return;
    if (el.tagName === "TEXTAREA") el.value = text; else el.textContent = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function toast(msg, ok=false, ms=2400) {
    const t = document.createElement("div");
    t.textContent = msg;
    Object.assign(t.style, {
      position:"fixed", right:"16px", bottom:"16px", zIndex:2147483647, padding:"8px 10px",
      background: ok ? "#e6ffe6" : "#ffe8e8", border:`1px solid ${ok ? "#6c6" : "#f66"}`,
      borderRadius:"8px", fontSize:"12px", boxShadow:"0 2px 8px rgba(0,0,0,.1)", maxWidth:"42ch", whiteSpace:"pre-wrap", pointerEvents:"none",
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }
  function cleanFormat(obj) {
    const prefer = ["Role","Goal","Task","Context","Output","Key Features","Benefits","Rules","Questions","Notes","Score"];
    const lines = [];
    for (const key of prefer) {
      if (obj[key] == null) continue;
      const val = obj[key];
      if (Array.isArray(val)) { lines.push(`${key}:`); for (const v of val) lines.push(`- ${String(v)}`); }
      else if (typeof val === "object") { lines.push(`${key}:`); for (const [k2,v2] of Object.entries(val)) lines.push(`- ${k2}: ${String(v2)}`); }
      else { lines.push(`${key}: ${String(val)}`); }
      lines.push("");
    }
    for (const [k,v] of Object.entries(obj)) {
      if (prefer.includes(k) || v == null) continue;
      if (typeof v === "object") { lines.push(`${k}:`); for (const [k2,v2] of Object.entries(v)) lines.push(`- ${k2}: ${String(v2)}`); }
      else { lines.push(`${k}: ${String(v)}`); }
      lines.push("");
    }
    const out = lines.join("\n").trim();
    return out || JSON.stringify(obj, null, 2);
  }
  function loadMode()  { return localStorage.getItem(STORAGE_MODE)  || MODES[0].key; }
  function loadStyle() { return localStorage.getItem(STORAGE_STYLE) || STYLES[0].key; }
  function saveMode(k)  { localStorage.setItem(STORAGE_MODE,  k); }
  function saveStyle(k) { localStorage.setItem(STORAGE_STYLE, k); }
  function composePayload(userText, modeKey, styleKey) {
    const m = MODES.find(x => x.key === modeKey)   || MODES[0];
    const s = STYLES.find(x => x.key === styleKey) || STYLES[0];
    const styleBlock = `\nStyle:\n${s.instructions}\n\n`;
    return m.template + styleBlock + userText;
  }

  let uiMounted = false, btn, selMode, selStyle;
  function buildUI() {
    if (uiMounted) return; uiMounted = true;
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      position:"fixed", right:"20px", bottom:"80px", zIndex:2147483647, display:"flex", gap:"8px", alignItems:"center",
      background:"white", border:"1px solid #ddd", borderRadius:"10px", padding:"6px 8px", boxShadow:"0 2px 10px rgba(0,0,0,.08)",
    });
    selMode = document.createElement("select");
    selMode.title = "Rewrite Mode";
    selMode.style.cssText = "font-size:12px; padding:4px; border-radius:6px;";
    for (const m of MODES) { const opt = document.createElement("option"); opt.value = m.key; opt.textContent = m.label; selMode.appendChild(opt); }
    selMode.value = loadMode(); selMode.onchange = () => saveMode(selMode.value);
    selStyle = document.createElement("select");
    selStyle.title = "Style / Tone";
    selStyle.style.cssText = "font-size:12px; padding:4px; border-radius:6px;";
    for (const s of STYLES) { const opt = document.createElement("option"); opt.value = s.key; opt.textContent = s.label; selStyle.appendChild(opt); }
    selStyle.value = loadStyle(); selStyle.onchange = () => saveStyle(selStyle.value);
    btn = document.createElement("button");
    btn.textContent = "Rewrite";
    btn.title = "Rewrite prompt via local API (Alt+R)";
    btn.style.cssText = "font-size:12px; padding:6px 10px; cursor:pointer; background:#0b5fff; color:white; border:none; border-radius:6px;";
    btn.onclick = rewrite;
    wrap.appendChild(selMode); wrap.appendChild(selStyle); wrap.appendChild(btn);
    document.body.appendChild(wrap);
    const loaded = document.createElement("div");
    loaded.textContent = "✅ Prompt Manager ready (Alt+R)";
    Object.assign(loaded.style, { position:"fixed", left:"12px", bottom:"12px", zIndex:2147483647, padding:"6px 10px", background:"#e6ffe6", border:"1px solid #6c6", borderRadius:"6px", fontSize:"12px" });
    document.body.appendChild(loaded); setTimeout(() => loaded.remove(), 1600);
  }
  const mo = new MutationObserver(() => { if (!document.body.contains(btn)) uiMounted = false; buildUI(); });
  mo.observe(document.documentElement, { childList:true, subtree:true });
  buildUI();
  document.addEventListener("keydown", (e) => { if (e.altKey && e.key.toLowerCase() === HOTKEY) { e.preventDefault(); rewrite(); } });

  function rewrite() {
    const el = findPromptBox(); if (!el) return toast("Prompt box not found");
    const original = getValue(el).trim(); if (!original) return toast("Type something first");
    const activeMode  = selMode  ? selMode.value  : loadMode();
    const activeStyle = selStyle ? selStyle.value : loadStyle();
    const payloadText = composePayload(original, activeMode, activeStyle);
    const prevTxt = btn.textContent; btn.textContent = "Rewriting…"; btn.disabled = true; setValue(el, "⏳ Rewriting…");
    GM_xmlhttpRequest({
      method:"POST", url:ENDPOINT, headers:{ "Content-Type":"application/json" }, data: JSON.stringify({ prompt: payloadText, prefer_numbers: true }), timeout:20000,
      ontimeout: () => { toast("Request timed out"); setValue(el, original); btn.textContent = prevTxt; btn.disabled = false; },
      onerror:   () => { toast("Could not reach local API (is it running on 127.0.0.1:8000?)"); setValue(el, original); btn.textContent = prevTxt; btn.disabled = false; },
      onload: (res) => {
        try {
          if (res.status !== 200) { const snippet = (res.responseText || "").slice(0, 240); toast(`Server ${res.status}:\n${snippet}`); setValue(el, original); return; }
          const data = JSON.parse(res.responseText || "{}");
          let rewritten = data.rewritten ?? data;
          if (rewritten && typeof rewritten === "object") rewritten = cleanFormat(rewritten);
          else if (typeof rewritten !== "string") rewritten = String(rewritten || "");
          if (!rewritten.trim()) { setValue(el, original); toast("No rewritten text returned"); return; }
          const finalText = `${rewritten}\n\nRules: Number lists plainly like "1 2 3 4 5".`;
          setValue(el, finalText); toast("Rewritten ✓", true);
        } catch (e) { toast("Parse error: " + e.message); setValue(el, original); }
        finally { btn.textContent = prevTxt; btn.disabled = false; }
      }
    });
  }
})();

