import { useState, useEffect } from 'preact/hooks';

const apiUrl = import.meta.env.VITE_BACKEND_URL;

const useGlobalData = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                console.log('Fetching global info from /api/get_global_info/');
                const response = await fetch(`${apiUrl}/api/get_global_info`);
                console.log('Response status:', response.status);
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API error response:', errorText);
                    throw new Error(errorText || 'Network response was not ok');
                }
                const result = await response.json();
                console.log('Global data fetched successfully:', result);
                setData(result);
                setError(null);
            } catch (e) {
                const errorMsg = e instanceof Error ? e.message : String(e);
                console.error('Error in useGlobalData:', errorMsg);
                setError(errorMsg);
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, loading, error };
};

export default useGlobalData;
