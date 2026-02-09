import { useState, useEffect, useCallback, useMemo } from "react";

// ─── BRAND + THEME ──────────────────────────────────────────────────────────
const R = "#EF3340", P = "#5000A8";
const NEON = "#FF4D5E", NEON_P = "#A855F7", NEON_G = "#34D399";
const STATUSES = ["Ideation","In Progress","Review","Published"];
const TYPES = ["Blog Post","Video","Press Release","Case Study","Whitepaper","Social Post","Email","Landing Page","Infographic","Webinar"];
const CATS = ["SEO Agency","PR","Editorial","Videos","Social","Email Marketing","Events"];
const PAGES = [
  { id:"home", label:"Home" },
  { id:"weekly", label:"Weekly Overview" },
  { id:"all", label:"All Content" },
  { id:"seo", label:"SEO Agency" },
  { id:"pr", label:"PR" },
  { id:"editorial", label:"Editorial" },
  { id:"videos", label:"Videos" },
];
const hf = { fontFamily:"'Montserrat',sans-serif", fontWeight:800 };
const bf = { fontFamily:"'Roboto',sans-serif" };

// ─── THEME DEFINITIONS ──────────────────────────────────────────────────────
const themes = {
  dark: {
    bg: "#0D0B14",
    bgAlt: "#141020",
    surface: "#1A1528",
    surfaceHover: "#231E30",
    surfaceAlt: "#110E1C",
    border: "#2A2440",
    borderHover: "#3D3556",
    text: "#F5F3FF",
    textSecondary: "#A8A0BF",
    textMuted: "#6B6088",
    accent: NEON,
    accentP: NEON_P,
    accentG: NEON_G,
    navBg: "rgba(13,11,20,0.92)",
    tickerBg: "#08060F",
    inputBg: "#110E1C",
    scrollThumb: "#3D3556",
    cardGlow: "0 0 20px rgba(168,85,247,0.06)",
    accentGlow: "0 0 20px rgba(255,77,94,0.15)",
    accentGlowP: "0 0 20px rgba(168,85,247,0.15)",
    glassOverlay: "rgba(13,11,20,0.75)",
  },
  light: {
    bg: "#F7F7F8",
    bgAlt: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceHover: "#FAFAFA",
    surfaceAlt: "#FAFAFA",
    border: "#E5E7EB",
    borderHover: "#D1D5DB",
    text: "#111827",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    accent: R,
    accentP: P,
    accentG: "#10B981",
    navBg: "rgba(255,255,255,0.95)",
    tickerBg: "#111827",
    inputBg: "#FAFAFA",
    scrollThumb: "#D1D5DB",
    cardGlow: "0 1px 3px rgba(0,0,0,0.04)",
    accentGlow: "0 2px 8px rgba(239,51,64,0.25)",
    accentGlowP: "0 2px 8px rgba(80,0,168,0.12)",
    glassOverlay: "rgba(0,0,0,0.4)",
  },
};

const SC_MAP = {
  dark: {
    Ideation: { bg:"rgba(168,85,247,0.12)", text:"#C4B5FD", border:"rgba(168,85,247,0.25)", dot:NEON_P },
    "In Progress": { bg:"rgba(251,146,60,0.12)", text:"#FDBA74", border:"rgba(251,146,60,0.25)", dot:"#FB923C" },
    Review: { bg:"rgba(250,204,21,0.12)", text:"#FDE047", border:"rgba(250,204,21,0.25)", dot:"#FACC15" },
    Published: { bg:"rgba(52,211,153,0.12)", text:"#6EE7B7", border:"rgba(52,211,153,0.25)", dot:NEON_G },
  },
  light: {
    Ideation: { bg:"#F5F0FF", text:P, border:"#DDD6FE", dot:P },
    "In Progress": { bg:"#FFF7ED", text:"#C2410C", border:"#FED7AA", dot:"#F97316" },
    Review: { bg:"#FFFBEB", text:"#92400E", border:"#FDE68A", dot:"#F59E0B" },
    Published: { bg:"#ECFDF5", text:"#065F46", border:"#A7F3D0", dot:"#10B981" },
  },
};

// ─── GOOGLE SHEETS CONFIG ────────────────────────────────────────────────────
// Your two public Google Sheets. The dashboard auto-detects column headers.
// Make sure both sheets are set to: Share > Anyone with the link > Viewer
const SHEET_SOURCES = [
  {
    id: "main",
    name: "SEO Content Calendar",
    sheetId: "1QxKiWyW6t5-VhtDNVTA9z85t-5mZ8bE--ARpFQUs3Ms",
    gid: "1119805524",
    defaultCategory: "SEO Agency",
  },
  {
    id: "secondary",
    name: "PR / Editorial Calendar",
    sheetId: "1F-AbiPiQyX5vm2Bh3e9mKrLZXtQ2yDStY3174Lw6zxE",
    gid: "595694338",
    defaultCategory: "PR",
  },
];

// ─── CSV PARSER ─────────────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = []; let cur = []; let cell = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i+1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { cur.push(cell.trim()); cell = ""; }
      else if (ch === '\n' || (ch === '\r' && text[i+1] === '\n')) {
        cur.push(cell.trim()); cell = "";
        if (cur.some(c => c !== "")) rows.push(cur);
        cur = [];
        if (ch === '\r') i++;
      } else { cell += ch; }
    }
  }
  cur.push(cell.trim());
  if (cur.some(c => c !== "")) rows.push(cur);
  return rows;
}

// Smart column mapper: finds the best match for each field by checking common header names
function buildColumnMap(headers) {
  const h = headers.map(x => x.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const find = (...terms) => {
    for (const t of terms) { const idx = h.findIndex(x => x.includes(t)); if (idx >= 0) return idx; }
    return -1;
  };
  return {
    title: find("title", "headline", "topic", "name", "blogtitle", "posttitle", "articletitle"),
    author: find("author", "writer", "assignedto", "owner", "createdby", "assignee"),
    status: find("status", "state", "stage", "progress", "workflow"),
    publishDate: find("publishdate", "pubdate", "dateposted", "datepublished", "goliveda", "livedate", "date", "duedate", "targetdate", "deadline"),
    contentType: find("contenttype", "type", "format", "assettype", "content"),
    targetKeyword: find("targetkeyword", "keyword", "seokey", "primarykeyword", "focuskey", "keyphrase"),
    url: find("url", "link", "liveurl", "blogurl", "pageurl", "permalink"),
    category: find("category", "channel", "team", "department", "source", "pillar"),
  };
}

function normalizeDate(raw) {
  if (!raw) return "";
  // Try ISO format first
  const iso = Date.parse(raw);
  if (!isNaN(iso)) {
    const d = new Date(iso);
    return d.toISOString().split("T")[0];
  }
  // Try MM/DD/YYYY
  const parts = raw.split("/");
  if (parts.length === 3) {
    const [m, d, y] = parts;
    const yr = y.length === 2 ? "20" + y : y;
    return `${yr}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  return "";
}

function normalizeStatus(raw) {
  if (!raw) return "Ideation";
  const s = raw.toLowerCase().trim();
  if (s.includes("publish") || s.includes("live") || s.includes("complete") || s.includes("done")) return "Published";
  if (s.includes("review") || s.includes("edit") || s.includes("approval")) return "Review";
  if (s.includes("progress") || s.includes("writing") || s.includes("draft") || s.includes("active") || s.includes("working")) return "In Progress";
  return "Ideation";
}

async function fetchSheetAsCSV(source) {
  const url = `https://docs.google.com/spreadsheets/d/${source.sheetId}/gviz/tq?tqx=out:csv&gid=${source.gid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${source.name}: ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const map = buildColumnMap(headers);
  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const title = map.title >= 0 ? r[map.title] : "";
    if (!title) continue; // skip empty rows
    items.push({
      id: `${source.id}-${i}`,
      title,
      author: map.author >= 0 ? (r[map.author] || "") : "",
      status: normalizeStatus(map.status >= 0 ? r[map.status] : ""),
      publishDate: normalizeDate(map.publishDate >= 0 ? r[map.publishDate] : ""),
      contentType: map.contentType >= 0 ? (r[map.contentType] || "Blog Post") : "Blog Post",
      targetKeyword: map.targetKeyword >= 0 ? (r[map.targetKeyword] || "") : "",
      url: map.url >= 0 ? (r[map.url] || "") : "",
      category: map.category >= 0 ? (r[map.category] || source.defaultCategory) : source.defaultCategory,
      addedVia: "google-sheets",
      image: "",
      _source: source.name,
    });
  }
  return items;
}

// Fallback sample data (shown while sheets load or if fetch fails)
function ad(d, n) { const x = new Date(d); x.setDate(x.getDate()+n); return x.toISOString().split("T")[0]; }
const sampleData = () => {
  const n = new Date();
  return [
    { id:"s1", title:"Loading data from Google Sheets\u2026", author:"", status:"In Progress", publishDate:ad(n,0), contentType:"Blog Post", targetKeyword:"", url:"", category:"Editorial", addedVia:"google-sheets", image:"" },
  ];
};

// ─── HELPERS ────────────────────────────────────────────────────────────────
function fmtDate(s) { if(!s) return "\u2014"; return new Date(s+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }
function fmtShort(s) { if(!s) return ""; return new Date(s+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}); }
function fmtRel(s) {
  if(!s) return ""; const d=new Date(s+"T00:00:00"), now=new Date(); now.setHours(0,0,0,0);
  const diff=Math.round((d-now)/(864e5));
  if(diff===0) return "Today"; if(diff===1) return "Tomorrow"; if(diff===-1) return "Yesterday";
  if(diff>0&&diff<=7) return `In ${diff} days`; if(diff<0&&diff>=-7) return `${Math.abs(diff)}d ago`;
  return fmtDate(s);
}
function isToday(d) { const t=new Date(); return d.getFullYear()===t.getFullYear()&&d.getMonth()===t.getMonth()&&d.getDate()===t.getDate(); }
function getWeekRange() {
  const n=new Date(), day=n.getDay(), diff=n.getDate()-day+(day===0?-6:1);
  const mon=new Date(n.setDate(diff)), sun=new Date(mon); sun.setDate(mon.getDate()+6);
  return { start: mon.toISOString().split("T")[0], end: sun.toISOString().split("T")[0], startDate: new Date(mon), endDate: sun };
}

// ─── PI LOGO ────────────────────────────────────────────────────────────────
function Logo({s=26}) {
  return <svg width={s} height={s} viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill={R}/><text x="50" y="68" textAnchor="middle" fill="#fff" fontFamily="'Montserrat',sans-serif" fontWeight="800" fontSize="52" letterSpacing="-2">Pi</text></svg>;
}

// ─── ICONS ──────────────────────────────────────────────────────────────────
const Ic = {
  search: s=><svg width={s||16} height={s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  refresh: s=><svg width={s||16} height={s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  x: s=><svg width={s||16} height={s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  chevL: s=><svg width={s||16} height={s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  chevR: s=><svg width={s||16} height={s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  settings: s=><svg width={s||16} height={s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  send: s=><svg width={s||16} height={s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  bulb: s=><svg width={s||16} height={s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21h6M12 3a6 6 0 0 0-4 10.5V17h8v-3.5A6 6 0 0 0 12 3z"/></svg>,
  spark: s=><svg width={s||18} height={s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L9 12l-7 1 5.5 5L6 22l6-4 6 4-1.5-4 5.5-5-7-1z"/></svg>,
  ext: s=><svg width={s||14} height={s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  cloud: s=><svg width={s||14} height={s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>,
  chat: s=><svg width={s||14} height={s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  link: s=><svg width={s||14} height={s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  calendar: s=><svg width={s||16} height={s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  list: s=><svg width={s||16} height={s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  img: s=><svg width={s||16} height={s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  eye: s=><svg width={s||14} height={s||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  sun: s=><svg width={s||16} height={s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: s=><svg width={s||16} height={s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
};

// ─── MICRO COMPONENTS ───────────────────────────────────────────────────────
function StatusBadge({status, small, t}) {
  const SC = SC_MAP[t] || SC_MAP.dark;
  const c=SC[status]||{bg:"#1A1528",text:"#A8A0BF",border:"#2A2440",dot:"#6B6088"};
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:small?"2px 8px":"3px 10px",borderRadius:20,fontSize:small?10:11,fontWeight:600,background:c.bg,color:c.text,border:`1px solid ${c.border}`,whiteSpace:"nowrap",...bf}}><span style={{width:5,height:5,borderRadius:"50%",background:c.dot,flexShrink:0}}/>{status}</span>;
}
function SourceBadge({s, t, th}) {
  const isChat=s==="chat";
  const dark = t === "dark";
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:10,fontSize:9,fontWeight:700,
    background: dark ? (isChat ? "rgba(56,189,248,0.1)" : "rgba(52,211,153,0.1)") : (isChat?"#F0F9FF":"#F0FDF4"),
    color: dark ? (isChat ? "#7DD3FC" : "#6EE7B7") : (isChat?"#0369A1":"#15803D"),
    border: `1px solid ${dark ? (isChat ? "rgba(56,189,248,0.2)" : "rgba(52,211,153,0.2)") : (isChat?"#BAE6FD":"#BBF7D0")}`,
    textTransform:"uppercase",...bf}}>{isChat?Ic.chat(10):Ic.cloud(10)}{isChat?"Chat":"Sheets"}</span>;
}
function TypeChip({t: type, theme}) {
  const dark = theme === "dark";
  const m = dark ? {
    "Blog Post":{bg:"rgba(96,165,250,0.12)",c:"#93BBFD"},Video:{bg:"rgba(255,77,94,0.12)",c:NEON},"Press Release":{bg:"rgba(52,211,153,0.12)",c:NEON_G},
    "Case Study":{bg:"rgba(250,204,21,0.12)",c:"#FDE047"},Whitepaper:{bg:"rgba(168,85,247,0.12)",c:NEON_P},"Social Post":{bg:"rgba(244,114,182,0.12)",c:"#F472B6"},
    Email:{bg:"rgba(56,189,248,0.12)",c:"#7DD3FC"},Webinar:{bg:"rgba(251,146,60,0.12)",c:"#FDBA74"}
  } : {
    "Blog Post":{bg:"#EFF6FF",c:"#1D4ED8"},Video:{bg:"#FEF2F2",c:R},"Press Release":{bg:"#F0FDF4",c:"#15803D"},
    "Case Study":{bg:"#FFFBEB",c:"#92400E"},Whitepaper:{bg:"#F5F3FF",c:P},"Social Post":{bg:"#FFF1F2",c:"#BE123C"},
    Email:{bg:"#F0F9FF",c:"#0369A1"},Webinar:{bg:"#FFF7ED",c:"#C2410C"}
  };
  const v=m[type]||{bg: dark ? "#1A1528" : "#F3F4F6", c: dark ? "#A8A0BF" : "#6B7280"};
  return <span style={{padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:600,background:v.bg,color:v.c,...bf}}>{type}</span>;
}

function Field({label,value,onChange,type="text",placeholder="",th}) {
  return <div><label style={{fontSize:11,color:th.textMuted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:5,...bf}}>{label}</label>
  <input type={type} value={value||""} placeholder={placeholder} onChange={e=>onChange(e.target.value)}
    style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${th.border}`,fontSize:13,color:th.text,outline:"none",boxSizing:"border-box",background:th.inputBg,...bf}}
    onFocus={e=>e.target.style.borderColor=th.accentP} onBlur={e=>e.target.style.borderColor=th.border}/></div>;
}
function SelectField({label,value,options,onChange,th}) {
  return <div><label style={{fontSize:11,color:th.textMuted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:5,...bf}}>{label}</label>
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${th.border}`,fontSize:13,color:th.text,outline:"none",background:th.inputBg,cursor:"pointer",...bf}}>
    {options.map(o=><option key={o} value={o}>{o}</option>)}</select></div>;
}

// ─── DARK MODE TOGGLE ───────────────────────────────────────────────────────
function ThemeToggle({mode, setMode}) {
  const dark = mode === "dark";
  return (
    <button onClick={()=>setMode(dark ? "light" : "dark")} title={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{position:"relative",width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",
        background: dark ? "linear-gradient(135deg,#2A2440,#3D3556)" : "linear-gradient(135deg,#E5E7EB,#D1D5DB)",
        padding:0,transition:"background 0.3s",display:"flex",alignItems:"center"}}>
      <div style={{position:"absolute",left: dark ? 22 : 2, top:2,width:20,height:20,borderRadius:10,
        background: dark ? "#0D0B14" : "#fff", transition:"left 0.3s",display:"flex",alignItems:"center",justifyContent:"center",
        boxShadow: dark ? `0 0 8px ${NEON_P}` : "0 1px 3px rgba(0,0,0,0.2)",color: dark ? NEON_P : "#F59E0B"}}>
        {dark ? Ic.moon(11) : Ic.sun(11)}
      </div>
    </button>
  );
}

// ─── SCROLLING TICKER ───────────────────────────────────────────────────────
function Ticker({items, th}) {
  const published = items.filter(i=>i.status==="Published"&&i.url).sort((a,b)=>new Date(b.publishDate)-new Date(a.publishDate));
  if(!published.length) return null;
  const doubled = [...published,...published];
  return (
    <div style={{background:th.tickerBg,overflow:"hidden",whiteSpace:"nowrap",position:"relative",height:38,display:"flex",alignItems:"center",borderBottom:`1px solid ${th.border}`}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:80,background:`linear-gradient(to right,${th.tickerBg},transparent)`,zIndex:2}}/>
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:80,background:`linear-gradient(to left,${th.tickerBg},transparent)`,zIndex:2}}/>
      <div className="ticker-track" style={{display:"inline-flex",gap:44,animation:`ticker ${published.length*6}s linear infinite`,paddingLeft:40}}>
        {doubled.map((it,i)=>(
          <a key={`${it.id}-${i}`} href={it.url} target="_blank" rel="noopener noreferrer"
            style={{display:"inline-flex",alignItems:"center",gap:8,textDecoration:"none",fontSize:12,fontWeight:500,color:"rgba(255,255,255,0.55)",transition:"color 0.15s",...bf}}
            onMouseEnter={e=>e.currentTarget.style.color="#fff"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.55)"}>
            <span style={{width:4,height:4,borderRadius:"50%",background:NEON,flexShrink:0,boxShadow:`0 0 6px ${NEON}`}}/>
            <span style={{fontWeight:700,color:NEON,fontSize:10,textTransform:"uppercase",letterSpacing:0.5,textShadow:`0 0 10px rgba(255,77,94,0.4)`}}>LIVE</span>
            {it.title}
            <span style={{color:"rgba(255,255,255,0.25)",fontSize:10}}>{fmtShort(it.publishDate)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── DETAIL PANEL ───────────────────────────────────────────────────────────
function DetailPanel({item,onClose,onUpdate,th,mode}) {
  if(!item) return null;
  const [editing,setEditing]=useState(false);
  const [ed,setEd]=useState({...item});
  const save=()=>{onUpdate(ed);setEditing(false);};
  const dl={fontSize:10,color:th.textMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:3,...bf};
  const sBtn={padding:"5px 12px",borderRadius:6,border:`1px solid ${th.border}`,background:th.surface,fontSize:12,fontWeight:600,color:th.textSecondary,cursor:"pointer",display:"flex",alignItems:"center",...bf};
  const DR=({l,v})=><div><span style={dl}>{l}</span><span style={{fontSize:14,color:th.text,fontWeight:500,...bf}}>{v}</span></div>;
  return (
    <div style={{position:"fixed",top:0,right:0,bottom:0,width:400,background:th.surface,boxShadow:`-4px 0 30px rgba(0,0,0,${mode==="dark"?0.4:0.1})`,zIndex:1000,overflowY:"auto",borderLeft:`1px solid ${th.border}`}}>
      <div style={{padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{fontSize:10,fontWeight:700,color:th.textMuted,textTransform:"uppercase",letterSpacing:1,...bf}}>Content Details</span>
          <div style={{display:"flex",gap:6}}>
            {!editing&&<button onClick={()=>{setEditing(true);setEd({...item});}} style={sBtn}>Edit</button>}
            <button onClick={onClose} style={{...sBtn,padding:6}}>{Ic.x()}</button>
          </div>
        </div>
        {editing?(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="Title" value={ed.title} onChange={v=>setEd(d=>({...d,title:v}))} th={th}/>
            <Field label="Author" value={ed.author} onChange={v=>setEd(d=>({...d,author:v}))} th={th}/>
            <SelectField label="Status" value={ed.status} options={STATUSES} onChange={v=>setEd(d=>({...d,status:v}))} th={th}/>
            <Field label="Publish Date" value={ed.publishDate} onChange={v=>setEd(d=>({...d,publishDate:v}))} type="date" th={th}/>
            <SelectField label="Content Type" value={ed.contentType} options={TYPES} onChange={v=>setEd(d=>({...d,contentType:v}))} th={th}/>
            <SelectField label="Category" value={ed.category} options={CATS} onChange={v=>setEd(d=>({...d,category:v}))} th={th}/>
            <Field label="Target Keyword" value={ed.targetKeyword} onChange={v=>setEd(d=>({...d,targetKeyword:v}))} th={th}/>
            <Field label="URL" value={ed.url} onChange={v=>setEd(d=>({...d,url:v}))} th={th}/>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button onClick={save} style={{flex:1,padding:"10px 16px",borderRadius:8,border:"none",background:th.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",...bf}}>Save</button>
              <button onClick={()=>setEditing(false)} style={{padding:"10px 16px",borderRadius:8,border:`1px solid ${th.border}`,background:th.surface,fontSize:13,fontWeight:600,color:th.textSecondary,cursor:"pointer",...bf}}>Cancel</button>
            </div>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <div><TypeChip t={item.contentType} theme={mode}/><h3 style={{fontSize:18,...hf,color:th.text,margin:"8px 0 0",lineHeight:1.3}}>{item.title}</h3></div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><StatusBadge status={item.status} t={mode}/><SourceBadge s={item.addedVia} t={mode} th={th}/></div>
            <DR l="Author" v={item.author}/><DR l="Publish Date" v={fmtDate(item.publishDate)}/><DR l="Category" v={item.category}/>
            {item.targetKeyword&&<DR l="Target Keyword" v={item.targetKeyword}/>}
            {item.url&&<div><span style={dl}>URL</span><a href={item.url} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:th.accentP,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4,...bf}}>{Ic.link()}{item.url.replace(/^https?:\/\//,"").substring(0,40)}</a></div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── IDEA MODAL ─────────────────────────────────────────────────────────────
function IdeaModal({onClose,onSubmit,th,mode}) {
  const [text,setText]=useState("");
  const submit=()=>{if(!text.trim())return;onSubmit(text.trim());setText("");onClose();};
  const overlay={position:"fixed",inset:0,background:th.glassOverlay,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"};
  return (
    <div style={overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:th.surface,borderRadius:20,padding:32,width:480,boxShadow:`0 25px 60px rgba(0,0,0,${mode==="dark"?0.5:0.2})`,border:`1px solid ${th.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <div style={{width:36,height:36,borderRadius:12,background:mode==="dark"?"rgba(168,85,247,0.12)":"#F5F0FF",display:"flex",alignItems:"center",justifyContent:"center",color:th.accentP}}>{Ic.bulb(20)}</div>
          <h2 style={{...hf,fontSize:18,color:th.text,margin:0}}>Submit a Quick Idea</h2>
        </div>
        <p style={{fontSize:13,color:th.textMuted,margin:"0 0 20px",lineHeight:1.5,...bf}}>Drop your content idea here. It'll be sent to the content team for review and added to the backlog.</p>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="e.g. Blog post about using behavioral data for remote team building..." rows={4}
          style={{width:"100%",padding:14,borderRadius:12,border:`1px solid ${th.border}`,fontSize:14,outline:"none",resize:"vertical",boxSizing:"border-box",background:th.inputBg,color:th.text,lineHeight:1.5,...bf}}
          onFocus={e=>e.target.style.borderColor=th.accentP} onBlur={e=>e.target.style.borderColor=th.border}/>
        <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"10px 20px",borderRadius:10,border:`1px solid ${th.border}`,background:th.surface,fontSize:13,fontWeight:600,color:th.textSecondary,cursor:"pointer",...bf}}>Cancel</button>
          <button onClick={submit} style={{padding:"10px 24px",borderRadius:10,border:"none",background:text.trim()?th.accent:"rgba(255,255,255,0.06)",color:text.trim()?"#fff":th.textMuted,fontSize:13,fontWeight:700,cursor:text.trim()?"pointer":"default",display:"flex",alignItems:"center",gap:6,...bf,boxShadow:text.trim()?th.accentGlow:"none"}}>{Ic.send(14)} Submit Idea</button>
        </div>
      </div>
    </div>
  );
}

// ─── SHEETS CONFIG ──────────────────────────────────────────────────────────
function SheetsModal({config,onSave,onClose,th,mode}) {
  const [src,setSrc]=useState(config.sources.map(s=>({...s})));
  const overlay={position:"fixed",inset:0,background:th.glassOverlay,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"};
  const sBtn={padding:"5px 12px",borderRadius:6,border:`1px solid ${th.border}`,background:th.surface,fontSize:12,fontWeight:600,color:th.textSecondary,cursor:"pointer",display:"flex",alignItems:"center",...bf};
  return (
    <div style={overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:th.surface,borderRadius:16,padding:28,width:520,maxHeight:"80vh",overflowY:"auto",boxShadow:`0 20px 50px rgba(0,0,0,${mode==="dark"?0.5:0.15})`,border:`1px solid ${th.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{...hf,fontSize:16,margin:0,color:th.text}}>Google Sheets Sources</h2>
          <button onClick={onClose} style={{...sBtn,padding:6}}>{Ic.x()}</button>
        </div>
        {src.map((s,i)=>(
          <div key={i} style={{padding:14,borderRadius:10,border:`1px solid ${th.border}`,marginBottom:10,background:th.surfaceAlt}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:11,fontWeight:700,color:th.textSecondary,...bf}}>Source {i+1}</span>
              {src.length>1&&<button onClick={()=>setSrc(x=>x.filter((_,idx)=>idx!==i))} style={{fontSize:10,color:th.accent,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Remove</button>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <Field label="Name" value={s.name} onChange={v=>setSrc(x=>x.map((y,idx)=>idx===i?{...y,name:v}:y))} th={th}/>
              <Field label="Sheet URL" value={s.sheetUrl} onChange={v=>setSrc(x=>x.map((y,idx)=>idx===i?{...y,sheetUrl:v}:y))} th={th}/>
            </div>
          </div>
        ))}
        <button onClick={()=>setSrc(x=>[...x,{id:"s-"+Date.now(),name:"",sheetUrl:"",apiKey:"",range:"A1:Z1000"}])}
          style={{width:"100%",padding:9,borderRadius:8,border:`1.5px dashed ${th.border}`,background:"none",fontSize:12,fontWeight:600,color:th.textMuted,cursor:"pointer",marginBottom:14,...bf}}>+ Add Source</button>
        <button onClick={()=>{onSave(src);onClose();}} style={{width:"100%",padding:"11px 20px",borderRadius:8,border:"none",background:th.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",...bf,boxShadow:th.accentGlow}}>Save</button>
      </div>
    </div>
  );
}

// ─── HOME PAGE ──────────────────────────────────────────────────────────────
function HomePage({items,onClickItem,brandBotUrl,th,mode}) {
  const now=new Date(); now.setHours(0,0,0,0);
  const thirtyAgo = new Date(now); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const upcoming=items.filter(i=>i.status!=="Published"&&new Date(i.publishDate+"T00:00:00")>=now).sort((a,b)=>new Date(a.publishDate)-new Date(b.publishDate)).slice(0,6);
  const recent=items.filter(i=>i.status==="Published" && new Date(i.publishDate+"T00:00:00")>=thirtyAgo).sort((a,b)=>new Date(b.publishDate)-new Date(a.publishDate));
  const statusCounts=useMemo(()=>{const c={};STATUSES.forEach(s=>c[s]=items.filter(i=>i.status===s).length);return c;},[items]);
  const SC = SC_MAP[mode];

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"0 32px 60px"}}>
      {/* Hero */}
      <div style={{padding:"52px 0 44px",textAlign:"center",position:"relative"}}>
        {/* Decorative glow orbs */}
        {mode==="dark"&&<>
          <div style={{position:"absolute",top:20,left:"20%",width:200,height:200,borderRadius:"50%",background:`radial-gradient(circle,rgba(168,85,247,0.06),transparent 70%)`,pointerEvents:"none"}}/>
          <div style={{position:"absolute",top:40,right:"15%",width:160,height:160,borderRadius:"50%",background:`radial-gradient(circle,rgba(255,77,94,0.04),transparent 70%)`,pointerEvents:"none"}}/>
        </>}
        <h1 style={{...hf,fontSize:44,color:th.text,margin:"0 0 12px",lineHeight:1.1,letterSpacing:-1.5,position:"relative"}}>
          PI Content Dashboard
        </h1>
        <p style={{fontSize:16,color:th.textSecondary,margin:"0 auto",maxWidth:540,lineHeight:1.6,...bf,position:"relative"}}>
          A read-only view of everything in production across SEO, PR, Editorial, and Video. See what's live, what's next, and what's in the pipeline.
        </p>
        {/* Mini status bar */}
        <div style={{display:"flex",justifyContent:"center",gap:24,marginTop:28,position:"relative"}}>
          {STATUSES.map(s=>(
            <div key={s} style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:SC[s].dot,boxShadow:mode==="dark"?`0 0 8px ${SC[s].dot}40`:"none"}}/>
              <span style={{fontSize:13,color:th.text,fontWeight:600,...bf}}>{statusCounts[s]}</span>
              <span style={{fontSize:12,color:th.textMuted,...bf}}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column layout: UP NEXT + Recently Published */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:32}}>

        {/* UP NEXT - left column */}
        <section>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:16}}>
            <h2 style={{...hf,fontSize:24,color:th.accent,margin:0,letterSpacing:-0.5,textTransform:"uppercase"}}>Up Next</h2>
            <span style={{fontSize:12,color:th.textMuted,...bf}}>{upcoming.length} in pipeline</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {upcoming.map((it,idx)=>(
              <div key={it.id} onClick={()=>onClickItem(it)}
                style={{background:th.surface,borderRadius:14,padding:"16px 18px",border:`1px solid ${th.border}`,cursor:"pointer",transition:"all 0.2s",boxShadow:th.cardGlow,
                  borderLeft: idx===0 ? `3px solid ${th.accent}` : `3px solid ${th.border}`}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=th.accentP;e.currentTarget.style.boxShadow=th.accentGlowP;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=th.border;e.currentTarget.style.boxShadow=th.cardGlow;if(idx===0)e.currentTarget.style.borderLeftColor=th.accent;}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
                  <TypeChip t={it.contentType} theme={mode}/>
                  <StatusBadge status={it.status} small t={mode}/>
                </div>
                <div style={{fontSize:idx===0?16:14,fontWeight:700,color:th.text,marginBottom:6,lineHeight:1.3,...bf}}>{it.title}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:th.textSecondary,...bf}}>{it.author}</span>
                  <span style={{fontSize:11,color:th.accent,fontWeight:600,...bf}}>{fmtRel(it.publishDate)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT COLUMN: Recently Published + Brand Bot + Info */}
        <section>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:16}}>
            <h2 style={{...hf,fontSize:20,color:th.text,margin:0}}>Recently Published</h2>
            <span style={{fontSize:11,color:th.textMuted,...bf}}>Last 30 days</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
            {recent.map(it=>(
              <a key={it.id} href={it.url||"#"} target="_blank" rel="noopener noreferrer"
                style={{background:th.surface,borderRadius:12,padding:"13px 16px",border:`1px solid ${th.border}`,cursor:"pointer",display:"flex",gap:14,alignItems:"center",transition:"all 0.2s",textDecoration:"none",boxShadow:th.cardGlow}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=th.accentG;e.currentTarget.style.transform="translateX(2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=th.border;e.currentTarget.style.transform="translateX(0)";}}>
                <div style={{width:4,height:44,borderRadius:2,background:th.accentG,flexShrink:0,boxShadow:mode==="dark"?`0 0 6px ${th.accentG}40`:"none"}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:th.text,marginBottom:3,...bf,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.title}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}><TypeChip t={it.contentType} theme={mode}/><span style={{fontSize:11,color:th.textMuted,...bf}}>{it.author}</span></div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:11,color:th.textSecondary,...bf}}>{fmtRel(it.publishDate)}</div>
                  <div style={{fontSize:10,color:th.accentG,fontWeight:600,marginTop:2,...bf}}>LIVE</div>
                </div>
              </a>
            ))}
            {recent.length===0&&<div style={{padding:24,textAlign:"center",color:th.textMuted,fontSize:13,...bf}}>No published content in the last 30 days</div>}
          </div>

          {/* Brand Bot */}
          <a href={brandBotUrl||"#"} target="_blank" rel="noopener noreferrer"
            style={{display:"flex",alignItems:"center",gap:10,padding:"16px 18px",borderRadius:14,
              background:mode==="dark"?"rgba(168,85,247,0.08)":"linear-gradient(135deg,#F5F0FF,#EDE9FE)",
              border:`1px solid ${mode==="dark"?"rgba(168,85,247,0.2)":"#DDD6FE"}`,textDecoration:"none",transition:"all 0.2s",marginBottom:14}}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
            <div style={{width:40,height:40,borderRadius:12,background:mode==="dark"?"rgba(168,85,247,0.2)":P,display:"flex",alignItems:"center",justifyContent:"center",color:mode==="dark"?NEON_P:"#fff",flexShrink:0}}>{Ic.spark(20)}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:th.accentP,...bf}}>PI Brand Bot</div>
              <div style={{fontSize:11,color:mode==="dark"?"#C4B5FD":"#7C3AED",...bf}}>Voice, tone & content guidance</div>
            </div>
            <span style={{color:th.textMuted}}>{Ic.ext(14)}</span>
          </a>

          {/* Read-only info */}
          <div style={{background:th.surface,borderRadius:14,border:`1px solid ${th.border}`,padding:18}}>
            <div style={{fontSize:10,fontWeight:700,color:th.textMuted,textTransform:"uppercase",letterSpacing:1,marginBottom:10,...bf}}>This Dashboard</div>
            <p style={{fontSize:13,color:th.textSecondary,lineHeight:1.6,margin:0,...bf}}>This is a <strong style={{color:th.text}}>read-only view</strong> of all content in production. Task management, assignments, and edits happen in your Google Sheets and project tools. Use this to see the big picture.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── WEEKLY OVERVIEW (PRESENTATION SLIDE) ───────────────────────────────────
function WeeklyOverview({items,onClickItem,th,mode}) {
  const wk=getWeekRange();
  const weekItems=items.filter(i=>{const d=i.publishDate; return d>=wk.start&&d<=wk.end;}).sort((a,b)=>new Date(a.publishDate)-new Date(b.publishDate));
  const published=items.filter(i=>i.status==="Published").sort((a,b)=>new Date(b.publishDate)-new Date(a.publishDate)).slice(0,5);
  const dayNames=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const days=[];
  for(let i=0;i<7;i++){const d=new Date(wk.startDate);d.setDate(wk.startDate.getDate()+i);days.push(d);}
  const statusCounts={};STATUSES.forEach(s=>statusCounts[s]=items.filter(i=>i.status===s).length);
  const SC = SC_MAP[mode];

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"40px 32px 60px"}}>
      {/* Slide Header */}
      <div style={{background:mode==="dark"
        ?"linear-gradient(135deg,#110E1C 0%,#1A1528 50%,#0D0B14 100%)"
        :"linear-gradient(135deg,#111827 0%,#1F2937 100%)",
        borderRadius:24,padding:"48px 56px 44px",marginBottom:32,position:"relative",overflow:"hidden",
        border:mode==="dark"?`1px solid ${th.border}`:"none"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:`rgba(255,77,94,0.06)`}}/>
        <div style={{position:"absolute",bottom:-60,right:80,width:160,height:160,borderRadius:"50%",background:`rgba(168,85,247,0.06)`}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <Logo s={22}/>
            <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:1.5,...bf}}>Weekly Content Overview</span>
          </div>
          <h1 style={{...hf,fontSize:36,color:"#fff",margin:"0 0 8px",letterSpacing:-0.5}}>
            {fmtShort(wk.start)} \u2013 {fmtShort(wk.end)}
          </h1>
          <p style={{fontSize:14,color:"rgba(255,255,255,0.5)",margin:0,...bf}}>
            {weekItems.length} items scheduled this week \u00B7 {statusCounts.Published} published total
          </p>
          <div style={{display:"flex",gap:24,marginTop:24}}>
            {STATUSES.map(s=>(
              <div key={s} style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:SC[s].dot,boxShadow:`0 0 6px ${SC[s].dot}40`}}/>
                <span style={{fontSize:20,fontWeight:800,color:"#fff",...hf}}>{statusCounts[s]}</span>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.4)",...bf}}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Week Grid */}
      <section style={{marginBottom:36}}>
        <h2 style={{...hf,fontSize:18,color:th.text,margin:"0 0 14px"}}>This Week</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:8}}>
          {days.map((d,i)=>{
            const ds=d.toISOString().split("T")[0];
            const di=items.filter(it=>it.publishDate===ds);
            const today=isToday(d);
            return (
              <div key={i} style={{borderRadius:14,padding:12,minHeight:140,
                background:today?(mode==="dark"?"rgba(255,77,94,0.06)":"#FEF2F2"):th.surface,
                border:today?`2px solid ${th.accent}`:`1px solid ${th.border}`,transition:"all 0.15s"}}>
                <div style={{fontSize:9,fontWeight:700,color:today?th.accent:th.textMuted,textTransform:"uppercase",letterSpacing:0.5,...bf}}>{dayNames[i]}</div>
                <div style={{fontSize:20,...hf,color:today?th.accent:th.text,marginBottom:8}}>{d.getDate()}</div>
                {di.map(it=>(
                  <div key={it.id} onClick={()=>onClickItem(it)}
                    style={{padding:"5px 7px",borderRadius:8,marginBottom:4,cursor:"pointer",background:SC[it.status]?.bg||th.surfaceAlt,borderLeft:`3px solid ${SC[it.status]?.dot||th.textMuted}`,fontSize:10,fontWeight:600,color:th.text,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",...bf}}>
                    {it.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      {/* Recently Published */}
      <section>
        <h2 style={{...hf,fontSize:18,color:th.text,margin:"0 0 14px"}}>Recently Published</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
          {published.map(it=>(
            <div key={it.id} onClick={()=>onClickItem(it)} style={{background:th.surface,borderRadius:16,overflow:"hidden",border:`1px solid ${th.border}`,cursor:"pointer",transition:"all 0.2s",boxShadow:th.cardGlow}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=th.accentGlowP;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=th.cardGlow;}}>
              <div style={{height:120,background:mode==="dark"?"linear-gradient(135deg,#1A1528,#110E1C)":"linear-gradient(135deg,#F9FAFB,#F3F4F6)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                {it.image?<img src={it.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:th.textMuted}}>
                  {Ic.img(24)}
                  <span style={{fontSize:10,...bf}}>Featured image</span>
                </div>}
                <div style={{position:"absolute",top:10,left:10}}><StatusBadge status={it.status} small t={mode}/></div>
              </div>
              <div style={{padding:"14px 16px"}}>
                <div style={{display:"flex",gap:6,marginBottom:6}}><TypeChip t={it.contentType} theme={mode}/></div>
                <h3 style={{fontSize:15,...hf,color:th.text,margin:"0 0 6px",lineHeight:1.3}}>{it.title}</h3>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:th.textSecondary,...bf}}>{it.author}</span>
                  <span style={{fontSize:11,color:th.textMuted,...bf}}>{fmtDate(it.publishDate)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── CONTENT TABLE ──────────────────────────────────────────────────────────
function ContentTable({items,onClickItem,th,mode}) {
  return (
    <div style={{borderRadius:12,border:`1px solid ${th.border}`,overflow:"hidden",background:th.surface}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,...bf}}>
        <thead><tr style={{background:th.surfaceAlt}}>
          {["Title","Author","Status","Type","Category","Publish Date","Keyword","Source"].map(h=>(
            <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:9,fontWeight:700,color:th.textMuted,textTransform:"uppercase",letterSpacing:0.5,borderBottom:`1px solid ${th.border}`}}>{h}</th>
          ))}</tr></thead>
        <tbody>{items.map((it,i)=>(
          <tr key={it.id} onClick={()=>onClickItem(it)}
            style={{cursor:"pointer",background:i%2===0?th.surface:th.surfaceAlt,transition:"background 0.1s"}}
            onMouseEnter={e=>e.currentTarget.style.background=mode==="dark"?"rgba(168,85,247,0.06)":"#FEF2F2"}
            onMouseLeave={e=>e.currentTarget.style.background=i%2===0?th.surface:th.surfaceAlt}>
            <td style={{padding:"10px 12px",fontWeight:600,color:th.text,maxWidth:240,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.title}</td>
            <td style={{padding:"10px 12px",color:th.textSecondary}}>{it.author}</td>
            <td style={{padding:"10px 12px"}}><StatusBadge status={it.status} small t={mode}/></td>
            <td style={{padding:"10px 12px"}}><TypeChip t={it.contentType} theme={mode}/></td>
            <td style={{padding:"10px 12px",color:th.textSecondary,fontSize:12}}>{it.category}</td>
            <td style={{padding:"10px 12px",color:th.textSecondary,whiteSpace:"nowrap",fontSize:12}}>{fmtDate(it.publishDate)}</td>
            <td style={{padding:"10px 12px",color:th.textMuted,fontSize:11,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.targetKeyword||"\u2014"}</td>
            <td style={{padding:"10px 12px"}}><SourceBadge s={it.addedVia} t={mode} th={th}/></td>
          </tr>
        ))}</tbody>
      </table>
      {items.length===0&&<div style={{textAlign:"center",padding:40,color:th.textMuted,fontSize:13,...bf}}>No content matches your filters</div>}
    </div>
  );
}

// ─── CONTENT PAGE (filtered views) ──────────────────────────────────────────
function ContentPage({items,onClickItem,searchQuery,setSearchQuery,statusFilter,setStatusFilter,th,mode}) {
  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 32px 60px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,gap:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <input type="text" placeholder="Search..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
              style={{padding:"8px 10px 8px 32px",borderRadius:8,border:`1px solid ${th.border}`,fontSize:12,width:220,outline:"none",background:th.inputBg,color:th.text,...bf}}
              onFocus={e=>e.target.style.borderColor=th.accentP} onBlur={e=>e.target.style.borderColor=th.border}/>
            <div style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:th.textMuted}}>{Ic.search(14)}</div>
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            style={{padding:"8px 10px",borderRadius:8,border:`1px solid ${th.border}`,fontSize:12,color:th.textSecondary,background:th.inputBg,cursor:"pointer",outline:"none",...bf}}>
            <option value="all">All Statuses</option>
            {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <span style={{fontSize:12,color:th.textMuted,...bf}}>{items.length} items</span>
      </div>
      <ContentTable items={items} onClickItem={onClickItem} th={th} mode={mode}/>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────
export default function PIContentDashboard() {
  const [items,setItems]=useState(sampleData);
  const [page,setPage]=useState("home");
  const [selectedItem,setSelectedItem]=useState(null);
  const [showIdea,setShowIdea]=useState(false);
  const [showSheets,setShowSheets]=useState(false);
  const [sheetsConfig,setSheetsConfig]=useState({sources:SHEET_SOURCES,autoSyncIntervalMs:3e5});
  const [lastSync,setLastSync]=useState(null);
  const [syncing,setSyncing]=useState(false);
  const [syncError,setSyncError]=useState(null);
  const [search,setSearch]=useState("");
  const [statusF,setStatusF]=useState("all");
  const [submittedIdeas,setSubmittedIdeas]=useState([]);
  const [chatItems,setChatItems]=useState([]);
  const [mode,setMode]=useState("dark");
  const BRAND_BOT_URL="#"; // Replace with your Gemini custom gem URL

  const th = themes[mode];

  // Real sync: fetch CSV from all public Google Sheets
  const sync=useCallback(async()=>{
    setSyncing(true); setSyncError(null);
    try {
      const results = await Promise.allSettled(
        sheetsConfig.sources.map(src => fetchSheetAsCSV(src))
      );
      const allItems = [];
      const errors = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled") { allItems.push(...r.value); }
        else { errors.push(`${sheetsConfig.sources[i].name}: ${r.reason.message}`); }
      });
      // Merge with any chat-submitted items
      const merged = [...allItems, ...chatItems];
      if (merged.length > 0) setItems(merged);
      else if (errors.length > 0) setSyncError(errors.join("; "));
      setLastSync(new Date());
    } catch(e) {
      setSyncError(e.message);
    }
    setSyncing(false);
  },[sheetsConfig.sources, chatItems]);

  // Auto-sync on mount + interval
  useEffect(()=>{sync();},[]);
  useEffect(()=>{const t=setInterval(sync,sheetsConfig.autoSyncIntervalMs);return()=>clearInterval(t);},[sync,sheetsConfig.autoSyncIntervalMs]);

  const filtered=useMemo(()=>{
    let r=items;
    const map={seo:"SEO Agency",pr:"PR",editorial:"Editorial",videos:"Videos"};
    if(page!=="home"&&page!=="all"&&page!=="weekly"&&map[page]) r=r.filter(i=>i.category===map[page]);
    if(statusF!=="all") r=r.filter(i=>i.status===statusF);
    if(search.trim()){const q=search.toLowerCase();r=r.filter(i=>i.title.toLowerCase().includes(q)||i.author.toLowerCase().includes(q)||i.targetKeyword?.toLowerCase().includes(q)||i.contentType.toLowerCase().includes(q));}
    r.sort((a,b)=>new Date(a.publishDate)-new Date(b.publishDate));
    return r;
  },[items,page,statusF,search]);

  const submitIdea=(text)=>{
    const newIdea = {id:`chat-${Date.now()}`,title:text,author:"Submitted via Chat",status:"Ideation",publishDate:new Date().toISOString().split("T")[0],contentType:"Blog Post",targetKeyword:"",url:"",category:"Editorial",addedVia:"chat",image:""};
    setChatItems(prev=>[newIdea,...prev]);
    setItems(prev=>[newIdea,...prev]);
    setSubmittedIdeas(prev=>[{id:Date.now(),text,time:new Date().toLocaleString()},...prev]);
  };
  const updateItem=(u)=>{setItems(prev=>prev.map(i=>i.id===u.id?u:i));setSelectedItem(u);};

  return (
    <div style={{minHeight:"100vh",background:th.bg,transition:"background 0.3s",...bf}}>
      {/* TICKER */}
      <Ticker items={items} th={th}/>

      {/* NAV */}
      <nav style={{background:th.navBg,borderBottom:`1px solid ${th.border}`,padding:"0 32px",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(12px)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:52}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Logo s={24}/>
            <span style={{fontSize:13,...hf,color:th.text,letterSpacing:-0.3}}>Content Dashboard</span>
          </div>
          <div style={{display:"flex",gap:0,height:52,alignItems:"stretch"}}>
            {PAGES.map(p=>{
              const a=page===p.id;
              return <button key={p.id} onClick={()=>{setPage(p.id);setSearch("");setStatusF("all");}}
                style={{padding:"0 14px",border:"none",background:"none",fontSize:12,fontWeight:a?700:500,
                  color:a?th.accent:th.textSecondary,cursor:"pointer",
                  borderBottom:a?`2px solid ${th.accent}`:"2px solid transparent",...bf,transition:"color 0.15s"}}>{p.label}</button>;
            })}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {syncError&&<span style={{fontSize:10,color:NEON,fontWeight:600,...bf}} title={syncError}>Sheets not public?</span>}
            {lastSync&&!syncError&&<span style={{fontSize:10,color:th.textMuted,...bf}}>Synced {lastSync.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>}
            <ThemeToggle mode={mode} setMode={setMode}/>
            <button onClick={sync} disabled={syncing} title="Sync Sheets"
              style={{padding:6,borderRadius:6,border:`1px solid ${th.border}`,background:th.surface,cursor:syncing?"default":"pointer",display:"flex",opacity:syncing?0.4:1,color:th.textSecondary}}>
              <span style={{animation:syncing?"spin 1s linear infinite":"none",display:"flex"}}>{Ic.refresh(14)}</span>
            </button>
            <button onClick={()=>setShowSheets(true)} title="Sources"
              style={{padding:6,borderRadius:6,border:`1px solid ${th.border}`,background:th.surface,cursor:"pointer",display:"flex",color:th.textSecondary}}>{Ic.settings(14)}</button>
            <button onClick={()=>setShowIdea(true)}
              style={{padding:"7px 16px",borderRadius:8,border:"none",background:th.accent,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,...bf,boxShadow:th.accentGlow,transition:"all 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 20px rgba(255,77,94,0.35)`}
              onMouseLeave={e=>e.currentTarget.style.boxShadow=th.accentGlow}>
              {Ic.bulb(14)} Submit an Idea
            </button>
          </div>
        </div>
      </nav>

      {/* PAGES */}
      {page==="home"&&<HomePage items={items} onClickItem={setSelectedItem} brandBotUrl={BRAND_BOT_URL} th={th} mode={mode}/>}
      {page==="weekly"&&<WeeklyOverview items={items} onClickItem={setSelectedItem} th={th} mode={mode}/>}
      {page!=="home"&&page!=="weekly"&&<ContentPage items={filtered} onClickItem={setSelectedItem} searchQuery={search} setSearchQuery={setSearch} statusFilter={statusF} setStatusFilter={setStatusF} th={th} mode={mode}/>}

      {/* PANELS & MODALS */}
      {selectedItem&&<><div style={{position:"fixed",inset:0,background:th.glassOverlay,zIndex:999,backdropFilter:"blur(4px)"}} onClick={()=>setSelectedItem(null)}/><DetailPanel item={selectedItem} onClose={()=>setSelectedItem(null)} onUpdate={updateItem} th={th} mode={mode}/></>}
      {showIdea&&<IdeaModal onClose={()=>setShowIdea(false)} onSubmit={submitIdea} th={th} mode={mode}/>}
      {showSheets&&<SheetsModal config={sheetsConfig} onSave={s=>setSheetsConfig(c=>({...c,sources:s}))} onClose={()=>setShowSheets(false)} th={th} mode={mode}/>}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Montserrat:wght@700;800;900&display=swap');
        *{box-sizing:border-box;} body{margin:0;background:${th.bg};}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${th.scrollThumb};border-radius:3px}
        .ticker-track:hover{animation-play-state:paused}
        select option { background:${th.surface}; color:${th.text}; }
      `}</style>
    </div>
  );
}
