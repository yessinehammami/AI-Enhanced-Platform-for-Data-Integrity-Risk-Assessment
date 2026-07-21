import { useState, useEffect } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import type { Sys } from '../types';
import { exportGapsToExcel } from '../utils/exportGapsToExcel';

const apiUrl = import.meta.env.VITE_BACKEND_URL;

interface SystemInfo {
    gaps_details: any[];
}

interface AssociatedCapa {
    id: number;
    action_description: string | null;
    responsible_person: string | null;
    due_date: string | null;
    status: string | null;
}

interface ExportGapsModalProps {
    isOpen: boolean;
    onClose: () => void;
    systems: Sys[];
    siteId: number | string | undefined;
}

const resolveSystemId = (system: Sys | null | undefined): number | null => {
    const candidate = (system as any)?.id ?? (system as any)?.id_system ?? (system as any)?.system_id;
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const ExportGapsModal = ({ isOpen, onClose, systems, siteId }: ExportGapsModalProps) => {
    const { t, i18n } = useTranslation();
    const [selectedSystems, setSelectedSystems] = useState<Set<number | string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');
    const isFrench = (i18n.resolvedLanguage || i18n.language || 'fr').toLowerCase().startsWith('fr');

    const filteredSystems = systems.filter(system => {
        const systemName = ((system as any).name || '').toLowerCase();
        return systemName.includes(searchText.toLowerCase());
    });

    const handleSystemToggle = (systemId: number | string) => {
        const newSelected = new Set(selectedSystems);
        if (newSelected.has(systemId)) {
            newSelected.delete(systemId);
        } else {
            newSelected.add(systemId);
        }
        setSelectedSystems(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedSystems.size === filteredSystems.length) {
            setSelectedSystems(new Set());
        } else {
            const allIds = new Set(filteredSystems.map(s => s.id || (s as any).id_system || (s as any).system_id));
            setSelectedSystems(allIds);
        }
    };

    const handleExport = async () => {
        if (selectedSystems.size === 0) {
            setError(t('error_select_at_least_one_system') || 'Please select at least one system');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const systemsData = [];

            for (const systemId of selectedSystems) {
                const system = systems.find(s => (s.id || (s as any).id_system || (s as any).system_id) === systemId);
                if (!system) continue;

                const systemName = (system as any).name || '';

                // Fetch system info (gaps)
                const language = isFrench ? 'fr' : 'en';
                const systemInfoUrl = `${apiUrl}/api/get_system_info/?site_id=${siteId}&system_id=${systemId}&language=${language}`;
                const sysInfoRes = await fetch(systemInfoUrl);
                
                if (!sysInfoRes.ok) {
                    console.error(`Failed to fetch system info for ${systemName}`);
                    continue;
                }

                const systemInfo: SystemInfo = await sysInfoRes.json();
                const gaps = systemInfo.gaps_details || [];

                // Fetch capas for each gap
                const capasMap: { [gapId: string | number]: AssociatedCapa[] } = {};

                for (const gap of gaps) {
                    const gapId = gap.id || gap.ID;
                    if (!gapId) continue;

                    try {
                        const capasUrl = `${apiUrl}/api/get_capas/?nc_id=${gapId}&site_id=${siteId}&system_id=${systemId}`;
                        const capasRes = await fetch(capasUrl);
                        
                        if (capasRes.ok) {
                            const capaList = await capasRes.json();
                            capasMap[gapId] = Array.isArray(capaList) ? capaList : [];
                        }
                    } catch (e) {
                        console.error(`Failed to fetch capas for gap ${gapId}:`, e);
                    }
                }

                systemsData.push({
                    systemName,
                    gaps,
                    capas: capasMap
                });
            }

            // Generate Excel file
            await exportGapsToExcel(systemsData, t, isFrench);
            
            onClose();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
            console.error('Export error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                        {isFrench ? 'Exporter les Gaps' : 'Export Gaps'}
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            color: '#999'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '4px',
                        padding: '12px',
                        marginBottom: '16px',
                        color: '#c33'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{
                    marginBottom: '16px',
                    borderBottom: '1px solid #eee',
                    paddingBottom: '12px'
                }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontWeight: '600',
                        color: '#333'
                    }}>
                        <input
                            type="checkbox"
                            checked={selectedSystems.size === filteredSystems.length && filteredSystems.length > 0}
                            onChange={handleSelectAll}
                            disabled={loading || filteredSystems.length === 0}
                            style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {isFrench ? 'Sélectionner tout' : 'Select All'}
                    </label>
                </div>

                <div style={{
                    marginBottom: '16px'
                }}>
                    <input
                        type="text"
                        placeholder={isFrench ? 'Rechercher un système...' : 'Search a system...'}
                        value={searchText}
                        onInput={(e) => setSearchText(e.currentTarget.value)}
                        disabled={loading || systems.length === 0}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <div style={{
                    marginBottom: '20px',
                    maxHeight: '300px',
                    overflowY: 'auto'
                }}>
                    {systems.length === 0 ? (
                        <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                            {isFrench ? 'Aucun système disponible' : 'No systems available'}
                        </div>
                    ) : filteredSystems.length === 0 ? (
                        <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                            {isFrench ? 'Aucun résultat de recherche' : 'No search results'}
                        </div>
                    ) : (
                        filteredSystems.map((system) => {
                            const sysId = system.id || (system as any).id_system || (system as any).system_id;
                            const sysName = (system as any).name || 'Unknown';
                            return (
                                <label
                                    key={sysId}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '10px 0',
                                        borderBottom: '1px solid #f0f0f0',
                                        cursor: loading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedSystems.has(sysId)}
                                        onChange={() => handleSystemToggle(sysId)}
                                        disabled={loading}
                                        style={{ marginRight: '10px', cursor: 'pointer' }}
                                    />
                                    <span style={{ color: '#333' }}>{sysName}</span>
                                </label>
                            );
                        })
                    )}
                </div>

                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#e0e0e0',
                            color: '#333',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        {isFrench ? 'Annuler' : 'Cancel'}
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={loading || selectedSystems.size === 0}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: loading || selectedSystems.size === 0 ? '#ccc' : '#27ae60',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading || selectedSystems.size === 0 ? 'not-allowed' : 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        {loading ? (isFrench ? 'Export en cours...' : 'Exporting...') : (isFrench ? 'Exporter' : 'Export')}
                    </button>
                </div>
            </div>
        </div>
    );
};
