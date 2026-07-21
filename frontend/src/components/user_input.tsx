
import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { useTranslation } from 'react-i18next';
import { usePageState } from "../utils/usePageState";
import type { Site, Sys } from "../types";
import LogigramModal from "./LogigramModal";
import { useSite } from "./SiteContext";
import "../styles/user_input.css";
import "../styles/dropdown.css";
import type React from "preact/compat";
const apiUrl = import.meta.env.VITE_BACKEND_URL;


// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Parse an error response body into a displayable string. */
async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const parsed = await res.json().catch(() => null);
    if (parsed) return parsed.detail ?? (typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
    const txt = await res.text().catch(() => null);
    if (txt) return txt;
  } catch { /* ignore */ }
  return fallback;
}

/** Common form-status state: loading, message, messageType. */
function useFormStatus() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"error" | "success" | null>(null);

  const showError = useCallback((msg: string) => { setMessage(msg); setMessageType("error"); }, []);
  const showSuccess = useCallback((msg: string) => { setMessage(msg); setMessageType("success"); }, []);
  const clearMessage = useCallback(() => { setMessage(null); setMessageType(null); }, []);

  return { loading, setLoading, message, messageType, showError, showSuccess, clearMessage } as const;
}

/** Status message banner reused across forms. */
function StatusMessage({ message, messageType }: { message: string | null; messageType: "error" | "success" | null }) {
  if (!message) return null;
  return <div className={`link-message ${messageType === 'error' ? 'link-error' : ''}`}>{message}</div>;
}

// ─── AddSystem (batch with single-item fallback) ─────────────────────────────

const AddSystem = () => {
  const { t } = useTranslation();
  const { site: selectedSite } = useSite();
  const [rows, setRows] = useState<{
    nomenclature: string;
    categorie: string;
    description: string;
    sector: string;
    owner: string;
    user: string;
    criticality: boolean;
    admin: string;
    admin_backup: string;
    access_manager: string;
  }[]>([
    {
      nomenclature: "",
      categorie: "",
      description: "",
      sector: "",
      owner: "",
      user: "",
      criticality: false,
      admin: "",
      admin_backup: "",
      access_manager: "",
    },
  ]);
  const { loading, setLoading, message, messageType, clearMessage } = useFormStatus();
  const [logigramOpen, setLogigramOpen] = useState(false);
  const [logigramRowIdx, setLogigramRowIdx] = useState<number | null>(null);

  const handleLogigramOpen = (idx: number) => {
    setLogigramRowIdx(idx);
    setLogigramOpen(true);
  };

  const handleLogigramComplete = (category: number) => {
    if (logigramRowIdx !== null) {
      updateRow(logigramRowIdx, 'categorie', String(category));
    }
    setLogigramOpen(false);
    setLogigramRowIdx(null);
  };

  const updateRow = (index: number, key: string, value: any) => {
    setRows(r => r.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const addRow = () => setRows(r => [
    ...r,
    {
      nomenclature: "",
      categorie: "",
      description: "",
      sector: "",
      owner: "",
      user: "",
      criticality: false,
      admin: "",
      admin_backup: "",
      access_manager: "",
    },
  ]);
  const removeRow = (index: number) => setRows(r => r.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessage();

    if (!selectedSite) {
      alert(t('select_site_first'));
      return;
    }

    const payload = {
      site_id: selectedSite.id,
      systems_names: rows.map(r => r.nomenclature),
      systems_descriptions: rows.map(r => r.description),
      systems_categories: rows.map(r => Number(r.categorie)),
      systems_sectors: rows.map(r => r.sector),
      systems_owners: rows.map(r => r.owner),
      systems_users: rows.map(r => r.user),
      criticalities: rows.map(r => Boolean(r.criticality)),
      systems_admins: rows.map(r => r.admin),
      systems_admin_backups: rows.map(r => r.admin_backup),
      systems_access_managers: rows.map(r => r.access_manager),
    };
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/add_local_system/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(t('systems_added_success'));
        window.location.reload();
        return;
      }

      const errText = await parseApiError(res, `Endpoint returned ${res.status}`);
      console.error('API error response:', errText);
      alert(`API error: ${errText}`);
    } catch (err) {
      console.error("AddSystem error", err);
      alert(t('error_adding_systems'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ui-form-container">
      <form onSubmit={handleSubmit} className="ui-form">
        {rows.map((row, idx) => (
          <div key={idx} style={{
            backgroundColor: '#2d3a52',
            border: '1px solid #3a4757',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
            transition: 'box-shadow 0.2s'
          }}>
            {/* Header with system number and delete button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #3a4757' }}>
              <h3 style={{ margin: 0, color: '#e8eaed', fontSize: '16px', fontWeight: '600' }}>
                {t('system')} #{idx + 1}
              </h3>
              {rows.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => removeRow(idx)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#4a3333',
                    color: '#ffb3b3',
                    border: '1px solid #5a4444',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#553d3d')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4a3333')}
                >
                  ✕ {t('button.delete')}
                </button>
              )}
            </div>

            {/* Form fields grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {/* Identifier */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#bcc4ca' }}>Identifier *</label>
                <input 
                  value={row.nomenclature} 
                  onInput={e => updateRow(idx, 'nomenclature', (e.target as HTMLInputElement).value)} 
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #3a4757',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: '#1f2937',
                    color: '#e8eaed'
                  }}
                  required 
                />
              </div>

              {/* Category */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#bcc4ca' }}>{t('category')} *</label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                  <select 
                    value={row.categorie} 
                    onChange={e => updateRow(idx, 'categorie', (e.target as HTMLSelectElement).value)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '10px 12px',
                      border: '1px solid #3a4757',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      backgroundColor: '#1f2937',
                      color: '#e8eaed'
                    }}
                    required
                  >
                    <option value="">{t('category')}</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleLogigramOpen(idx)}
                    style={{
                      width: '36px',
                      height: '36px',
                      minWidth: '36px',
                      padding: '0',
                      border: '1px solid #3a4757',
                      borderRadius: '6px',
                      backgroundColor: '#0066cc',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '700',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0052a3')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0066cc')}
                    title={t('logigram.title')}
                  >
                    ?
                  </button>
                </div>
              </div>

              {/* Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#bcc4ca' }}>{t('description')}</label>
                <input 
                  value={row.description} 
                  onInput={e => updateRow(idx, 'description', (e.target as HTMLInputElement).value)} 
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #3a4757',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: '#1f2937',
                    color: '#e8eaed'
                  }}
                />
              </div>

              {/* Sector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#bcc4ca' }}>{t('sector')}</label>
                <input 
                  value={row.sector} 
                  onInput={e => updateRow(idx, 'sector', (e.target as HTMLInputElement).value)} 
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #3a4757',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: '#1f2937',
                    color: '#e8eaed'
                  }}
                />
              </div>

              {/* User */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#bcc4ca' }}>{t('user')}</label>
                <input 
                  value={row.user} 
                  onInput={e => updateRow(idx, 'user', (e.target as HTMLInputElement).value)} 
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #3a4757',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: '#1f2937',
                    color: '#e8eaed'
                  }}
                />
              </div>

              {/* Admin */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#bcc4ca' }}>{t('admin')}</label>
                <input 
                  value={row.admin} 
                  onInput={e => updateRow(idx, 'admin', (e.target as HTMLInputElement).value)} 
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #3a4757',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: '#1f2937',
                    color: '#e8eaed'
                  }}
                />
              </div>



              {/* Criticality Checkbox */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#e8eaed' }}>
                  <input 
                    type="checkbox" 
                    checked={row.criticality} 
                    onChange={e => updateRow(idx, 'criticality', (e.target as HTMLInputElement).checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  {t('criticality')}
                </label>
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            onClick={addRow}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3a4757',
              color: '#bcc4ca',
              border: '1.5px solid #4a5563',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#444a5f';
              e.currentTarget.style.borderColor = '#555b70';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3a4757';
              e.currentTarget.style.borderColor = '#4a5563';
            }}
          >
            + {t('button.add_another_system')}
          </button>
          <button 
            type="submit" 
            disabled={loading}
            style={{
              padding: '12px 32px',
              backgroundColor: loading ? '#555b70' : '#4a5f79',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#3d4d63'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#4a5f79'; }}
          >
            {loading ? t('button.sending') : t('button.add_systems')}
          </button>
        </div>
        <StatusMessage message={message} messageType={messageType} />
      </form>
      <LogigramModal
        isOpen={logigramOpen}
        onClose={() => setLogigramOpen(false)}
        onComplete={handleLogigramComplete}
      />
    </div>
  );
};

// ─── Shared Dropdown (used by both SiteDropdown & SystemDropdown) ─────────────

interface DropdownProps<T extends { id: number; name: string }> {
  items: T[];
  value: T | null;
  placeholder?: string;
  disabled?: boolean;
  disabledText?: string;
  emptyText?: string;
  onChange?: (item: T | null) => void;
}

function Dropdown<T extends { id: number; name: string }>({
  items, value, placeholder, disabled, disabledText, emptyText, onChange,
}: DropdownProps<T>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const label = value ? (value.name ?? String(value.id)) : null;

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (open) {
      setSearch("");
      setHighlight(-1);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = search.trim() === ""
    ? items
    : items.filter(it => (it.name ?? "").toLowerCase().includes(search.trim().toLowerCase()));

  const select = (it: T) => {
    setOpen(false);
    setSearch("");
    setHighlight(-1);
    onChange?.(it);
  };

  const onSearchKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (highlight >= 0 && highlight < filtered.length) select(filtered[highlight]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="site-dropdown" ref={ref}>
      <button
        type="button"
        className={`sd-toggle ${disabled ? "sd-disabled" : ""}`}
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled}
        disabled={disabled}
      >
        <span className="sd-label">{label || (disabled ? disabledText : placeholder) || ''}</span>
        <span className="sd-caret">&#x25BE;</span>
      </button>
      {open && (
        <ul className="sd-list" role="listbox">
          <li className="sd-search">
            <input
              ref={inputRef}
              type="search"
              placeholder={t('search')}
              value={search}
              onInput={e => { setSearch((e.target as HTMLInputElement).value); setHighlight(0); }}
              onKeyDown={e => onSearchKeyDown(e as unknown as KeyboardEvent)}
              onClick={e => e.stopPropagation()}
            />
          </li>
          {filtered.length === 0 && (
            <li className="sd-empty">
              {items.length === 0 ? (emptyText || t('no_result')) : t('no_result')}
            </li>
          )}
          {filtered.map((it, idx) => (
            <li
              key={String(it.id)}
              className={`sd-item ${idx === highlight ? 'highlight' : ''}`}
              role="option"
              onMouseEnter={() => setHighlight(idx)}
              onClick={() => select(it)}
            >
              <div className="sd-item-title">{it.name ?? String(it.id)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── SystemDropdown ──────────────────────────────────────────────────────────

interface SystemDropdownProps {
  placeholder?: string;
  onChange?: (s: Sys | null) => void;
  value?: Sys | null;
  siteId?: number | string;
  excludeIds?: number[];
  items?: Sys[];
}

function SystemDropdown(props: SystemDropdownProps) {
  const { placeholder, onChange, value, siteId, excludeIds, items } = props;
  const { t } = useTranslation();
  const locked = siteId == null;
  const [fetchedItems, setFetchedItems] = useState<Sys[]>([]);

  // Fetch systems when siteId changes and items not provided
  useEffect(() => {
    if (items != null || siteId == null) {
      setFetchedItems([]);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const url = `${apiUrl}/api/get_systems_by_site/?site_id=${encodeURIComponent(String(siteId))}`;
        const r = await fetch(url);
        if (!r.ok) { if (mounted) setFetchedItems([]); return; }
        const data = await r.json();
        if (!mounted) return;
        const list = Array.isArray(data) ? data : [];
        setFetchedItems(list.map((i: any) => Array.isArray(i)
          ? { id: i[0], name: i[1], critical: i[2], local: i[3], sys_user: i[4] }
          : { id: i.id ?? i.id_system, name: i.name, critical: i.critical, local: i.local, sys_user: i.sys_user }
        ));
      } catch { if (mounted) setFetchedItems([]); }
    })();
    return () => { mounted = false; };
  }, [siteId, items]);

  const dropdownItems: Sys[] = items ?? fetchedItems;
  const visible = dropdownItems.filter((it: Sys) => (value && it.id === value.id) || !(excludeIds?.includes(it.id)));
  return (
    <Dropdown<Sys>
      items={visible}
      value={value ?? null}
      placeholder={placeholder}
      disabled={locked}
      disabledText={t('select_site_first')}
      emptyText={locked ? t('select_site_first') : t('no_system')}
      onChange={onChange}
    />
  );
}

// ─── SiteDropdown ────────────────────────────────────────────────────────────

function SiteDropdown({ fetchUrl, placeholder, onChange, value }: {
  fetchUrl?: string;
  placeholder?: string;
  onChange?: (s: Site | null) => void;
  value?: Site | null;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Site[]>([]);

  useEffect(() => {
    const url = fetchUrl ?? `${apiUrl}/api/get_sites`;
    let mounted = true;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : (Array.isArray(data.sites) ? data.sites : (Array.isArray(data.results) ? data.results : []));
        setItems(list.map((i: any) => ({ id: i.id, name: i.name ?? i.nom_du_site ?? i.nom })));
      })
      .catch(() => setItems([]));
    return () => { mounted = false; };
  }, [fetchUrl]);

  return (
    <Dropdown<Site>
      items={items}
      value={value ?? null}
      placeholder={placeholder || t('select_site')}
      emptyText={t('no_sites')}
      onChange={onChange}
    />
  );
}

// ─── ManualDataEntryForm ─────────────────────────────────────────────────────



interface FormRow {
  question_id: number;
  question_text: string;
  theme: string;
  sub_theme: string;
  acceptance_criteria: string;
  conformity: string;      // "" | "yes" | "no"
  comment: string;
  gap: string;
  effect: string;
  detectability: number;
  occurrence: number;
}


function ManualDataEntryForm() {
  const { t, i18n } = useTranslation();
  const { site: selectedSite } = useSite();
  const [selectedSystem, setSelectedSystem] = usePageState<Sys | null>('manualEntry_selectedSystem', null);
  const [rows, setRows] = useState<FormRow[]>([]);
  const [themeFilter, setThemeFilter] = useState<string>("");
  const [subThemeFilter, setSubThemeFilter] = useState<string>("");
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [criteriaModal, setCriteriaModal] = useState<{ isOpen: boolean; content: string; questionText: string }>({ isOpen: false, content: "", questionText: "" });

  const { loading, setLoading, message, messageType, showError, clearMessage } = useFormStatus();

  // Extract unique themes and subthemes from rows
  const themes = Array.from(new Set(rows.map(r => r.theme).filter(Boolean)));
  const subThemes = Array.from(new Set(
    rows.filter(r => !themeFilter || r.theme === themeFilter).map(r => r.sub_theme).filter(Boolean)
  ));

  const [selectedQuestion, setSelectedQuestion] = useState<number | "">("");

  // Filter rows based on selected theme, sub-theme, and question
  const filteredRows = rows.filter(r => {
    if (themeFilter && r.theme !== themeFilter) return false;
    if (subThemeFilter && r.sub_theme !== subThemeFilter) return false;
    if (selectedQuestion !== "" && r.question_id !== selectedQuestion) return false;
    return true;
  });

  // Question options based on theme and sub-theme filters
  const questionOptions = Array.from(
    new Set(
      rows
        .filter(r => {
          if (themeFilter && r.theme !== themeFilter) return false;
          if (subThemeFilter && r.sub_theme !== subThemeFilter) return false;
          return true;
        })
        .map(r => r.question_id)
    )
  ).sort((a, b) => a - b);



  // Fetch checklist questions when a system is selected
  useEffect(() => {
    setRows([]);
    clearMessage();
    if (!selectedSystem) return;

    let mounted = true;
    setQuestionsLoading(true);

    (async () => {
      try {
        const language = i18n.language === 'en' ? 'en' : 'fr';
        const res = await fetch(
          `${apiUrl}/api/get_checklist_by_system_category/?system_name=${encodeURIComponent(selectedSystem.name)}&language=${language}`
        );
        if (!res.ok) {
          if (mounted) showError(t('manual_entry.cannot_load_questions'));
          return;
        }
        const data = await res.json();
        if (!mounted) return;

        const list = Array.isArray(data) ? data : (data.results ?? data.questions ?? []);
        
        const processedList = list.map((q: any) => ({
          question_id: q.ID ?? q.id ?? 0,
          question_text: q.Question ?? q.question ?? "",
          theme: q.Theme ?? q.theme ?? "",
          sub_theme: q["Sub-theme"] ?? q.sub_theme ?? "",
          acceptance_criteria: q["Acceptance Criteria"] ?? q.acceptance_criteria ?? "",
          conformity: "",
          comment: "",
          gap: "",
          effect: "",
          severity: "",
          occurrence: "",
          detectability: "",
        }));
        
        if (mounted) setRows(processedList);
      } catch {
        if (mounted) showError(t('manual_entry.cannot_load_questions'));
      } finally {
        if (mounted) setQuestionsLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [selectedSystem?.id, i18n.language]);

  const updateRow = (idx: number, key: keyof FormRow, value: string) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      return { ...r, [key]: value };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessage();

    if (!selectedSite || !selectedSystem) {
      showError(t('select_site_and_system_required'));
      return;
    }

    const filledRows = rows.filter(r => r.conformity !== "");
    if (filledRows.length === 0) {
      showError(t('manual_entry.fill_at_least_one'));
      return;
    }

    const payload = {
      site_id: selectedSite.id,
      system_id: selectedSystem.id,
      question_id: filledRows.map(r => r.question_id),
      conformity_to_criteria: filledRows.map(r => r.conformity === "yes" ? true : (r.conformity === "no" ? false : null)),
      gap_description: filledRows.map(r => r.gap || ""),
      effect: filledRows.map(r => r.effect || ""),
      detectability: filledRows.map(r => r.detectability ? Number(r.detectability) : 0),
      occurrence: filledRows.map(r => r.occurrence ? Number(r.occurrence) : 0),
      comment: filledRows.map(r => r.comment || ""),
    };

    console.log('manual_data_entry payload', payload);

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/manual_data_entry/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        showError(await parseApiError(res, t('server_error')));
        return;
      }
      alert('Responses added successfully');
      window.location.reload();
    } catch {
      showError(t('unexpected_error'));
    } finally {
      setLoading(false);
    }
  };

  const answeredCount = rows.filter(r => r.conformity !== "").length;
  const ncCount = rows.filter(r => r.conformity === "no").length;

  // Filter systems for dropdown
  const [systemList, setSystemList] = useState<Sys[]>([]);
  useEffect(() => {
    if (!selectedSite?.id) { setSystemList([]); return; }
    let mounted = true;
    (async () => {
      try {
        const url = `${apiUrl}/api/get_systems_by_site/?site_id=${encodeURIComponent(String(selectedSite.id))}`;
        const r = await fetch(url);
        if (!r.ok) { if (mounted) { setSystemList([]); } return; }
        const data = await r.json();
        if (!mounted) return;
        // New backend returns list of objects with id, name, critical, local, sys_user
        const list = Array.isArray(data) ? data : [];
        setSystemList(list.map((i: any) => Array.isArray(i)
          ? { id: i[0], name: i[1], critical: i[2], local: i[3], sys_user: i[4] }
          : { id: i.id ?? i.id_system, name: i.name, critical: i.critical, local: i.local, sys_user: i.sys_user }
        ));
      } catch { if (mounted) { setSystemList([]); } }
    })();
    return () => { mounted = false; };
  }, [selectedSite?.id]);

  const filteredSystems = systemList;

  return (
    <div className="ui-form-container">
      <form className="ui-form" onSubmit={handleSubmit}>
        {/* System Selection and Progress */}
        <div style={{
          backgroundColor: '#232e42',
          border: '1px solid #3a4757',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#bcc4ca', marginBottom: '8px' }}>
                {t('select_system')}
              </label>
              <SystemDropdown
                value={selectedSystem}
                onChange={setSelectedSystem}
                siteId={selectedSite?.id}
                placeholder={t('select_system')}
                items={filteredSystems}
              />
            </div>
            {rows.length > 0 && (
              <div className="me-progress-badge" style={{ 
                backgroundColor: 'rgba(58, 71, 87, 0.8)',
                border: '1px solid #4a5563',
                padding: '10px 16px',
                borderRadius: '6px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#e8eaed' }}>
                  {answeredCount}/{rows.length} {t('manual_entry.answered')}
                </span>
                {ncCount > 0 && (
                  <span style={{ 
                    backgroundColor: 'rgba(255, 92, 92, 0.2)',
                    color: '#ff7b7b',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {ncCount} NC
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Theme, Sub-theme, and Question Filters */}
        {rows.length > 0 && (
          <div style={{
            backgroundColor: '#232e42',
            border: '1px solid #3a4757',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#bcc4ca', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('theme')}
                </label>
                <select
                  value={themeFilter}
                  onChange={e => {
                    setThemeFilter((e.target as HTMLSelectElement).value);
                    setSubThemeFilter("");
                    setSelectedQuestion("");
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #3a4757',
                    borderRadius: '6px',
                    color: '#e8eaed',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="">{t('all')}</option>
                  {themes.map(theme => (
                    <option key={theme} value={theme}>{theme}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#bcc4ca', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('sub_theme')}
                </label>
                <select
                  value={subThemeFilter}
                  onChange={e => {
                    setSubThemeFilter((e.target as HTMLSelectElement).value);
                    setSelectedQuestion("");
                  }}
                  disabled={subThemes.length === 0}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #3a4757',
                    borderRadius: '6px',
                    color: '#e8eaed',
                    fontSize: '14px',
                    cursor: subThemes.length === 0 ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: subThemes.length === 0 ? 0.5 : 1
                  }}
                >
                  <option value="">{t('all')}</option>
                  {subThemes.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#bcc4ca', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('question')}
                </label>
                <select
                  value={selectedQuestion === "" ? "" : String(selectedQuestion)}
                  onChange={e => {
                    const target = e.target as HTMLSelectElement;
                    setSelectedQuestion(target.value === "" ? "" : Number(target.value));
                  }}
                  disabled={questionOptions.length === 0}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #3a4757',
                    borderRadius: '6px',
                    color: '#e8eaed',
                    fontSize: '14px',
                    cursor: questionOptions.length === 0 ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: questionOptions.length === 0 ? 0.5 : 1
                  }}
                >
                  <option value="">{t('all')}</option>
                  {questionOptions.map(qid => (
                    <option key={qid} value={qid}>{`Q${qid}`}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {questionsLoading && (
          <div className="me-loading">
            <div className="me-spinner" />
            <span>{t('manual_entry.loading_questions')}</span>
          </div>
        )}

        {/* Empty state */}
        {!questionsLoading && selectedSystem && rows.length === 0 && !message && (
          <div className="me-empty">{t('manual_entry.no_questions')}</div>
        )}

        {/* Questions Table */}
        {!questionsLoading && rows.length > 0 && (
          <div className="me-table-container">
            {filteredRows.length > 0 ? (
              <table className="me-questions-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>Q#</th>
                    <th style={{ width: '250px' }}>{t('manual_entry.column_question')}</th>
                    <th style={{ width: '80px' }}>{t('manual_entry.column_conformity')}</th>
                    <th style={{ width: '150px' }}>{t('manual_entry.column_gap')}</th>
                    <th style={{ width: '150px' }}>{t('manual_entry.column_effect')}</th>
                    <th style={{ width: '60px' }}>{t('manual_entry.column_detectability')}</th>
                    <th style={{ width: '60px' }}>{t('manual_entry.column_occurrence')}</th>
                    <th style={{ width: '120px' }}>{t('manual_entry.column_comment')}</th>
                    <th style={{ width: '60px' }}>{t('details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const originalIdx = rows.findIndex(r => r.question_id === row.question_id);
                    const isNC = row.conformity === "no";
                    const isOK = row.conformity === "yes";
                    const isNA = row.conformity === "na";
                    return (
                      <tr
                        key={row.question_id}
                        className={`me-table-row${isNC ? " me-row--nc" : ""}${isOK ? " me-row--ok" : ""}${isNA ? " me-row--na" : ""}`}
                      >
                        <td className="me-cell-qnum">Q{row.question_id}</td>
                        <td className="me-cell-question" title={row.question_text}>
                          {row.question_text}
                        </td>
                        <td className="me-cell-conformity">
                          <div className="me-conf-buttons-inline">
                            <button
                              type="button"
                              className={`me-conf-btn-inline me-conf-yes${isOK ? " active" : ""}`}
                              onClick={() => updateRow(originalIdx, "conformity", isOK ? "" : "yes")}
                              title={t('manual_entry.yes')}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className={`me-conf-btn-inline me-conf-no${isNC ? " active" : ""}`}
                              onClick={() => updateRow(originalIdx, "conformity", isNC ? "" : "no")}
                              title={t('manual_entry.no')}
                            >
                              ✕
                            </button>
                            <button
                              type="button"
                              className={`me-conf-btn-inline me-conf-na${isNA ? " active" : ""}`}
                              onClick={() => updateRow(originalIdx, "conformity", isNA ? "" : "na")}
                              title={t('manual_entry.na')}
                            >
                              –
                            </button>
                          </div>
                        </td>
                        <td className="me-cell-input">
                          <textarea
                            value={row.gap}
                            onInput={e => updateRow(originalIdx, 'gap', (e.target as HTMLTextAreaElement).value)}
                            placeholder="Gap..."
                            disabled={!isNC}
                            className="me-input-textarea"
                            rows={1}
                          />
                        </td>
                        <td className="me-cell-effect">
                          <textarea
                            value={row.effect}
                            onInput={e => updateRow(originalIdx, 'effect', (e.target as HTMLTextAreaElement).value)}
                            placeholder="Effect..."
                            disabled={!isNC}
                            className="me-input-textarea"
                            rows={1}
                          />
                        </td>
                        <td className="me-cell-input">
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={row.detectability}
                            onInput={e => updateRow(originalIdx, 'detectability', (e.target as HTMLInputElement).value)}
                            placeholder="1-5"
                            disabled={!isNC}
                            className="me-input-number"
                          />
                        </td>
                        <td className="me-cell-input">
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={row.occurrence}
                            onInput={e => updateRow(originalIdx, 'occurrence', (e.target as HTMLInputElement).value)}
                            placeholder="1-5"
                            disabled={!isNC}
                            className="me-input-number"
                          />
                        </td>
                        <td className="me-cell-input">
                          <textarea
                            value={row.comment}
                            onInput={e => updateRow(originalIdx, 'comment', (e.target as HTMLTextAreaElement).value)}
                            placeholder="..."
                            disabled={!isOK && !isNA}
                            className="me-input-textarea"
                            rows={1}
                          />
                        </td>
                        <td className="me-cell-info">
                          <button
                            type="button"
                            className="me-info-btn"
                            onClick={() => setCriteriaModal({ isOpen: true, content: row.acceptance_criteria, questionText: row.question_text })}
                            title={t('manual_entry.show_criteria')}
                            disabled={!row.acceptance_criteria}
                          >
                            ℹ
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="me-empty">{t('no_result')}</div>
            )}
          </div>
        )}

        {/* Submit */}
        {rows.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="submit" className="ui-submit" disabled={loading || answeredCount === 0}>
              {loading ? t('button.sending') : t('manual_entry.submit')}
            </button>
          </div>
        )}

        <StatusMessage message={message} messageType={messageType} />
      </form>

      {/* Criteria Modal */}
      {criteriaModal.isOpen && (
        <div className="me-modal-overlay" onClick={() => setCriteriaModal({ isOpen: false, content: "", questionText: "" })}>
          <div className="me-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="me-modal-header">
              <h3>{criteriaModal.questionText}</h3>
              <button
                className="me-modal-close"
                onClick={() => setCriteriaModal({ isOpen: false, content: "", questionText: "" })}
              >
                ×
              </button>
            </div>
            <div className="me-modal-body">
              <p>{criteriaModal.content}</p>
            </div>
            <div className="me-modal-footer">
              <button
                className="me-modal-btn"
                onClick={() => setCriteriaModal({ isOpen: false, content: "", questionText: "" })}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DeleteSystem ────────────────────────────────────────────────────────────

function DeleteSystem() {
  const { t } = useTranslation();
  const { site: selectedSite } = useSite();
  const [selectedSystem, setSelectedSystem] = useState<Sys | null>(null);
  const { loading, setLoading, message, messageType, showError, clearMessage } = useFormStatus();

  const handleDelete = async () => {
    if (!selectedSystem) return;

    if (!window.confirm(t('confirm_delete_system', { name: selectedSystem.name }))) return;

    setLoading(true);
    clearMessage();

    try {
      const res = await fetch(`${apiUrl}/api/delete_system/${selectedSite?.id}/${selectedSystem.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errText = await parseApiError(res, t('server_error'));
        showError(errText);
        return;
      }

      alert(t('system_deleted_success'));
      window.location.reload();
    } catch (err) {
      console.error(err);
      showError(t('error_deleting_system'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ui-form-container">
      <form className="ui-form" onSubmit={e => { e.preventDefault(); handleDelete(); }}>
        <div className="input-row">
          <SystemDropdown value={selectedSystem} onChange={setSelectedSystem} siteId={selectedSite?.id} placeholder={t('select_system_to_delete')} />
        </div>
        <button type="submit" className="ui-submit" disabled={loading || !selectedSystem}>
          {loading ? t('button.sending') : t('button.delete_system')}
        </button>
        <StatusMessage message={message} messageType={messageType} />
      </form>
    </div>
  );
}

export { AddSystem, DeleteSystem, SystemDropdown, SiteDropdown, ManualDataEntryForm, Dropdown };

