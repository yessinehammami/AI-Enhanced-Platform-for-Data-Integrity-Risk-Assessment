import { useState, useEffect } from "preact/hooks";
import { useTranslation } from 'react-i18next';
import { useSite } from "./SiteContext";
import "../styles/navbar.css";

export default function Navbar() {
  const normalize = (p: string) => p.toLowerCase().replace(/\/+$$/, '');
  const [, setTick] = useState(0);
  const currentPath = normalize(window.location.pathname || '/');
  const { t, i18n } = useTranslation();
  const { site } = useSite();
  const locked = !site;

  useEffect(() => {
    const onLocation = () => setTick(t => t + 1);
    window.addEventListener('popstate', onLocation);
    window.addEventListener('hashchange', onLocation);

    const origPush = (history as any).pushState;
    const origReplace = (history as any).replaceState;
    (history as any).pushState = function (...args: any[]) { const r = origPush.apply(this, args); window.dispatchEvent(new Event('locationchange')); return r; };
    (history as any).replaceState = function (...args: any[]) { const r = origReplace.apply(this, args); window.dispatchEvent(new Event('locationchange')); return r; };
    window.addEventListener('locationchange', onLocation);

    return () => {
      window.removeEventListener('popstate', onLocation);
      window.removeEventListener('hashchange', onLocation);
      window.removeEventListener('locationchange', onLocation);
      (history as any).pushState = origPush;
      (history as any).replaceState = origReplace;
    };
  }, []);

  const normalizedLanguage = (i18n.resolvedLanguage || i18n.language || 'fr').startsWith('en') ? 'en' : 'fr';

  const handleLanguageChange = (e: any) => {
    const nextLang = e.target.value;
    i18n.changeLanguage(nextLang);
  };

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <div className="nav-left">
          <a href="/" className={`nav-link ${currentPath === normalize('/') ? "active" : ""}`}>{t('app_title')}</a>
        </div>
        <div className="nav-center">
          <a href={locked ? undefined : "/management"} className={`nav-link ${locked ? "nav-disabled" : ""} ${currentPath === normalize('/management') ? "active" : ""}`} onClick={e => { if (locked) e.preventDefault(); }}>{t('system_data_management')}</a>
          <a href={locked ? undefined : "/viz"} className={`nav-link ${locked ? "nav-disabled" : ""} ${currentPath === normalize('/viz') ? "active" : ""}`} onClick={e => { if (locked) e.preventDefault(); }}>{t('visualization')}</a>
          <a href={locked ? undefined : "/conversational_llm"} className={`nav-link ${locked ? "nav-disabled" : ""} ${currentPath === normalize('/conversational_llm') ? "active" : ""}`} onClick={e => { if (locked) e.preventDefault(); }}>{t('di_chatbot')}</a>
          <a href="/library" className={`nav-link ${currentPath === normalize('/library') ? "active" : ""}`}>{t('library')}</a>
        </div>
        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {site && (
            <a href="/" className="nav-site-badge" title={t('change_site')}>
              {site.name}
            </a>
          )}
          <select onChange={handleLanguageChange} value={normalizedLanguage} style={{ marginRight: 8 }}>
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>
        </div>
      </div>
    </nav>
  );
}
