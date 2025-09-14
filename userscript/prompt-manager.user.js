// ==UserScript==
// @name         Prompt Manager Rewriter (Local API, v1)
// @namespace    https://tampermonkey.net/
// @version      1.0
// @description  Rewrite ChatGPT prompts via your local FastAPI Prompt Manager
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @connect      127.0.0.1
// @connect      localhost
// ==/UserScript==

(function () {
  'use strict';

  // Use the versioned endpoint
  const ENDPOINT = "http://127.0.0.1:8000/api/v1/rewrite";
  const HOTKEY = "r"; // Alt+R

  // --- UI: little toolbar bottom-right
  const bar = document.createElement("div");
  bar.style.cssText = `
    position: fixed; right: 14px; bottom: 14px; z-index: 99999;
    display: flex; gap: 6px; align-items: center;
    background: #fff; border: 1px solid #dadce0; border-radius: 10px; padding: 6px 8px;
    box-shadow: 0 4px 14px rgba(0,0,0,.12); font-size: 12px;
  `;

  const modeSel = document.createElement("select");
  ["plain","study_notes","resume"].forEach(m => {
    const o = document.createElement("option"); o.value = o.textContent = m; modeSel.appendChild(o);
  });

  const autoSend = document.createElement("input");
  autoSend.type = "checkbox"; autoSend.title = "Auto-send after rewrite";

  const btn = document.createElement("button");
  btn.textContent = "Rewrite";
  btn.style.cssText = `padding:4px 8px;border:1px solid #ccc;border-radius:6px;background:#f7f7f8;cursor:pointer;`;

  const label1 = document.createElement("span"); label1.textContent = "mode:";
  const label2 = document.createElement("span"); label2.textContent = "auto-send:";

  bar.append(label1, modeSel, label2, autoSend, btn);
  document.body.appendChild(bar);

  // Primary textarea
  function findBox() {
    return (
      document.querySelector('textarea[data-testid="prompt-textarea"]') ||
      document.querySelector("textarea") ||
      document.querySelector('[contenteditable="true"]')
    );
  }

  function getVal(el) {
    return !el ? "" : el.tagName === "TEXTAREA" ? el.value : (el.textContent || "");
  }
  function setVal(el, text) {
    if (!el) return;
    if (el.tagName === "TEXTAREA") el.value = text; else el.textContent = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function toast(msg, ok = false) {
    const t = document.createElement("div");
    t.textContent = msg;
    Object.assign(t.style, {
      position: "fixed", right: "16px", bottom: "64px", zIndex: 99999,
      background: ok ? "#e6ffe6" : "#ffe8e8", border: `1px solid ${ok ? "#6c6" : "#f66"}`,
      padding: "8px 10px", borderRadius: "8px", fontSize: "12px",
      boxShadow: "0 2px 6px rgba(0,0,0,.12)", whiteSpace: "pre-wrap", maxWidth: "42ch",
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  function rewrite() {
    const el = findBox();
    if (!el) return toast("Prompt box not found");
    const original = getVal(el).trim();
    if (!original) return toast("Type something first");

    const prev = btn.textContent;
    btn.textContent = "Rewriting…"; btn.disabled = true;
    setVal(el, "⏳ Rewriting…");

    GM_xmlhttpRequest({
      method: "POST",
      url: ENDPOINT,
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        prompt: original,
        mode: modeSel.value,
        prefer_numbers: true
      }),
      onerror: () => {
        setVal(el, original); toast("Local API not reachable (127.0.0.1:8000?)");
        btn.textContent = prev; btn.disabled = false;
      },
      ontimeout: () => {
        setVal(el, original); toast("Request timed out");
        btn.textContent = prev; btn.disabled = false;
      },
      onload: (res) => {
        try {
          if (res.status !== 200) {
            setVal(el, original);
            toast(`Server ${res.status}:\n${res.responseText?.slice(0,200) || ""}`);
            return;
          }
          const data = JSON.parse(res.responseText || "{}");
          let rw = data.rewritten ?? data;
          if (rw && typeof rw === "object") {
            const order = ["Role","Goal","Task","Context","Output","Rules"];
            const parts = [];
            for (const k of order) if (rw[k]) parts.push(`${k}: ${rw[k]}`);
            if (Array.isArray(rw.questions) && rw.questions.length)
              parts.push("Questions:\n" + rw.questions.join("\n"));
            rw = parts.join("\n\n");
          }
          setVal(el, rw || original);
          toast("Rewritten ✓", true);
          if (autoSend.checked) {
            // hit the native send button if present
            const send = document.querySelector('button[data-testid="send-button"]');
            if (send) send.click();
          }
        } catch (e) {
          setVal(el, original); toast("Parse error: " + e.message);
        } finally {
          btn.textContent = prev; btn.disabled = false;
        }
      }
    });
  }

  btn.onclick = rewrite;
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "r") { e.preventDefault(); rewrite(); }
  });

  // Loaded badge
  const loaded = document.createElement("div");
  loaded.textContent = "✅ Prompt Manager (Alt+R)";
  Object.assign(loaded.style, {
    position: "fixed", left: "12px", bottom: "12px", zIndex: 99999,
    padding: "6px 10px", background: "#e6ffe6", border: "1px solid #6c6", borderRadius: "6px",
    fontSize: "12px",
  });
  document.body.appendChild(loaded);
  setTimeout(() => loaded.remove(), 1600);
})();
