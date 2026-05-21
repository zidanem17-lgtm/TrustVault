import { useState, useRef, useEffect, useCallback } from "react";
import {
  Scale, Shield, FileText, Activity,
  Bot, ChevronLeft, Download, RotateCcw,
  ArrowUp, AlertTriangle, RefreshCw,
} from "lucide-react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg:        "#f4f4f9",
  card:      "#ffffff",
  s1:        "rgba(0,0,0,0.04)",
  s2:        "rgba(0,0,0,0.07)",
  b1:        "rgba(0,0,0,0.08)",
  t1:        "#111128",
  t2:        "#606080",
  t3:        "#a0a0b8",
  shadow:    "0 2px 20px rgba(0,0,0,0.07)",
  shadowHov: "0 8px 40px rgba(0,0,0,0.13)",
  ui:        "'Outfit', sans-serif",
  mono:      "'JetBrains Mono', monospace",
  doc:       "'Lora', serif",
  disp:      "'Instrument Serif', serif",
};

// ─── DOCUMENT CONFIG ──────────────────────────────────────────────────────────
const DOCS = {
  will: {
    name: "Last Will & Testament",
    Icon: Scale,
    color: "#0891b2", from: "#0891b2", to: "#4f46e5",
    light: "#e0f7fb",
    desc: "Declare your final wishes, appoint an executor, and ensure your estate reaches the right hands.",
    reqs: [
      "Full legal name and state",
      "Executor (primary and backup)",
      "Spouse and children",
      "Beneficiaries and shares",
      "Guardian for minor children",
      "Specific property bequests",
      "Residuary estate plan",
      "Funeral and burial wishes",
    ],
  },
  trust: {
    name: "Revocable Living Trust",
    Icon: Shield,
    color: "#059669", from: "#059669", to: "#0891b2",
    light: "#d1fae5",
    desc: "Bypass probate, maintain privacy, and keep full control of your estate.",
    reqs: [
      "Grantor full legal name",
      "Trust name",
      "Trustee and successor",
      "Beneficiaries and terms",
      "Assets to transfer in",
      "Incapacity provisions",
      "Amendment rights",
    ],
  },
  poa: {
    name: "Power of Attorney",
    Icon: FileText,
    color: "#7c3aed", from: "#7c3aed", to: "#db2777",
    light: "#ede9fe",
    desc: "Authorize a trusted agent to manage your financial and legal affairs.",
    reqs: [
      "Principal name and address",
      "Agent and relationship",
      "Alternate agent",
      "Scope of authority",
      "Specific powers granted",
      "Durable or springing",
      "Effective date and expiration",
    ],
  },
  healthcare: {
    name: "Healthcare Directive",
    Icon: Activity,
    color: "#ea580c", from: "#ea580c", to: "#dc2626",
    light: "#ffedd5",
    desc: "Appoint a healthcare proxy and document your medical care preferences.",
    reqs: [
      "Principal full name",
      "Healthcare agent and backup",
      "Life-sustaining treatment",
      "CPR preferences",
      "Artificial nutrition",
      "Pain management",
      "Organ donation wishes",
      "Special instructions",
    ],
  },
};

// ─── PROMPTS ──────────────────────────────────────────────────────────────────
const SEED = "Please begin the interview.";

function buildSystem(t) {
  const lines = [
    `You are a compassionate estate planning attorney assistant.`,
    `You are helping the user create a ${DOCS[t].name}.`,
    `Ask exactly ONE question per message. Be warm and empathetic.`,
    `Collect these items one by one:`,
    ...DOCS[t].reqs.map((r, i) => `${i + 1}. ${r}`),
    `When you have collected everything, end your final message with [[DONE]].`,
    `Start with a warm greeting and ask for their full legal name.`,
  ];
  return lines.join("\n");
}

function buildDocPrompt(t) {
  return (
    `Based on our interview, draft a complete ${DOCS[t].name} using standard US legal structure. ` +
    `Include all standard clauses. Use [SIGNATURE LINE], [DATE], [WITNESS], [NOTARY] placeholders. ` +
    `Output ONLY the document text starting with the title.`
  );
}

// ─── API — routed through Express proxy (/api/claude) ─────────────────────────
async function callClaude(messages, system) {
  const payload = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages,
  };
  if (system) payload.system = system;

  let res, data;
  try {
    res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    data = await res.json();
  } catch (netErr) {
    throw new Error(`Network error: ${netErr.message}`);
  }

  if (!res.ok) {
    const detail = data?.error?.message ?? `HTTP ${res.status} — ${JSON.stringify(data).slice(0, 200)}`;
    throw new Error(detail);
  }

  const text = data?.content?.[0]?.text;
  if (!text) throw new Error(`Unexpected response shape: ${JSON.stringify(data).slice(0, 200)}`);
  return text;
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Chip({ children, color }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: T.mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
      color: color || T.t2,
      background: color ? `${color}14` : T.s1,
      border: `1px solid ${color ? `${color}30` : T.b1}`,
      borderRadius: 100, padding: "3px 11px",
    }}>
      {children}
    </span>
  );
}

function Hr() {
  return <div style={{ height: 1, background: T.b1 }} />;
}

function Bg() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: T.bg }} />
      <div style={{ position: "absolute", top: "-10%", left: "20%", width: "55vw", height: "55vh", background: "radial-gradient(ellipse,rgba(79,70,229,0.06),transparent 65%)", filter: "blur(60px)" }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "10%", width: "45vw", height: "45vh", background: "radial-gradient(ellipse,rgba(8,145,178,0.05),transparent 65%)", filter: "blur(60px)" }} />
      <div style={{ position: "absolute", top: "40%", left: "-5%", width: "30vw", height: "30vh", background: "radial-gradient(ellipse,rgba(5,150,105,0.04),transparent 65%)", filter: "blur(50px)" }} />
    </div>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
function DocCard({ id, doc, delay, onSelect }) {
  const [hov, setHov] = useState(false);
  const { Icon } = doc;
  return (
    <div
      className="tv-up"
      onClick={() => onSelect(id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        animationDelay: `${delay}ms`, opacity: 0,
        background: T.card,
        border: `1px solid ${hov ? `${doc.color}40` : T.b1}`,
        borderRadius: 20, padding: 28, position: "relative", overflow: "hidden",
        boxShadow: hov ? T.shadowHov : T.shadow, cursor: "pointer",
        transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s, border-color 0.2s",
        transform: hov ? "translateY(-4px)" : "translateY(0)",
      }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: `radial-gradient(circle at top right,${doc.color}10,transparent 70%)`, opacity: hov ? 1 : 0, transition: "opacity 0.3s" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, marginBottom: 20, background: doc.light, border: `1px solid ${doc.color}30`, transition: "transform 0.2s", transform: hov ? "scale(1.06)" : "scale(1)" }}>
          <Icon size={19} color={doc.color} strokeWidth={1.8} />
        </div>
        <h3 style={{ fontFamily: T.ui, fontWeight: 700, fontSize: 16, color: T.t1, marginBottom: 8 }}>{doc.name}</h3>
        <p style={{ fontFamily: T.ui, fontSize: 13, color: T.t2, lineHeight: 1.7, marginBottom: 20 }}>{doc.desc}</p>
        <Hr />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, margin: "16px 0 22px" }}>
          {doc.reqs.slice(0, 3).map((r, j) => (
            <span key={j} style={{ fontFamily: T.mono, fontSize: 10, color: T.t3, background: T.s1, border: `1px solid ${T.b1}`, borderRadius: 6, padding: "3px 8px" }}>
              {r.split(" ").slice(0, 3).join(" ")}
            </span>
          ))}
          <span style={{ fontFamily: T.mono, fontSize: 10, color: T.t3, padding: "3px 6px" }}>+{doc.reqs.length - 3}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(id); }}
          style={{ width: "100%", padding: "11px 0", borderRadius: 100, cursor: "pointer", background: hov ? `linear-gradient(135deg,${doc.from},${doc.to})` : T.s1, border: hov ? "none" : `1px solid ${T.b1}`, color: hov ? "#ffffff" : T.t2, fontFamily: T.ui, fontWeight: 600, fontSize: 13, letterSpacing: "0.03em", transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)", boxShadow: hov ? `0 4px 16px ${doc.color}30` : "none" }}
        >
          {hov ? "Start Interview →" : "Begin"}
        </button>
      </div>
    </div>
  );
}

function HomeScreen({ onSelect }) {
  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 20px 90px" }}>
      <div className="tv-up" style={{ textAlign: "center", marginBottom: 60 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          <Chip>Estate Planning</Chip>
          <Chip color="#0891b2">AI-Powered</Chip>
        </div>
        <h1 style={{ fontFamily: T.disp, fontStyle: "italic", fontSize: "clamp(48px,7vw,84px)", fontWeight: 400, lineHeight: 1, background: "linear-gradient(140deg,#111128 20%,#4f46e5 90%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", letterSpacing: "-0.015em", marginBottom: 20 }}>
          TrustVault
        </h1>
        <p style={{ fontFamily: T.ui, fontSize: 17, color: T.t2, maxWidth: 420, lineHeight: 1.75, margin: "0 auto 28px" }}>
          Create legally structured estate documents through a guided AI conversation.
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 100, padding: "7px 16px" }}>
          <AlertTriangle size={11} color="#b45309" />
          <span style={{ fontFamily: T.mono, fontSize: 10, color: "#b45309", letterSpacing: "0.06em" }}>
            NOT LEGAL ADVICE · CONSULT AN ATTORNEY BEFORE EXECUTION
          </span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(255px,1fr))", gap: 16, width: "100%", maxWidth: 940 }}>
        {Object.entries(DOCS).map(([id, doc], i) => (
          <DocCard key={id} id={id} doc={doc} delay={i * 70} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

// ─── CHAT SCREEN ──────────────────────────────────────────────────────────────
function AiAvatar({ doc }) {
  return (
    <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: doc.light, border: `1px solid ${doc.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Bot size={15} color={doc.color} strokeWidth={1.6} />
    </div>
  );
}

function TypingDots({ color }) {
  return (
    <div style={{ display: "flex", gap: 5, padding: "13px 16px", alignItems: "center" }}>
      <div className="tv-d1" style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      <div className="tv-d2" style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      <div className="tv-d3" style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
    </div>
  );
}

function ChatScreen({ type, msgs, busy, ready, err, input, setInput, onSend, onGenerate, onRetry, onBack }) {
  const doc = DOCS[type];
  const endRef = useRef(null);
  const inpRef = useRef(null);
  const userCount = msgs.filter(m => m.role === "user").length;
  const pct = Math.min(100, Math.round((userCount / doc.reqs.length) * 100));

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy, err]);
  useEffect(() => { if (!busy) inpRef.current?.focus(); }, [busy]);

  return (
    <div style={{ position: "relative", zIndex: 1, height: "100vh", display: "flex", flexDirection: "column", maxWidth: 760, margin: "0 auto", padding: "0 16px" }}>
      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: T.card, border: `1px solid ${T.b1}`, color: T.t2, width: 36, height: 36, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: T.shadow }}>
            <ChevronLeft size={17} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: doc.color }} />
            <span style={{ fontFamily: T.ui, fontWeight: 600, fontSize: 15, color: T.t1 }}>{doc.name}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.card, border: `1px solid ${T.b1}`, borderRadius: 100, padding: "6px 14px", boxShadow: T.shadow }}>
            <div style={{ width: 72, height: 3, background: T.b1, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${doc.from},${doc.to})`, transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)", borderRadius: 2 }} />
            </div>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.t3 }}>{pct}%</span>
          </div>
          {ready && (
            <button className="tv-sc" onClick={onGenerate} style={{ padding: "8px 18px", borderRadius: 100, background: `linear-gradient(135deg,${doc.from},${doc.to})`, color: "#fff", fontFamily: T.ui, fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", boxShadow: `0 4px 16px ${doc.color}35` }}>
              Generate Document
            </button>
          )}
        </div>
      </div>
      <Hr />

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} className="tv-msg" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 10, alignItems: "flex-end" }}>
            {m.role === "assistant" && <AiAvatar doc={doc} />}
            <div style={{ maxWidth: "70%", background: m.role === "user" ? `linear-gradient(135deg,${doc.from},${doc.to})` : T.card, border: m.role === "user" ? "none" : `1px solid ${T.b1}`, borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px", padding: "12px 16px", boxShadow: m.role === "user" ? `0 2px 12px ${doc.color}30` : T.shadow }}>
              <p style={{ fontFamily: T.ui, fontSize: 14, color: m.role === "user" ? "#ffffff" : T.t1, lineHeight: 1.7 }}>{m.content}</p>
            </div>
          </div>
        ))}

        {busy && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
            <AiAvatar doc={doc} />
            <div style={{ background: T.card, border: `1px solid ${T.b1}`, borderRadius: "4px 18px 18px 18px", boxShadow: T.shadow }}>
              <TypingDots color={doc.color} />
            </div>
          </div>
        )}

        {err && (
          <div className="tv-in" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={14} color="#dc2626" />
              <span style={{ fontFamily: T.ui, fontWeight: 600, fontSize: 13, color: "#dc2626" }}>API Error</span>
            </div>
            <p style={{ fontFamily: T.mono, fontSize: 11, color: "#b91c1c", lineHeight: 1.7, wordBreak: "break-all", marginBottom: 12 }}>{err}</p>
            <button onClick={onRetry} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, color: "#dc2626", fontFamily: T.ui, fontWeight: 600, fontSize: 12, padding: "6px 14px", cursor: "pointer" }}>
              <RefreshCw size={11} /> Retry
            </button>
          </div>
        )}

        {ready && !busy && (
          <div className="tv-in" style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
            <div style={{ flex: 1, height: 1, background: T.b1 }} />
            <span style={{ fontFamily: T.mono, fontSize: 10, color: doc.color, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>✓ INTERVIEW COMPLETE</span>
            <div style={{ flex: 1, height: 1, background: T.b1 }} />
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 0 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: T.card, border: `1px solid ${T.b1}`, borderRadius: 20, padding: "6px 6px 6px 16px", boxShadow: T.shadow }}>
          <textarea
            ref={inpRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            disabled={busy || ready}
            placeholder={ready ? "Interview complete — generate document above" : "Type your answer…"}
            rows={1}
            style={{ flex: 1, resize: "none", background: "transparent", border: "none", outline: "none", color: T.t1, fontSize: 14, lineHeight: 1.6, padding: "8px 0", fontFamily: T.ui, overflow: "hidden" }}
            onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 108) + "px"; }}
          />
          <button
            onClick={onSend}
            disabled={busy || !input.trim() || ready}
            style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, border: "none", cursor: "pointer", background: (input.trim() && !busy && !ready) ? `linear-gradient(135deg,${doc.from},${doc.to})` : T.s1, color: (input.trim() && !busy && !ready) ? "#ffffff" : T.t3, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", opacity: (busy || !input.trim() || ready) ? 0.4 : 1, boxShadow: (input.trim() && !busy && !ready) ? `0 2px 10px ${doc.color}30` : "none" }}
          >
            <ArrowUp size={16} />
          </button>
        </div>
        <p style={{ fontFamily: T.mono, fontSize: 10, color: T.t3, textAlign: "center", marginTop: 8, letterSpacing: "0.05em" }}>
          ENTER TO SEND · SHIFT+ENTER FOR NEWLINE
        </p>
      </div>
    </div>
  );
}

// ─── DOC SCREEN ───────────────────────────────────────────────────────────────
function DocScreen({ type, docText, loading, err, onDownload, onRestart, onBack }) {
  const doc = DOCS[type];
  return (
    <div style={{ position: "relative", zIndex: 1, height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px 12px", flexShrink: 0, background: T.card, borderBottom: `1px solid ${T.b1}`, boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: T.s1, border: `1px solid ${T.b1}`, color: T.t2, width: 36, height: 36, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={17} />
          </button>
          <span style={{ fontFamily: T.ui, fontWeight: 600, fontSize: 15, color: T.t1 }}>{doc.name}</span>
          <Chip color={loading ? "#d97706" : err ? "#dc2626" : "#059669"}>
            {loading ? "Generating…" : err ? "Error" : "Ready"}
          </Chip>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onRestart} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, background: T.s1, border: `1px solid ${T.b1}`, color: T.t2, fontFamily: T.ui, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            <RotateCcw size={13} /> Start Over
          </button>
          <button onClick={onDownload} disabled={loading || !docText} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 100, border: "none", fontFamily: T.ui, fontWeight: 700, fontSize: 13, cursor: (!loading && docText) ? "pointer" : "not-allowed", background: (!loading && docText) ? `linear-gradient(135deg,${doc.from},${doc.to})` : T.s1, color: (!loading && docText) ? "#ffffff" : T.t3, opacity: (loading || !docText) ? 0.5 : 1, boxShadow: (!loading && docText) ? `0 4px 14px ${doc.color}30` : "none" }}>
            <Download size={13} /> Download
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "40px 24px 60px", background: T.bg }}>
        <div style={{ maxWidth: 740, margin: "0 auto" }}>
          {loading && (
            <div className="tv-in" style={{ background: T.card, border: `1px solid ${T.b1}`, borderRadius: 20, padding: "80px 40px", textAlign: "center", boxShadow: T.shadow }}>
              <div style={{ display: "inline-block", width: 36, height: 36, border: `2.5px solid ${doc.color}30`, borderTopColor: doc.color, borderRadius: "50%", animation: "tv-spin 0.8s linear infinite", marginBottom: 22 }} />
              <p style={{ fontFamily: T.ui, fontSize: 15, color: T.t2 }}>Drafting your {doc.name}…</p>
            </div>
          )}
          {!loading && err && (
            <div className="tv-in" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 20, padding: "48px 40px", textAlign: "center" }}>
              <AlertTriangle size={32} color="#dc2626" style={{ marginBottom: 16 }} />
              <p style={{ fontFamily: T.ui, fontSize: 14, color: "#dc2626", marginBottom: 10 }}>Generation failed</p>
              <p style={{ fontFamily: T.mono, fontSize: 11, color: "#b91c1c", wordBreak: "break-all" }}>{err}</p>
            </div>
          )}
          {!loading && !err && docText && (
            <div className="tv-sc">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, background: doc.light, border: `1px solid ${doc.color}30`, borderRadius: 10, padding: "10px 16px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: doc.color, flexShrink: 0 }} />
                <span style={{ fontFamily: T.mono, fontSize: 10, color: doc.color, letterSpacing: "0.07em" }}>
                  AI-GENERATED DRAFT · ATTORNEY REVIEW REQUIRED BEFORE EXECUTION
                </span>
              </div>
              <div style={{ background: "#ffffff", border: `1px solid ${T.b1}`, borderRadius: 16, padding: "56px 64px", boxShadow: "0 4px 40px rgba(0,0,0,0.09)" }}>
                <div style={{ fontFamily: T.doc, fontSize: 13, lineHeight: 2.1, color: "#2a2a3a", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {docText}
                </div>
                <div style={{ marginTop: 52, paddingTop: 22, borderTop: `1px solid ${T.b1}` }}>
                  <p style={{ fontFamily: T.mono, fontSize: 10, color: T.t3, lineHeight: 1.9 }}>
                    Generated by TrustVault · For informational purposes only{"\n"}Attorney review required before execution
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function TrustVault() {
  const [screen,  setScreen]  = useState("home");
  const [type,    setType]    = useState(null);
  const [msgs,    setMsgs]    = useState([]);
  const [input,   setInput]   = useState("");
  const [busy,    setBusy]    = useState(false);
  const [ready,   setReady]   = useState(false);
  const [chatErr, setChatErr] = useState("");
  const [docText, setDocText] = useState("");
  const [genning, setGenning] = useState(false);
  const [genErr,  setGenErr]  = useState("");

  const buildApiMsgs = (display, extra) => {
    const arr = [{ role: "user", content: SEED }, ...display.map(m => ({ role: m.role, content: m.content }))];
    if (extra) arr.push(extra);
    return arr;
  };

  const start = useCallback(async (t) => {
    setType(t); setMsgs([]); setReady(false); setDocText("");
    setChatErr(""); setInput(""); setScreen("chat"); setBusy(true);
    try {
      const text = await callClaude([{ role: "user", content: SEED }], buildSystem(t));
      const done = text.includes("[[DONE]]");
      setMsgs([{ role: "assistant", content: text.replace("[[DONE]]", "").trim() }]);
      if (done) setReady(true);
    } catch (e) { setChatErr(e.message); }
    setBusy(false);
  }, []);

  const send = useCallback(async () => {
    if (!input.trim() || busy || ready) return;
    const txt = input.trim(); setInput(""); setChatErr("");
    const next = [...msgs, { role: "user", content: txt }];
    setMsgs(next); setBusy(true);
    try {
      const text = await callClaude(buildApiMsgs(next, null), buildSystem(type));
      const done = text.includes("[[DONE]]");
      setMsgs(p => [...p, { role: "assistant", content: text.replace("[[DONE]]", "").trim() }]);
      if (done) setReady(true);
    } catch (e) { setChatErr(e.message); }
    setBusy(false);
  }, [input, busy, ready, msgs, type]);

  const retry = useCallback(() => {
    setChatErr("");
    if (msgs.length === 0) start(type);
  }, [msgs, type, start]);

  const generate = useCallback(async () => {
    setScreen("doc"); setDocText(""); setGenErr(""); setGenning(true);
    try {
      const text = await callClaude(buildApiMsgs(msgs, { role: "user", content: buildDocPrompt(type) }), null);
      setDocText(text);
    } catch (e) { setGenErr(e.message); }
    setGenning(false);
  }, [msgs, type]);

  const download = useCallback(() => {
    if (!docText || !type) return;
    const d = DOCS[type];
    const safe = docText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${d.name}</title>`
      + `<style>body{font-family:'Times New Roman',Georgia,serif;font-size:12pt;line-height:2;max-width:720px;margin:72px auto;padding:0 40px;color:#111}`
      + `pre{white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:inherit;line-height:inherit}`
      + `.foot{margin-top:60px;padding-top:20px;border-top:1px solid #ccc;font-size:9pt;color:#888;text-align:center}`
      + `@media print{body{margin:1in}}</style>`
      + `</head><body><pre>${safe}</pre>`
      + `<div class="foot">Generated by TrustVault — For informational purposes only. Consult a licensed attorney before execution.</div>`
      + `</body></html>`;
    const b = new Blob([html], { type: "text/html" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u; a.download = `${d.name.replace(/\s+/g, "_")}.html`; a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }, [docText, type]);

  const reset = () => {
    setScreen("home"); setMsgs([]); setType(null); setDocText("");
    setReady(false); setChatErr(""); setGenErr("");
  };

  return (
    <div style={{ fontFamily: T.ui, minHeight: "100vh", color: T.t1, position: "relative" }}>
      <Bg />
      {screen === "home" && <HomeScreen onSelect={start} />}
      {screen === "chat" && (
        <ChatScreen type={type} msgs={msgs} busy={busy} ready={ready} err={chatErr}
          input={input} setInput={setInput} onSend={send} onGenerate={generate}
          onRetry={retry} onBack={() => setScreen("home")} />
      )}
      {screen === "doc" && (
        <DocScreen type={type} docText={docText} loading={genning} err={genErr}
          onDownload={download} onRestart={reset} onBack={() => setScreen("chat")} />
      )}
    </div>
  );
}
