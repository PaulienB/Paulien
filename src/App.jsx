import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  Wine, Plus, Search, BarChart3, Download, Upload, X, ChevronLeft, Edit3, Trash2,
  Grid3X3, List, Filter, Check, Camera, AlertCircle, Star, Moon, Sun, Heart, Copy
} from "lucide-react";

// ─── Theme Colors ────────────────────────────────────────────────────────────

const LIGHT = {
  lupine: "#7B68AE", poppy: "#E54B4B", cornflower: "#6195ED",
  buttercup: "#F5C842", meadow: "#5DAA68", bg: "#FAFAF7",
  card: "#FFFFFF", text: "#2D2A32", subtle: "#8A8690",
  border: "#E8E6EB", inputBg: "#F5F4F7",
  red: "#C0392B", white: "#D4AC0D", rose: "#E091A6",
  outOfStock: "#D5D3D8",
};

const DARK = {
  lupine: "#9B8ACE", poppy: "#F06B6B", cornflower: "#7BAAFF",
  buttercup: "#F5D062", meadow: "#6DBF78", bg: "#1A1820",
  card: "#262430", text: "#EEEDF0", subtle: "#9895A0",
  border: "#3A3844", inputBg: "#2E2C38",
  red: "#E05A4F", white: "#E8C84A", rose: "#F0A0B6",
  outOfStock: "#4A4852",
};

const ACCENT_COLORS_LIGHT = [LIGHT.lupine, LIGHT.poppy, LIGHT.cornflower, LIGHT.buttercup, LIGHT.meadow];
const ACCENT_COLORS_DARK = [DARK.lupine, DARK.poppy, DARK.cornflower, DARK.buttercup, DARK.meadow];

// ─── Constants ───────────────────────────────────────────────────────────────

const COUNTRIES = [
  "Frankrijk", "Spanje", "Italië", "Australië", "Nieuw-Zeeland",
  "Zuid-Afrika", "Argentinië", "Chili", "Kroatië", "Duitsland",
  "Oostenrijk", "Portugal", "VS", "Nederland", "Overig"
];

const GRAPES = [
  "Chardonnay", "Sauvignon Blanc", "Malbec", "Merlot", "Cabernet Sauvignon",
  "Pinot Noir", "Pinot Blanc", "Tempranillo", "Colombard", "Riesling",
  "Shiraz", "Pinot Gris", "Sangiovese", "Grenache", "Primitivo",
  "Chenin Blanc", "Verdejo", "Grüner Veltliner", "Carménère",
  "Gewürztraminer", "Gamay", "Viognier", "Corvina", "Rondinella", "Overig"
];

const SPECIAL_ATTRIBUTES = [
  "Bubbels", "Dessertwijn", "Afwijkende maat", "Heel duur",
  "Drinken bij bijzondere gelegenheid", "Bio/natuur", "Speciale classificatie"
];

const WINE_COLORS = [
  { value: "red", label: "Rood", colorKey: "red" },
  { value: "white", label: "Wit", colorKey: "white" },
  { value: "rose", label: "Rosé", colorKey: "rose" },
];

const STORAGE_KEY = "kurk-data";
const SETTINGS_KEY = "kurk-settings";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => currentYear + 10 - i);

// ─── Data Version & Migration ────────────────────────────────────────────────

const DATA_VERSION = 2;

const WINE_DEFAULTS = {
  id: "", name: "", producer: "", dateAdded: "", color: "red",
  country: "", region: "", sourceType: "bought", sourceFrom: "",
  vintage: null, drinkFrom: null, drinkTo: null, grapes: [],
  price: null, priceEstimated: false, specialAttributes: [],
  pairsWith: "", notes: "", photo: null, bottleCount: 1,
  totalBottles: 1, checkouts: [], isWishlist: false,
};

const migrateWine = (wine) => {
  const migrated = { ...WINE_DEFAULTS, ...wine };
  if (!Array.isArray(migrated.grapes)) migrated.grapes = [];
  if (!Array.isArray(migrated.specialAttributes)) migrated.specialAttributes = [];
  if (!Array.isArray(migrated.checkouts)) migrated.checkouts = [];
  if (typeof migrated.isWishlist !== "boolean") migrated.isWishlist = false;
  return migrated;
};

const migrateData = (data) => {
  if (!data) return null;
  if (data.wines && Array.isArray(data.wines)) {
    data.wines = data.wines.map(migrateWine);
  }
  data.version = DATA_VERSION;
  return data;
};

// ─── Storage Helpers ─────────────────────────────────────────────────────────

const saveData = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: DATA_VERSION })); }
  catch (e) { console.error("Save error:", e); }
};

const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.version || data.version < DATA_VERSION) {
      const migrated = migrateData(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return data;
  } catch (e) { console.error("Load error:", e); return null; }
};

const saveSettings = (s) => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch(e) {} };
const loadSettings = () => { try { const r = localStorage.getItem(SETTINGS_KEY); return r ? JSON.parse(r) : null; } catch(e) { return null; } };

// ─── Cookie Helpers (data loss detection) ────────────────────────────────────

const COOKIE_KEY = "kurk-has-data";
const setDataCookie = () => {
  const expires = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_KEY}=1; expires=${expires}; path=/; SameSite=Lax`;
};
const getDataCookie = () => document.cookie.split("; ").some(c => c.startsWith(`${COOKIE_KEY}=`));
const clearDataCookie = () => {
  document.cookie = `${COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
};

// ─── Utility Functions ───────────────────────────────────────────────────────

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayStr = () => new Date().toISOString().split("T")[0];
const getFrequencySorted = (items, frequencyMap) => [...items].sort((a, b) => (frequencyMap[b] || 0) - (frequencyMap[a] || 0));
const formatDate = (d) => d ? new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : "";

const emptyWine = (isWishlist = false) => ({
  ...WINE_DEFAULTS, id: generateId(), dateAdded: todayStr(), isWishlist,
});

const getStock = (wine) => {
  const out = wine.checkouts ? wine.checkouts.reduce((s, c) => s + c.quantity, 0) : 0;
  return (wine.totalBottles || wine.bottleCount) - out;
};

// ─── CSV Import Parser ───────────────────────────────────────────────────────

const parseCSV = (text) => {
  const lines = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "\n" && !inQuotes) { lines.push(current); current = ""; continue; }
    if (ch === "\r" && !inQuotes) continue;
    current += ch;
  }
  if (current) lines.push(current);

  const parseRow = (line) => {
    const cells = []; let cell = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { q = !q; continue; }
      if (ch === "," && !q) { cells.push(cell); cell = ""; continue; }
      cell += ch;
    }
    cells.push(cell);
    return cells;
  };

  if (lines.length < 2) return [];
  const headers = parseRow(lines[0]);
  const colorMap = { "Rood": "red", "Wit": "white", "Rosé": "rose" };

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cells = parseRow(line);
    const get = (name) => { const idx = headers.indexOf(name); return idx >= 0 ? (cells[idx] || "").trim() : ""; };
    return {
      ...WINE_DEFAULTS,
      id: generateId(),
      name: get("Naam"),
      producer: get("Producent"),
      dateAdded: get("Datum") || todayStr(),
      color: colorMap[get("Kleur")] || "red",
      country: get("Land"),
      region: get("Regio"),
      sourceType: get("Herkomst type") === "Gekregen" ? "received" : "bought",
      sourceFrom: get("Herkomst"),
      vintage: get("Jaargang") && get("Jaargang") !== "n.v.t." ? Number(get("Jaargang")) : null,
      drinkFrom: get("Drinken van") ? Number(get("Drinken van")) : null,
      drinkTo: get("Drinken tot") ? Number(get("Drinken tot")) : null,
      grapes: get("Druiven") ? get("Druiven").split(";").map(s => s.trim()).filter(Boolean) : [],
      price: get("Prijs") ? Number(get("Prijs")) : null,
      priceEstimated: get("Schatting") === "Ja",
      specialAttributes: get("Bijzonderheden") ? get("Bijzonderheden").split(";").map(s => s.trim()).filter(Boolean) : [],
      pairsWith: get("Lekker bij"),
      notes: get("Opmerkingen"),
      totalBottles: get("Totaal flessen") ? Number(get("Totaal flessen")) : 1,
      bottleCount: get("Totaal flessen") ? Number(get("Totaal flessen")) : 1,
      checkouts: [],
      isWishlist: false,
    };
  });
};

// ─── Styles (dynamic) ────────────────────────────────────────────────────────

const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap');`;

const headingFont = { fontFamily: "'Playfair Display', serif" };

const makeStyles = (C) => ({
  base: { fontFamily: "'DM Sans', sans-serif", color: C.text, backgroundColor: C.bg, minHeight: "100vh" },
  btn: (bg, color = "#fff") => ({
    background: bg, color, border: "none", borderRadius: 12, padding: "12px 24px",
    fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    display: "inline-flex", alignItems: "center", gap: 8, transition: "opacity 0.2s",
  }),
  input: {
    width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`,
    fontSize: 15, fontFamily: "'DM Sans', sans-serif", background: C.inputBg,
    color: C.text, outline: "none", boxSizing: "border-box",
  },
  label: { fontSize: 13, fontWeight: 600, color: C.subtle, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 0.5 },
  chip: (active, accent = C.lupine) => ({
    padding: "8px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500,
    border: active ? `2px solid ${accent}` : `1.5px solid ${C.border}`,
    background: active ? accent + "18" : "transparent",
    color: active ? accent : C.text, cursor: "pointer",
    transition: "all 0.2s", display: "inline-block", whiteSpace: "nowrap",
  }),
  card: {
    background: C.card, borderRadius: 16, padding: 16,
    boxShadow: `0 2px 12px rgba(0,0,0,${C === DARK ? 0.2 : 0.06})`,
    border: `1px solid ${C.border}`, transition: "transform 0.2s, box-shadow 0.2s",
  },
});

// ─── Autocomplete ────────────────────────────────────────────────────────────

function AutocompleteInput({ value, onChange, suggestions, placeholder, C }) {
  const [show, setShow] = useState(false);
  const filtered = useMemo(() => {
    if (!value || !show) return [];
    return suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()).slice(0, 5);
  }, [value, suggestions, show]);
  const S = makeStyles(C);
  return (
    <div style={{ position: "relative" }}>
      <input style={S.input} value={value} placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)} onBlur={() => setTimeout(() => setShow(false), 200)} />
      {filtered.length > 0 && show && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: C.card, borderRadius: 10, marginTop: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", border: `1px solid ${C.border}`, maxHeight: 180, overflowY: "auto" }}>
          {filtered.map((s, i) => (
            <div key={i} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, color: C.text, borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}
              onMouseDown={() => { onChange(s); setShow(false); }}>{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelectChips({ options, selected, onToggle, accent, C }) {
  const S = makeStyles(C);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map(opt => (
        <span key={opt} style={S.chip(selected.includes(opt), accent)} onClick={() => onToggle(opt)}>
          {selected.includes(opt) && <span style={{ marginRight: 2 }}>✓ </span>}{opt}
        </span>
      ))}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function Kurk() {
  const [wines, setWines] = useState([]);
  const [view, setView] = useState("inventory");
  const [selectedWineId, setSelectedWineId] = useState(null);
  const [displayMode, setDisplayMode] = useState("card");
  const [sortBy, setSortBy] = useState("dateAdded");
  const [sortDir, setSortDir] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ colors: [], countries: [], grapes: [], attributes: [], includeOutOfStock: true });
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastBackup, setLastBackup] = useState(null);
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [frequencyCountry, setFrequencyCountry] = useState({});
  const [frequencyGrape, setFrequencyGrape] = useState({});
  const [showDataLossWarning, setShowDataLossWarning] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const C = darkMode ? DARK : LIGHT;
  const S = makeStyles(C);
  const ACCENTS = darkMode ? ACCENT_COLORS_DARK : ACCENT_COLORS_LIGHT;

  // Warn before closing tab
  useEffect(() => {
    const h = (e) => { if (wines.length > 0) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [wines]);

  // Load data + settings
  useEffect(() => {
    const settings = loadSettings();
    if (settings) { if (settings.darkMode) setDarkMode(true); }
    const data = loadData();
    if (data && data.wines && data.wines.length > 0) {
      setWines(data.wines); setLastBackup(data.lastBackup || null);
      setFrequencyCountry(data.frequencyCountry || {}); setFrequencyGrape(data.frequencyGrape || {});
      setDataCookie();
      if (data.lastBackup) {
        if ((Date.now() - new Date(data.lastBackup).getTime()) / 864e5 >= 14) setShowBackupReminder(true);
      } else setShowBackupReminder(true);
    } else if (getDataCookie()) setShowDataLossWarning(true);
    setLoading(false);
  }, []);

  // Save data
  useEffect(() => {
    if (!loading) {
      saveData({ wines, lastBackup, frequencyCountry, frequencyGrape });
      if (wines.length > 0) setDataCookie(); else clearDataCookie();
    }
  }, [wines, lastBackup, frequencyCountry, frequencyGrape, loading]);

  // Save settings
  useEffect(() => { if (!loading) saveSettings({ darkMode }); }, [darkMode, loading]);

  const updateFrequencies = useCallback((wine) => {
    if (wine.country) setFrequencyCountry(p => ({ ...p, [wine.country]: (p[wine.country] || 0) + 1 }));
    wine.grapes.forEach(g => setFrequencyGrape(p => ({ ...p, [g]: (p[g] || 0) + 1 })));
  }, []);

  const addWine = useCallback((wine) => { setWines(p => [wine, ...p]); updateFrequencies(wine); setView("inventory"); }, [updateFrequencies]);
  const addWishlistWine = useCallback((wine) => { setWines(p => [wine, ...p]); setView("wishlist"); }, []);
  const updateWine = useCallback((wine) => { setWines(p => p.map(w => w.id === wine.id ? wine : w)); setView("detail"); }, []);
  const deleteWine = useCallback((id) => { setWines(p => p.filter(w => w.id !== id)); setView("inventory"); setSelectedWineId(null); }, []);
  const checkoutWine = useCallback((id, checkout) => {
    setWines(p => p.map(w => w.id !== id ? w : { ...w, checkouts: [...(w.checkouts || []), checkout] }));
    setView("detail");
  }, []);

  const moveWishlistToInventory = useCallback((id) => {
    setWines(p => p.map(w => w.id !== id ? w : { ...w, isWishlist: false, dateAdded: todayStr() }));
    setView("inventory");
  }, []);

  const selectedWine = wines.find(w => w.id === selectedWineId);

  const inventoryWines = useMemo(() => wines.filter(w => !w.isWishlist), [wines]);
  const wishlistWines = useMemo(() => wines.filter(w => w.isWishlist), [wines]);

  const allNames = useMemo(() => [...new Set(wines.map(w => w.name).filter(Boolean))], [wines]);
  const allProducers = useMemo(() => [...new Set(wines.map(w => w.producer).filter(Boolean))], [wines]);
  const allRegions = useMemo(() => [...new Set(wines.map(w => w.region).filter(Boolean))], [wines]);
  const allSources = useMemo(() => [...new Set(wines.map(w => w.sourceFrom).filter(Boolean))], [wines]);
  const allPairsWith = useMemo(() => [...new Set(wines.flatMap(w => (w.pairsWith || "").split(",").map(s => s.trim())).filter(Boolean))], [wines]);
  const sortedCountries = useMemo(() => getFrequencySorted(COUNTRIES, frequencyCountry), [frequencyCountry]);
  const sortedGrapes = useMemo(() => getFrequencySorted(GRAPES, frequencyGrape), [frequencyGrape]);

  const filteredWines = useMemo(() => {
    let result = inventoryWines;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w => [w.name, w.producer, w.country, w.region, w.sourceFrom, w.pairsWith, w.notes, ...w.grapes, ...w.specialAttributes, w.vintage ? String(w.vintage) : "", ...(w.checkouts || []).map(c => c.note || "")].some(v => v && v.toLowerCase().includes(q)));
    }
    if (filters.colors.length) result = result.filter(w => filters.colors.includes(w.color));
    if (filters.countries.length) result = result.filter(w => filters.countries.includes(w.country));
    if (filters.grapes.length) result = result.filter(w => w.grapes.some(g => filters.grapes.includes(g)));
    if (filters.attributes.length) result = result.filter(w => w.specialAttributes.some(a => filters.attributes.includes(a)));
    result = [...result].sort((a, b) => {
      let va, vb;
      if (sortBy === "dateAdded") { va = a.dateAdded; vb = b.dateAdded; }
      else if (sortBy === "name") { va = (a.name || "").toLowerCase(); vb = (b.name || "").toLowerCase(); }
      else if (sortBy === "color") { va = a.color; vb = b.color; }
      else if (sortBy === "country") { va = a.country; vb = b.country; }
      else if (sortBy === "vintage") { va = a.vintage || 0; vb = b.vintage || 0; }
      else if (sortBy === "price") { va = a.price || 0; vb = b.price || 0; }
      return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
    });
    const inStock = result.filter(w => getStock(w) > 0);
    const outOfStock = result.filter(w => getStock(w) <= 0);
    return filters.includeOutOfStock ? [...inStock, ...outOfStock] : inStock;
  }, [inventoryWines, searchQuery, filters, sortBy, sortDir]);

  // Export
  const exportCSV = useCallback(() => {
    const headers = ["Naam","Producent","Datum","Kleur","Land","Regio","Herkomst type","Herkomst","Jaargang","Drinken van","Drinken tot","Druiven","Prijs","Schatting","Bijzonderheden","Lekker bij","Opmerkingen","Totaal flessen","Op voorraad","Uitboekingen"];
    const cl = { red: "Rood", white: "Wit", rose: "Rosé" };
    const rows = inventoryWines.map(w => [w.name, w.producer, w.dateAdded, cl[w.color] || w.color, w.country, w.region, w.sourceType === "received" ? "Gekregen" : "Gekocht", w.sourceFrom, w.vintage || "n.v.t.", w.drinkFrom || "", w.drinkTo || "", w.grapes.join("; "), w.price || "", w.priceEstimated ? "Ja" : "Nee", w.specialAttributes.join("; "), w.pairsWith, w.notes, w.totalBottles || w.bottleCount, getStock(w), (w.checkouts || []).map(c => `${c.date}: ${c.quantity}x ${c.reason === "drunk" ? `gedronken (${c.score}/10)` : "weggegeven"}${c.note ? ` - ${c.note}` : ""}`).join(" | ")]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `wijnvoorraad_${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
    setLastBackup(todayStr()); setShowBackupReminder(false);
  }, [inventoryWines]);

  // Import
  const handleImport = useCallback((e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = parseCSV(ev.target.result);
        if (imported.length === 0) { setImportResult({ ok: false, msg: "Geen wijnen gevonden in het bestand." }); return; }
        setWines(prev => [...imported, ...prev]);
        imported.forEach(w => {
          if (w.country) setFrequencyCountry(p => ({ ...p, [w.country]: (p[w.country] || 0) + 1 }));
          w.grapes.forEach(g => setFrequencyGrape(p => ({ ...p, [g]: (p[g] || 0) + 1 })));
        });
        setImportResult({ ok: true, msg: `${imported.length} wijn${imported.length !== 1 ? "en" : ""} geïmporteerd!` });
      } catch (err) { setImportResult({ ok: false, msg: "Fout bij het lezen van het bestand." }); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  if (loading) return (
    <div style={{ ...S.base, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{fontImport}</style>
      <div style={{ textAlign: "center" }}>
        <Wine size={48} color={C.lupine} />
        <p style={{ ...headingFont, fontSize: 24, marginTop: 16, color: C.lupine }}>Kurk</p>
        <p style={{ color: C.subtle, fontSize: 14 }}>Laden...</p>
      </div>
    </div>
  );

  // ─── Wine Form ───────────────────────────────────────────────────────────

  const WineForm = ({ initial, onSave, title, backView }) => {
    const [wine, setWine] = useState(initial);
    const [errors, setErrors] = useState({});
    const set = (f, v) => setWine(p => ({ ...p, [f]: v }));
    const toggleGrape = (g) => set("grapes", wine.grapes.includes(g) ? wine.grapes.filter(x => x !== g) : [...wine.grapes, g]);
    const toggleAttr = (a) => set("specialAttributes", wine.specialAttributes.includes(a) ? wine.specialAttributes.filter(x => x !== a) : [...wine.specialAttributes, a]);
    const handlePhoto = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => set("photo", ev.target.result); r.readAsDataURL(f); };
    const validate = () => { const e = {}; if (!wine.name.trim()) e.name = "Wijnnaam is verplicht"; setErrors(e); return !Object.keys(e).length; };
    const handleSave = () => { if (validate()) onSave(wine); };
    const gap = 20;
    const goBack = () => setView(backView || (initial.id && wines.find(w => w.id === initial.id) ? "detail" : "inventory"));

    return (
      <div style={{ padding: "0 16px 100px" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "16px 0", gap: 12 }}>
          <ChevronLeft size={24} style={{ cursor: "pointer", color: C.text }} onClick={goBack} />
          <h2 style={{ ...headingFont, fontSize: 22, margin: 0, color: C.text }}>{title}</h2>
        </div>

        <div style={{ marginBottom: gap }}><label style={S.label}>Wijnnaam *</label>
          <AutocompleteInput value={wine.name} onChange={v => set("name", v)} suggestions={allNames} placeholder="Bijv. Cloudy Bay" C={C} />
          {errors.name && <span style={{ color: C.poppy, fontSize: 12 }}>{errors.name}</span>}
        </div>

        <div style={{ marginBottom: gap }}><label style={S.label}>Producent</label>
          <AutocompleteInput value={wine.producer} onChange={v => set("producer", v)} suggestions={allProducers} placeholder="Bijv. Domaine Leflaive" C={C} /></div>

        {!wine.isWishlist && <div style={{ marginBottom: gap }}><label style={S.label}>Datum</label>
          <input type="date" style={S.input} value={wine.dateAdded} onChange={e => set("dateAdded", e.target.value)} /></div>}

        <div style={{ marginBottom: gap }}><label style={S.label}>Kleur *</label>
          <div style={{ display: "flex", gap: 10 }}>
            {WINE_COLORS.map(wc => (
              <div key={wc.value} onClick={() => set("color", wc.value)} style={{
                flex: 1, padding: "12px 8px", borderRadius: 12, textAlign: "center", cursor: "pointer",
                border: wine.color === wc.value ? `2.5px solid ${C[wc.colorKey]}` : `1.5px solid ${C.border}`,
                background: wine.color === wc.value ? C[wc.colorKey] + "15" : "transparent",
                fontWeight: wine.color === wc.value ? 600 : 400, fontSize: 14, color: C.text,
              }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: C[wc.colorKey], margin: "0 auto 6px", border: "1px solid rgba(128,128,128,0.3)" }} />
                {wc.label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: gap }}><label style={S.label}>Land</label>
          <select style={S.input} value={wine.country} onChange={e => set("country", e.target.value)}>
            <option value="">Selecteer land</option>{sortedCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select></div>

        <div style={{ marginBottom: gap }}><label style={S.label}>Regio</label>
          <AutocompleteInput value={wine.region} onChange={v => set("region", v)} suggestions={allRegions} placeholder="Bijv. Bourgogne, Rioja" C={C} /></div>

        {!wine.isWishlist && <>
          <div style={{ marginBottom: gap }}><label style={S.label}>Herkomst</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              {[{ v: "bought", l: "Gekocht bij" }, { v: "received", l: "Gekregen van" }].map(s => (
                <div key={s.v} onClick={() => set("sourceType", s.v)} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "center", cursor: "pointer",
                  border: wine.sourceType === s.v ? `2px solid ${C.cornflower}` : `1.5px solid ${C.border}`,
                  background: wine.sourceType === s.v ? C.cornflower + "15" : "transparent",
                  fontSize: 14, fontWeight: wine.sourceType === s.v ? 600 : 400, color: C.text,
                }}>{s.l}</div>
              ))}
            </div>
            <AutocompleteInput value={wine.sourceFrom} onChange={v => set("sourceFrom", v)} suggestions={allSources} placeholder={wine.sourceType === "bought" ? "Winkel of leverancier" : "Naam"} C={C} />
          </div>
        </>}

        <div style={{ marginBottom: gap }}><label style={S.label}>Jaargang</label>
          <select style={S.input} value={wine.vintage === null ? "nvt" : wine.vintage} onChange={e => set("vintage", e.target.value === "nvt" ? null : Number(e.target.value))}>
            <option value="nvt">N.v.t.</option>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select></div>

        <div style={{ marginBottom: gap }}><label style={S.label}>Drinkvenster (optioneel)</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select style={{ ...S.input, flex: 1 }} value={wine.drinkFrom || ""} onChange={e => set("drinkFrom", e.target.value ? Number(e.target.value) : null)}>
              <option value="">Van</option>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
            <span style={{ color: C.subtle }}>–</span>
            <select style={{ ...S.input, flex: 1 }} value={wine.drinkTo || ""} onChange={e => set("drinkTo", e.target.value ? Number(e.target.value) : null)}>
              <option value="">Tot</option>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
          </div></div>

        <div style={{ marginBottom: gap }}><label style={S.label}>Druif(en)</label>
          <MultiSelectChips options={sortedGrapes} selected={wine.grapes} onToggle={toggleGrape} accent={C.meadow} C={C} /></div>

        {!wine.isWishlist && <div style={{ marginBottom: gap }}><label style={S.label}>Prijs</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.subtle }}>€</span>
              <input type="number" style={{ ...S.input, paddingLeft: 30 }} placeholder="0,00" value={wine.price || ""} onChange={e => set("price", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap", color: C.text }}>
              <input type="checkbox" checked={wine.priceEstimated} onChange={e => set("priceEstimated", e.target.checked)} /> Schatting
            </label>
          </div></div>}

        <div style={{ marginBottom: gap }}><label style={S.label}>Bijzonderheden</label>
          <MultiSelectChips options={SPECIAL_ATTRIBUTES} selected={wine.specialAttributes} onToggle={toggleAttr} accent={C.buttercup} C={C} /></div>

        <div style={{ marginBottom: gap }}><label style={S.label}>Lekker bij</label>
          <AutocompleteInput value={wine.pairsWith} onChange={v => set("pairsWith", v)} suggestions={allPairsWith} placeholder="Bijv. pasta, wild, kaasplank" C={C} /></div>

        <div style={{ marginBottom: gap }}><label style={S.label}>Opmerkingen</label>
          <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }} placeholder="Eventuele bijzonderheden" value={wine.notes} onChange={e => set("notes", e.target.value)} /></div>

        <div style={{ marginBottom: gap }}><label style={S.label}>Foto etiket</label>
          {wine.photo ? (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img src={wine.photo} alt="Etiket" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 12, objectFit: "cover" }} />
              <button onClick={() => set("photo", null)} style={{ position: "absolute", top: -8, right: -8, background: C.poppy, color: "#fff", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
            </div>
          ) : (
            <label style={{ ...S.btn(C.inputBg, C.text), cursor: "pointer", display: "inline-flex" }}>
              <Camera size={18} /> Foto toevoegen
              <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
            </label>
          )}</div>

        {!wine.isWishlist && <div style={{ marginBottom: gap }}><label style={S.label}>Aantal flessen</label>
          <select style={{ ...S.input, width: 100 }} value={wine.totalBottles || wine.bottleCount}
            onChange={e => { set("totalBottles", Number(e.target.value)); set("bottleCount", Number(e.target.value)); }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
          </select></div>}

        <button style={{ ...S.btn(C.lupine), width: "100%", justifyContent: "center", marginTop: 8 }} onClick={handleSave}>
          <Check size={18} /> Opslaan
        </button>
      </div>
    );
  };

  // ─── Wine Detail ─────────────────────────────────────────────────────────

  const WineDetail = () => {
    if (!selectedWine) return null;
    const stock = getStock(selectedWine);
    const wc = WINE_COLORS.find(c => c.value === selectedWine.color);
    const wcColor = wc ? C[wc.colorKey] : C.subtle;
    const [showDel, setShowDel] = useState(false);

    const quickRefill = () => {
      const copy = { ...selectedWine, id: generateId(), dateAdded: todayStr(), totalBottles: 1, bottleCount: 1, checkouts: [], isWishlist: false };
      setWines(p => [copy, ...p]); updateFrequencies(copy); setView("inventory");
    };

    return (
      <div style={{ padding: "0 16px 100px" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "16px 0", gap: 12 }}>
          <ChevronLeft size={24} style={{ cursor: "pointer", color: C.text }} onClick={() => { setView(selectedWine.isWishlist ? "wishlist" : "inventory"); setSelectedWineId(null); }} />
          <h2 style={{ ...headingFont, fontSize: 22, margin: 0, flex: 1, color: C.text }}>Detail</h2>
          <Edit3 size={20} style={{ cursor: "pointer", color: C.lupine }} onClick={() => setView("edit")} />
          <Trash2 size={20} style={{ cursor: "pointer", color: C.poppy }} onClick={() => setShowDel(true)} />
        </div>

        {showDel && (
          <div style={{ ...S.card, marginBottom: 16, border: `2px solid ${C.poppy}`, background: C.poppy + "08" }}>
            <p style={{ margin: "0 0 12px", fontWeight: 600, color: C.text }}>Weet je zeker dat je deze wijn wilt verwijderen?</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={S.btn(C.poppy)} onClick={() => deleteWine(selectedWine.id)}>Verwijderen</button>
              <button style={S.btn(C.inputBg, C.text)} onClick={() => setShowDel(false)}>Annuleren</button>
            </div>
          </div>
        )}

        {selectedWine.photo && <img src={selectedWine.photo} alt="Etiket" style={{ width: "100%", maxHeight: 250, objectFit: "cover", borderRadius: 16, marginBottom: 16 }} />}

        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: wcColor, border: "1px solid rgba(128,128,128,0.3)", flexShrink: 0 }} />
            <h3 style={{ ...headingFont, fontSize: 20, margin: 0, color: C.text }}>{selectedWine.name || "Naamloos"}</h3>
          </div>
          {selectedWine.producer && <p style={{ color: C.subtle, margin: "0 0 4px", fontSize: 14 }}>{selectedWine.producer}</p>}
          {!selectedWine.isWishlist && <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 14 }}>
            <span style={{ fontWeight: 600, color: stock > 0 ? C.meadow : C.poppy }}>{stock > 0 ? `${stock} op voorraad` : "Uitgedronken"}</span>
            {selectedWine.vintage && <span style={{ color: C.subtle }}>Jaargang {selectedWine.vintage}</span>}
          </div>}
          {selectedWine.isWishlist && <p style={{ color: C.lupine, fontSize: 14, fontWeight: 600, margin: "8px 0 0" }}>♡ Op wenslijst</p>}
        </div>

        <div style={{ ...S.card, marginBottom: 16 }}>
          {[
            ["Datum toegevoegd", !selectedWine.isWishlist ? formatDate(selectedWine.dateAdded) : null],
            ["Kleur", wc?.label], ["Land", selectedWine.country], ["Regio", selectedWine.region],
            ["Herkomst", !selectedWine.isWishlist && selectedWine.sourceFrom ? (selectedWine.sourceType === "received" ? `Gekregen van ${selectedWine.sourceFrom}` : `Gekocht bij ${selectedWine.sourceFrom}`) : null],
            ["Jaargang", selectedWine.vintage || "N.v.t."],
            ["Drinkvenster", selectedWine.drinkFrom || selectedWine.drinkTo ? `${selectedWine.drinkFrom || "?"} – ${selectedWine.drinkTo || "?"}` : null],
            ["Druiven", selectedWine.grapes.join(", ") || null],
            ["Prijs", selectedWine.price ? `€${selectedWine.price}${selectedWine.priceEstimated ? " (schatting)" : ""}` : null],
            ["Bijzonderheden", selectedWine.specialAttributes.join(", ") || null],
            ["Lekker bij", selectedWine.pairsWith || null], ["Opmerkingen", selectedWine.notes || null],
            ["Totaal flessen", !selectedWine.isWishlist ? (selectedWine.totalBottles || selectedWine.bottleCount) : null],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} style={{ display: "flex", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ width: 140, flexShrink: 0, fontSize: 13, color: C.subtle, fontWeight: 500 }}>{k}</span>
              <span style={{ fontSize: 14, color: C.text }}>{v}</span>
            </div>
          ))}
        </div>

        {selectedWine.checkouts?.length > 0 && (
          <div style={{ ...S.card, marginBottom: 16 }}>
            <h4 style={{ ...headingFont, fontSize: 16, marginTop: 0, color: C.text }}>Uitboekingen</h4>
            {selectedWine.checkouts.map((c, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: i < selectedWine.checkouts.length - 1 ? `1px solid ${C.border}` : "none", fontSize: 14, color: C.text }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{formatDate(c.date)} — {c.quantity}x</span>
                  <span style={{ color: c.reason === "drunk" ? C.lupine : C.cornflower }}>{c.reason === "drunk" ? `Gedronken (${c.score}/10)` : "Weggegeven"}</span>
                </div>
                {c.note && <p style={{ color: C.subtle, margin: "4px 0 0", fontSize: 13 }}>{c.note}</p>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {selectedWine.isWishlist && (
            <button style={{ ...S.btn(C.meadow), width: "100%", justifyContent: "center" }} onClick={() => moveWishlistToInventory(selectedWine.id)}>
              <Check size={18} /> Gekocht! Verplaats naar voorraad
            </button>
          )}
          {!selectedWine.isWishlist && stock > 0 && (
            <button style={{ ...S.btn(C.cornflower), width: "100%", justifyContent: "center" }} onClick={() => setView("checkout")}>Uitboeken</button>
          )}
          {!selectedWine.isWishlist && (
            <button style={{ ...S.btn(C.inputBg, C.text), width: "100%", justifyContent: "center" }} onClick={quickRefill}>
              <Copy size={18} /> Nogmaals toevoegen
            </button>
          )}
        </div>
      </div>
    );
  };

  // ─── Checkout View ───────────────────────────────────────────────────────

  const CheckoutView = () => {
    if (!selectedWine) return null;
    const stock = getStock(selectedWine);
    const [qty, setQty] = useState(1);
    const [reason, setReason] = useState("drunk");
    const [score, setScore] = useState(7);
    const [note, setNote] = useState("");
    return (
      <div style={{ padding: "0 16px 100px" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "16px 0", gap: 12 }}>
          <ChevronLeft size={24} style={{ cursor: "pointer", color: C.text }} onClick={() => setView("detail")} />
          <h2 style={{ ...headingFont, fontSize: 22, margin: 0, color: C.text }}>Uitboeken</h2>
        </div>
        <div style={{ ...S.card, marginBottom: 20 }}>
          <h3 style={{ ...headingFont, margin: "0 0 4px", color: C.text }}>{selectedWine.name}</h3>
          <p style={{ color: C.subtle, margin: 0, fontSize: 14 }}>{stock} op voorraad</p>
        </div>
        <div style={{ marginBottom: 20 }}><label style={S.label}>Aantal</label>
          <select style={{ ...S.input, width: 100 }} value={qty} onChange={e => setQty(Number(e.target.value))}>
            {Array.from({ length: stock }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}</select></div>
        <div style={{ marginBottom: 20 }}><label style={S.label}>Reden</label>
          <div style={{ display: "flex", gap: 10 }}>
            {[{ v: "drunk", l: "Gedronken" }, { v: "given", l: "Weggegeven" }].map(r => (
              <div key={r.v} onClick={() => setReason(r.v)} style={{
                flex: 1, padding: "12px 8px", borderRadius: 10, textAlign: "center", cursor: "pointer",
                border: reason === r.v ? `2px solid ${C.lupine}` : `1.5px solid ${C.border}`,
                background: reason === r.v ? C.lupine + "15" : "transparent",
                fontWeight: reason === r.v ? 600 : 400, fontSize: 14, color: C.text,
              }}>{r.l}</div>
            ))}
          </div></div>
        {reason === "drunk" && <div style={{ marginBottom: 20 }}><label style={S.label}>Score</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <select style={{ ...S.input, width: 80 }} value={score} onChange={e => setScore(Number(e.target.value))}>
              {Array.from({ length: 10 }, (_, i) => 10 - i).map(n => <option key={n} value={n}>{n}</option>)}</select>
            <span style={{ fontSize: 14, color: C.subtle }}>/ 10</span>
            <div style={{ display: "flex", gap: 2 }}>
              {Array.from({ length: 10 }, (_, i) => <Star key={i} size={16} fill={i < score ? C.buttercup : "none"} color={i < score ? C.buttercup : C.border} />)}
            </div>
          </div></div>}
        <div style={{ marginBottom: 20 }}><label style={S.label}>Opmerking</label>
          <textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }} placeholder="Eventuele opmerking" value={note} onChange={e => setNote(e.target.value)} /></div>
        <button style={{ ...S.btn(C.lupine), width: "100%", justifyContent: "center" }} onClick={() => checkoutWine(selectedWine.id, { date: todayStr(), quantity: qty, reason, score: reason === "drunk" ? score : null, note })}>
          <Check size={18} /> Uitboeken
        </button>
      </div>
    );
  };

  // ─── Statistics ──────────────────────────────────────────────────────────

  const StatsView = () => {
    const inStockWines = inventoryWines.filter(w => getStock(w) > 0);
    const totalInStock = inStockWines.reduce((s, w) => s + getStock(w), 0);
    const totalDrunk = inventoryWines.flatMap(w => w.checkouts || []).filter(c => c.reason === "drunk");
    const avgScore = totalDrunk.length > 0 ? (totalDrunk.reduce((s, c) => s + (c.score || 0), 0) / totalDrunk.length).toFixed(1) : "–";
    const colorData = WINE_COLORS.map(wc => ({ name: wc.label, value: inStockWines.filter(w => w.color === wc.value).reduce((s, w) => s + getStock(w), 0), fill: C[wc.colorKey] })).filter(d => d.value > 0);
    const countryData = [...new Set(inStockWines.map(w => w.country))].filter(Boolean).map(c => ({ name: c, value: inStockWines.filter(w => w.country === c).reduce((s, w) => s + getStock(w), 0) })).sort((a, b) => b.value - a.value).slice(0, 8);
    const grapeData = [...new Set(inStockWines.flatMap(w => w.grapes))].filter(Boolean).map(g => ({ name: g, value: inStockWines.filter(w => w.grapes.includes(g)).reduce((s, w) => s + getStock(w), 0) })).sort((a, b) => b.value - a.value).slice(0, 8);
    const statCard = (t, v, a) => (
      <div style={{ ...S.card, textAlign: "center", flex: 1, minWidth: 100 }}>
        <p style={{ color: C.subtle, fontSize: 12, margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5 }}>{t}</p>
        <p style={{ ...headingFont, fontSize: 28, margin: 0, color: a }}>{v}</p>
      </div>
    );
    return (
      <div style={{ padding: "0 16px 100px" }}>
        <div style={{ padding: "16px 0", display: "flex", alignItems: "center" }}><h2 style={{ ...headingFont, fontSize: 22, margin: 0, color: C.text }}>Statistieken</h2></div>
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {statCard("Op voorraad", totalInStock, C.lupine)}{statCard("Gedronken", totalDrunk.length, C.cornflower)}{statCard("Gem. score", avgScore, C.buttercup)}
        </div>
        {colorData.length > 0 && <div style={{ ...S.card, marginBottom: 20 }}>
          <h4 style={{ ...headingFont, fontSize: 16, marginTop: 0, color: C.text }}>Verdeling per kleur</h4>
          <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={colorData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={4} strokeWidth={0}>{colorData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 13 }}>{colorData.map(d => <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 5, color: C.text }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: d.fill }} />{d.name} ({d.value})</span>)}</div>
        </div>}
        {countryData.length > 0 && <div style={{ ...S.card, marginBottom: 20 }}>
          <h4 style={{ ...headingFont, fontSize: 16, marginTop: 0, color: C.text }}>Flessen per land</h4>
          <ResponsiveContainer width="100%" height={Math.max(200, countryData.length * 36)}><BarChart data={countryData} layout="vertical" margin={{ left: 10, right: 20 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: C.text }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>{countryData.map((_, i) => <Cell key={i} fill={ACCENTS[i % ACCENTS.length]} />)}</Bar></BarChart></ResponsiveContainer>
        </div>}
        {grapeData.length > 0 && <div style={{ ...S.card, marginBottom: 20 }}>
          <h4 style={{ ...headingFont, fontSize: 16, marginTop: 0, color: C.text }}>Flessen per druif</h4>
          <ResponsiveContainer width="100%" height={Math.max(200, grapeData.length * 36)}><BarChart data={grapeData} layout="vertical" margin={{ left: 10, right: 20 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: C.text }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>{grapeData.map((_, i) => <Cell key={i} fill={ACCENTS[(i + 2) % ACCENTS.length]} />)}</Bar></BarChart></ResponsiveContainer>
        </div>}
        {wines.length === 0 && <p style={{ textAlign: "center", color: C.subtle, padding: 40 }}>Voeg wijnen toe om statistieken te zien.</p>}
      </div>
    );
  };

  // ─── Export & Import View ────────────────────────────────────────────────

  const ExportView = () => (
    <div style={{ padding: "0 16px 100px" }}>
      <div style={{ padding: "16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ ...headingFont, fontSize: 22, margin: 0, color: C.text }}>Export & Import</h2>
        <button onClick={() => setDarkMode(d => !d)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}>
          {darkMode ? <Sun size={22} color={C.buttercup} /> : <Moon size={22} color={C.lupine} />}
        </button>
      </div>

      <div style={{ ...S.card, marginBottom: 20 }}>
        <h4 style={{ ...headingFont, fontSize: 16, marginTop: 0, color: C.text }}>Backup exporteren</h4>
        <p style={{ fontSize: 14, color: C.subtle, margin: "0 0 16px" }}>Exporteer je wijngegevens als CSV-bestand.</p>
        <button style={S.btn(C.lupine)} onClick={exportCSV}><Download size={18} /> Exporteren als CSV</button>
        {lastBackup && <p style={{ fontSize: 13, color: C.subtle, marginTop: 12, marginBottom: 0 }}>Laatste backup: {formatDate(lastBackup)}</p>}
      </div>

      <div style={{ ...S.card, marginBottom: 20 }}>
        <h4 style={{ ...headingFont, fontSize: 16, marginTop: 0, color: C.text }}>Backup importeren</h4>
        <p style={{ fontSize: 14, color: C.subtle, margin: "0 0 16px" }}>Importeer wijnen uit een eerder geëxporteerd CSV-bestand. Bestaande wijnen blijven behouden.</p>
        <label style={{ ...S.btn(C.cornflower), cursor: "pointer", display: "inline-flex" }}>
          <Upload size={18} /> CSV importeren
          <input type="file" accept=".csv" onChange={handleImport} style={{ display: "none" }} />
        </label>
        {importResult && (
          <p style={{ fontSize: 13, marginTop: 12, marginBottom: 0, color: importResult.ok ? C.meadow : C.poppy, fontWeight: 600 }}>{importResult.msg}</p>
        )}
      </div>

      <div style={{ ...S.card, marginBottom: 20 }}>
        <h4 style={{ ...headingFont, fontSize: 16, marginTop: 0, color: C.text }}>Weergave</h4>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: C.text }}>Donkere modus</span>
          <button onClick={() => setDarkMode(d => !d)} style={{
            width: 52, height: 30, borderRadius: 15, border: "none", cursor: "pointer",
            background: darkMode ? C.lupine : C.border, position: "relative", transition: "background 0.3s",
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 3, left: darkMode ? 25 : 3, transition: "left 0.3s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>
      </div>

      <div style={S.card}>
        <h4 style={{ ...headingFont, fontSize: 16, marginTop: 0, color: C.text }}>Over Kurk</h4>
        <p style={{ fontSize: 14, color: C.subtle, margin: 0 }}>
          {inventoryWines.length} wijn{inventoryWines.length !== 1 ? "en" : ""} in de collectie · {inventoryWines.filter(w => getStock(w) > 0).reduce((s, w) => s + getStock(w), 0)} flessen op voorraad
          {wishlistWines.length > 0 && ` · ${wishlistWines.length} op wenslijst`}
        </p>
      </div>
    </div>
  );

  // ─── Filter Panel ────────────────────────────────────────────────────────

  const FilterPanel = () => {
    const toggle = (k, v) => setFilters(p => ({ ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v] }));
    return (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end" }}
        onClick={e => { if (e.target === e.currentTarget) setShowFilters(false); }}>
        <div style={{ background: C.bg, borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "80vh", overflowY: "auto", padding: "24px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ ...headingFont, margin: 0, fontSize: 20, color: C.text }}>Filters</h3>
            <X size={24} style={{ cursor: "pointer", color: C.text }} onClick={() => setShowFilters(false)} />
          </div>
          <div style={{ marginBottom: 20 }}><label style={S.label}>Kleur</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {WINE_COLORS.map(wc => <span key={wc.value} style={S.chip(filters.colors.includes(wc.value), C[wc.colorKey])} onClick={() => toggle("colors", wc.value)}>{filters.colors.includes(wc.value) && "✓ "}{wc.label}</span>)}
            </div></div>
          <div style={{ marginBottom: 20 }}><label style={S.label}>Land</label>
            <MultiSelectChips options={sortedCountries} selected={filters.countries} onToggle={v => toggle("countries", v)} accent={C.cornflower} C={C} /></div>
          <div style={{ marginBottom: 20 }}><label style={S.label}>Druif</label>
            <MultiSelectChips options={sortedGrapes} selected={filters.grapes} onToggle={v => toggle("grapes", v)} accent={C.meadow} C={C} /></div>
          <div style={{ marginBottom: 20 }}><label style={S.label}>Bijzonderheden</label>
            <MultiSelectChips options={SPECIAL_ATTRIBUTES} selected={filters.attributes} onToggle={v => toggle("attributes", v)} accent={C.buttercup} C={C} /></div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer", color: C.text }}>
              <input type="checkbox" checked={filters.includeOutOfStock} onChange={e => setFilters(p => ({ ...p, includeOutOfStock: e.target.checked }))} />
              Toon ook uitgedronken wijnen
            </label></div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...S.btn(C.lupine), flex: 1, justifyContent: "center" }} onClick={() => setShowFilters(false)}>Toepassen</button>
            <button style={S.btn(C.inputBg, C.text)} onClick={() => setFilters({ colors: [], countries: [], grapes: [], attributes: [], includeOutOfStock: true })}>Reset</button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Wine Card ───────────────────────────────────────────────────────────

  const WineCard = ({ wine, isWishlistCard }) => {
    const stock = isWishlistCard ? null : getStock(wine);
    const isOut = !isWishlistCard && stock <= 0;
    const wc = WINE_COLORS.find(c => c.value === wine.color);
    const wcColor = wc ? C[wc.colorKey] : C.subtle;

    if (displayMode === "list" && !isWishlistCard) {
      return (
        <div onClick={() => { setSelectedWineId(wine.id); setView("detail"); }} style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
          borderBottom: `1px solid ${C.border}`, cursor: "pointer",
          opacity: isOut ? 0.5 : 1, background: isOut ? C.outOfStock + "30" : "transparent",
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: wcColor, flexShrink: 0, border: "1px solid rgba(128,128,128,0.3)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.text }}>{wine.name || "Naamloos"}</p>
            <p style={{ margin: 0, fontSize: 12, color: C.subtle }}>{[wine.producer, wine.vintage, wine.country].filter(Boolean).join(" · ")}</p>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: isOut ? C.poppy : C.meadow, flexShrink: 0 }}>{isOut ? "Op" : `${stock}x`}</span>
        </div>
      );
    }

    return (
      <div onClick={() => { setSelectedWineId(wine.id); setView("detail"); }} style={{
        ...S.card, cursor: "pointer", opacity: isOut ? 0.55 : 1,
        background: isOut ? C.outOfStock + "20" : C.card,
      }}>
        {wine.photo && <img src={wine.photo} alt="" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} />}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: wcColor, border: "1px solid rgba(128,128,128,0.3)" }} />
          <span style={{ fontSize: 11, color: C.subtle, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5 }}>{wc?.label}</span>
          {!isWishlistCard && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: isOut ? C.poppy : C.meadow, background: (isOut ? C.poppy : C.meadow) + "12", padding: "2px 8px", borderRadius: 8 }}>{isOut ? "Op" : `${stock}x`}</span>}
          {isWishlistCard && <span style={{ marginLeft: "auto", fontSize: 12, color: C.lupine }}>♡</span>}
        </div>
        <h4 style={{ ...headingFont, margin: "0 0 4px", fontSize: 16, color: C.text }}>{wine.name || "Naamloos"}</h4>
        <p style={{ margin: 0, fontSize: 13, color: C.subtle }}>{[wine.producer, wine.vintage, wine.country, wine.region].filter(Boolean).join(" · ")}</p>
        {wine.grapes.length > 0 && <p style={{ margin: "6px 0 0", fontSize: 12, color: C.lupine }}>{wine.grapes.join(", ")}</p>}
      </div>
    );
  };

  // ─── Inventory View ──────────────────────────────────────────────────────

  const InventoryView = () => {
    const af = filters.colors.length + filters.countries.length + filters.grapes.length + filters.attributes.length + (!filters.includeOutOfStock ? 1 : 0);
    return (
      <div style={{ padding: "0 16px 100px" }}>
        <div style={{ padding: "20px 0 12px", display: "flex", alignItems: "center", gap: 12 }}>
          <Wine size={28} color={C.lupine} />
          <h1 style={{ ...headingFont, fontSize: 28, margin: 0, color: C.lupine }}>Kurk</h1>
          <span style={{ fontSize: 14, color: C.subtle, marginLeft: "auto" }}>{inventoryWines.filter(w => getStock(w) > 0).reduce((s, w) => s + getStock(w), 0)} flessen</span>
          <button onClick={() => setDarkMode(d => !d)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            {darkMode ? <Sun size={20} color={C.buttercup} /> : <Moon size={20} color={C.subtle} />}
          </button>
        </div>

        {showDataLossWarning && (
          <div style={{ ...S.card, marginBottom: 16, border: `2px solid ${C.poppy}`, background: C.poppy + "08" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <AlertCircle size={22} color={C.poppy} style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.poppy }}>Gegevens niet gevonden</p>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.5, color: C.text }}>Het lijkt erop dat je eerder wijnen had opgeslagen, maar de gegevens zijn verdwenen. Dit kan gebeuren als je browsergegevens hebt gewist. Heb je een CSV-backup? Die kun je importeren via Export & Import.</p>
            <button style={{ ...S.btn(C.poppy), padding: "10px 16px", fontSize: 13 }} onClick={() => { setShowDataLossWarning(false); clearDataCookie(); }}>Begrepen</button>
          </div>
        )}

        {showBackupReminder && (
          <div style={{ ...S.card, marginBottom: 16, border: `2px solid ${C.buttercup}`, background: C.buttercup + "10", display: "flex", alignItems: "center", gap: 12 }}>
            <AlertCircle size={20} color={C.buttercup} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>Tijd voor een backup!</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.subtle }}>{lastBackup ? `Laatste: ${formatDate(lastBackup)}` : "Je hebt nog geen backup gemaakt"}</p>
            </div>
            <button style={{ ...S.btn(C.buttercup, C.text), padding: "8px 14px", fontSize: 13 }} onClick={exportCSV}><Download size={14} /> Nu</button>
          </div>
        )}

        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.subtle }} />
          <input style={{ ...S.input, paddingLeft: 40 }} placeholder="Zoek op naam, druif, land, opmerking..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          {searchQuery && <X size={18} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: C.subtle }} onClick={() => setSearchQuery("")} />}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <button onClick={() => setShowFilters(true)} style={{ ...S.btn(af > 0 ? C.lupine : C.inputBg, af > 0 ? "#fff" : C.text), padding: "8px 14px", fontSize: 13 }}>
            <Filter size={14} /> Filters {af > 0 && `(${af})`}</button>
          <select style={{ ...S.input, width: "auto", padding: "8px 12px", fontSize: 13 }} value={`${sortBy}-${sortDir}`}
            onChange={e => { const [f, d] = e.target.value.split("-"); setSortBy(f); setSortDir(d); }}>
            <option value="dateAdded-desc">Nieuwste eerst</option><option value="dateAdded-asc">Oudste eerst</option>
            <option value="name-asc">Naam A→Z</option><option value="name-desc">Naam Z→A</option>
            <option value="country-asc">Land A→Z</option><option value="vintage-desc">Jaargang nieuw→oud</option>
            <option value="vintage-asc">Jaargang oud→nieuw</option><option value="price-desc">Prijs hoog→laag</option>
            <option value="price-asc">Prijs laag→hoog</option>
          </select>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            <button onClick={() => setDisplayMode("card")} style={{ background: displayMode === "card" ? C.lupine + "20" : "transparent", border: "none", borderRadius: 8, padding: 6, cursor: "pointer" }}><Grid3X3 size={18} color={displayMode === "card" ? C.lupine : C.subtle} /></button>
            <button onClick={() => setDisplayMode("list")} style={{ background: displayMode === "list" ? C.lupine + "20" : "transparent", border: "none", borderRadius: 8, padding: 6, cursor: "pointer" }}><List size={18} color={displayMode === "list" ? C.lupine : C.subtle} /></button>
          </div>
        </div>

        {filteredWines.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.subtle }}>
            <Wine size={48} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ ...headingFont, fontSize: 18 }}>{inventoryWines.length === 0 ? "Je wijnkelder is nog leeg" : "Geen resultaten gevonden"}</p>
            <p style={{ fontSize: 14 }}>{inventoryWines.length === 0 ? "Voeg je eerste fles toe!" : "Pas je zoekopdracht of filters aan"}</p>
          </div>
        ) : displayMode === "card" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{filteredWines.map(w => <WineCard key={w.id} wine={w} />)}</div>
        ) : (
          <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>{filteredWines.map(w => <WineCard key={w.id} wine={w} />)}</div>
        )}
      </div>
    );
  };

  // ─── Wishlist View ───────────────────────────────────────────────────────

  const WishlistView = () => (
    <div style={{ padding: "0 16px 100px" }}>
      <div style={{ padding: "20px 0 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <Heart size={28} color={C.lupine} />
        <h1 style={{ ...headingFont, fontSize: 28, margin: 0, color: C.lupine }}>Wenslijst</h1>
        <span style={{ fontSize: 14, color: C.subtle, marginLeft: "auto" }}>{wishlistWines.length} wijn{wishlistWines.length !== 1 ? "en" : ""}</span>
      </div>

      {wishlistWines.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: C.subtle }}>
          <Heart size={48} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ ...headingFont, fontSize: 18 }}>Je wenslijst is nog leeg</p>
          <p style={{ fontSize: 14 }}>Voeg wijnen toe die je wilt onthouden</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {wishlistWines.map(w => <WineCard key={w.id} wine={w} isWishlistCard />)}
        </div>
      )}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  const navItems = [
    { icon: Wine, label: "Voorraad", v: "inventory" },
    { icon: Plus, label: "Toevoegen", v: "add" },
    { icon: Heart, label: "Wenslijst", v: "wishlist" },
    { icon: BarChart3, label: "Statistieken", v: "stats" },
    { icon: Download, label: "Meer", v: "export" },
  ];

  return (
    <div style={S.base}>
      <style>{fontImport}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
        {view === "inventory" && <InventoryView />}
        {view === "add" && <WineForm initial={emptyWine()} onSave={addWine} title="Wijn toevoegen" />}
        {view === "addWishlist" && <WineForm initial={emptyWine(true)} onSave={addWishlistWine} title="Toevoegen aan wenslijst" backView="wishlist" />}
        {view === "edit" && selectedWine && <WineForm initial={{ ...selectedWine }} onSave={updateWine} title="Wijn bewerken" backView="detail" />}
        {view === "detail" && <WineDetail />}
        {view === "checkout" && <CheckoutView />}
        {view === "wishlist" && <WishlistView />}
        {view === "stats" && <StatsView />}
        {view === "export" && <ExportView />}
      </div>

      {showFilters && <FilterPanel />}

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: C.card, borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-around",
        padding: "8px 0 env(safe-area-inset-bottom, 8px)", zIndex: 90,
      }}>
        {navItems.map(({ icon: Icon, label: lbl, v }) => {
          const isActive = view === v || (v === "add" && view === "addWishlist");
          return (
            <button key={v} onClick={() => {
              if (v === "add" && view === "wishlist") { setView("addWishlist"); return; }
              setView(v); if (v !== "detail") setSelectedWineId(null);
            }}
              style={{
                background: "none", border: "none", padding: "6px 12px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                color: isActive ? C.lupine : C.subtle,
                fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: isActive ? 600 : 400,
              }}>
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.5} />
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}
