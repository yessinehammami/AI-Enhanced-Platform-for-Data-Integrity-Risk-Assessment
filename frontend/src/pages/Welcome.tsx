import { useState, useEffect } from "preact/hooks";
import { useTranslation } from 'react-i18next';
import { useSite } from "../components/SiteContext";
import type { Site } from "../types";
import { route } from "preact-router";

const apiUrl = import.meta.env.VITE_BACKEND_URL;

const Welcome = () => {
  const { t } = useTranslation();
  const { site: selectedSite, setSite } = useSite();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch(`${apiUrl}/api/get_sites/`)
      .then(r => r.json())
      .then(data => {
        if (!mounted) return;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.sites) ? data.sites : Array.isArray(data.results) ? data.results : [];
        setSites(list.map((i: any) => ({ id: i.id, name: i.name ?? i.nom_du_site ?? i.nom, activity_type: i.activity_type, address: i.address })));
      })
      .catch(() => { if (mounted) setSites([]); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleSelect = (s: Site) => {
    setSite(s);
    route("/management");
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "calc(100vh - 80px)",
      textAlign: "center",
      background: "linear-gradient(145deg, var(--bg) 0%, #1e293b 100%)",
      color: "var(--text)",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      padding: "2rem",
      paddingTop: "120px"
    }}>
      <div style={{
        maxWidth: "900px",
        width: "100%",
        padding: "3rem",
        background: "var(--gradient-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-light)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 32px rgba(0, 0, 0, 0.1)",
        backdropFilter: "blur(16px)"
      }}>
        <h1 style={{
          fontSize: "2.8rem",
          marginBottom: "1rem",
          background: "linear-gradient(135deg, var(--primary), var(--accent))",
          WebkitBackgroundClip: "text",
          color: "transparent",
          fontWeight: "800",
          lineHeight: "1.3"
        }}>
          {t('app_title')}
        </h1>

        <p style={{
          fontSize: "1.15rem",
          color: "var(--text-secondary)",
          lineHeight: "1.6",
          marginBottom: "2rem"
        }}>
          {t('welcome_select_site')}
        </p>

        {/* Currently selected site banner */}
        {selectedSite && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            marginBottom: "2rem",
            padding: "14px 24px",
            background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,214,160,0.10))",
            border: "1px solid var(--primary)",
            borderRadius: "var(--radius)",
          }}>
            <span style={{ fontSize: "1.05rem", color: "var(--text-secondary)" }}>{t('current_site')}:</span>
            <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--primary-light)" }}>{selectedSite.name}</span>
          </div>
        )}

        {/* Sites grid */}
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>{t('loading')}</p>
        ) : sites.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>{t('no_sites')}</p>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "1.2rem",
            marginTop: "1rem"
          }}>
            {sites.map(s => {
              const isActive = selectedSite?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  style={{
                    padding: "1.4rem 1.2rem",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,214,160,0.12))"
                      : "var(--surface)",
                    borderRadius: "var(--radius)",
                    border: isActive ? "2px solid var(--primary)" : "1px solid var(--border-light)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                    boxShadow: isActive
                      ? "0 0 0 3px rgba(59,130,246,0.15), 0 8px 24px rgba(0,0,0,0.2)"
                      : "0 4px 12px rgba(0,0,0,0.15)",
                    color: "var(--text)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.25)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.transform = "none";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-light)";
                    }
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: "1.08rem", color: isActive ? "var(--primary-light)" : "var(--text)" }}>
                    {s.name}
                  </span>
                  {s.activity_type && (
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{s.activity_type}</span>
                  )}
                  {s.address && (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-disabled)" }}>{s.address}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Welcome;
