export const getConformityColor = (rate: number): string => {
    if (rate >= 75) return '#27ae60';
    if (rate >= 50) return '#f39c12';
    return '#e74c3c';
};
