import { useState, useEffect } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import { useSite } from '../components/SiteContext';
import { ExportGapsModal } from '../components/ExportGapsModal';
import type { Sys } from '../types';
import GlobalView from './views/GlobalView';
import SiteView from './views/SiteView';
import SystemView from './views/SystemView';
import '../styles/viz.css';

const apiUrl = import.meta.env.VITE_BACKEND_URL;

const Viz = () => {
    const { t } = useTranslation();
    const { getPageState, setPageState, site: selectedSite } = useSite();
    const [activeTab, setActiveTab] = useState<'global' | 'site' | 'system'>(() => {
        return getPageState('vizActiveTab') || 'site';
    });
    const [selectedSystem, setSelectedSystem] = useState<Sys | null>(() => {
        return getPageState('vizSelectedSystem') || null;
    });
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [systemsList, setSystemsList] = useState<Sys[]>([]);
    
    useEffect(() => {
        setPageState('vizActiveTab', activeTab);
    }, [activeTab, setPageState]);

    useEffect(() => {
        setPageState('vizSelectedSystem', selectedSystem);
    }, [selectedSystem, setPageState]);

    // Fetch systems list when site changes
    useEffect(() => {
        if (!selectedSite?.id) {
            setSystemsList([]);
            return;
        }
        let mounted = true;
        (async () => {
            try {
                const url = `${apiUrl}/api/get_systems_by_site/?site_id=${encodeURIComponent(String(selectedSite.id))}`;
                const res = await fetch(url);
                if (!res.ok) {
                    if (mounted) setSystemsList([]);
                    return;
                }
                const data = await res.json();
                if (!mounted) return;

                const list = Array.isArray(data) ? data : [];
                const mappedSystems = list.map((item: any) =>
                    Array.isArray(item)
                        ? { id: item[0], name: item[1], critical: item[2], local: item[3], sys_user: item[4] }
                        : { id: item.id ?? item.id_system, name: item.name, critical: item.critical, local: item.local, sys_user: item.sys_user }
                );
                setSystemsList(mappedSystems);
            } catch (err) {
                if (mounted) setSystemsList([]);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [selectedSite?.id]);

    const renderContent = () => {
        switch (activeTab) {
            case 'global':
                return <GlobalView />;
            case 'site':
                return (
                    <SiteView
                        onSystemSelect={(system: Sys) => {
                            setSelectedSystem(system);
                            setActiveTab('system');
                        }}
                    />
                );
            case 'system':
                return (
                    <SystemView
                        selectedSystem={selectedSystem}
                        setSelectedSystem={setSelectedSystem}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="viz-container">
            <div className="tabs">
                <div
                    className={`tab ${activeTab === 'global' ? 'active' : ''}`}
                    onClick={() => setActiveTab('global')}
                >
                    {t('global_view')}
                </div>
                <div
                    className={`tab ${activeTab === 'site' ? 'active' : ''}`}
                    onClick={() => setActiveTab('site')}
                >
                    {t('site_view')}
                </div>
                <div
                    className={`tab ${activeTab === 'system' ? 'active' : ''}`}
                    onClick={() => setActiveTab('system')}
                >
                    {t('system_view')}
                </div>
                <button
                    onClick={() => setExportModalOpen(true)}
                    style={{
                        marginLeft: 'auto',
                        padding: '10px 16px',
                        backgroundColor: '#0d6efd',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {t('extract_gaps_to_excel')}
                </button>
            </div>
            <div className="tab-content">{renderContent()}</div>
            <ExportGapsModal
                isOpen={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                systems={systemsList}
                siteId={selectedSite?.id}
            />
        </div>
    );
};

export default Viz;