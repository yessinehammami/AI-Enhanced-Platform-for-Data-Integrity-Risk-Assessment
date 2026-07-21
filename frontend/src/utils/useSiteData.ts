import { useState, useEffect } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import { useSite } from '../components/SiteContext';

const apiUrl = import.meta.env.VITE_BACKEND_URL;

const useSiteData = () => {
    const { site } = useSite();
    const { i18n } = useTranslation();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!site) {
            setLoading(false);
            setData(null);
            setError(null);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            setData(null);
            try {
                const language = (i18n.resolvedLanguage || i18n.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
                const response = await fetch(`${apiUrl}/api/get_site_info/?site_id=${site.id}&language=${language}`);
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API error response:', errorText);
                    throw new Error(errorText || 'Network response was not ok');
                }
                const result = await response.json();
                setData(result);
                setError(null);
            } catch (e) {
                const errorMsg = e instanceof Error ? e.message : String(e);
                console.error('Error in useSiteData:', errorMsg);
                setError(errorMsg);
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [site?.id, i18n.language]);

    return { data, loading, error };
};

export default useSiteData;
