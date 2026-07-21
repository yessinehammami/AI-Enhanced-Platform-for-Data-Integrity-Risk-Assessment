import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Gap {
    id?: string | number;
    ID?: string | number;
    theme?: string;
    Theme?: string;
    sub_theme?: string;
    subTheme?: string;
    SubTheme?: string;
    gap_description?: string;
    description?: string;
    gap_effect?: string;
    effect?: string;
    rpn?: number;
    RPN?: number;
}

interface AssociatedCapa {
    id: number;
    action_description: string | null;
    responsible_person: string | null;
    due_date: string | null;
    status: string | null;
}

interface SystemData {
    systemName: string;
    gaps: Gap[];
    capas: { [gapId: string | number]: AssociatedCapa[] };
}

const getRpnNumber = (gap: any): number | null => {
    const rawRpn = gap?.rpn ?? gap?.RPN;
    const rpnValue = typeof rawRpn === 'number' ? rawRpn : Number(rawRpn);
    return Number.isFinite(rpnValue) ? rpnValue : null;
};

const getRiskLevel = (rpnValue: number | null, t: (key: string) => string): string => {
    if (rpnValue === null || Number.isNaN(rpnValue)) return t('na');
    if (rpnValue >= 24) return t('high');
    if (rpnValue >= 9) return t('moderate');
    return t('low');
};

const getRiskLevelColor = (riskLevel: string, t: (key: string) => string): string => {
    const highLabel = t('high');
    const moderateLabel = t('moderate');
    const lowLabel = t('low');
    
    if (riskLevel === highLabel) return 'FFFF0000'; // Red
    if (riskLevel === moderateLabel) return 'FFFFA500'; // Orange
    if (riskLevel === lowLabel) return 'FF00B050'; // Green
    return 'FFFFFFFF'; // White (default)
};

const parseCapaDescription = (description: string | null | undefined): { immediate: string; longterm: string } => {
    if (!description) return { immediate: '', longterm: '' };
    
    const text = String(description);
    const immediateActionsFR = "Actions immédiates de maîtrise des risques";
    const immediateActionsEN = "Immediate risk mitigation actions";
    const longTermFR = "Recommandations à long terme";
    const longTermEN = "Long-term recommendations";
    
    const immediateIndexFR = text.indexOf(immediateActionsFR);
    const immediateIndexEN = text.indexOf(immediateActionsEN);
    const longTermIndexFR = text.indexOf(longTermFR);
    const longTermIndexEN = text.indexOf(longTermEN);
    
    const immediateIndex = immediateIndexFR !== -1 ? immediateIndexFR : immediateIndexEN;
    const longTermIndex = longTermIndexFR !== -1 ? longTermIndexFR : longTermIndexEN;
    
    let immediateText = '';
    let longtermText = '';
    
    if (immediateIndex !== -1) {
        let endIndex = longTermIndex !== -1 ? longTermIndex : text.length;
        const content = text.substring(immediateIndex, endIndex).trim();
        const marker = immediateIndexFR !== -1 ? immediateActionsFR : immediateActionsEN;
        immediateText = content.replace(marker, '').trim();
    }
    
    if (longTermIndex !== -1) {
        const content = text.substring(longTermIndex).trim();
        const marker = longTermIndexFR !== -1 ? longTermFR : longTermEN;
        longtermText = content.replace(marker, '').trim();
    }
    
    return { immediate: immediateText, longterm: longtermText };
};

export const exportGapsToExcel = async (
    systemsData: SystemData[],
    t: (key: string) => string,
    isFrench: boolean
) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Gaps');

    // Define headers
    const headers = isFrench
        ? [
            'Système',
            'Thème',
            'Sous-thème',
            'Description du Gap',
            'Effet du Gap',
            'RPN',
            'Niveau de Risque',
            'Actions immédiates de maîtrise des risques',
            'Recommandations à long terme',
            'Personne responsable',
            "Date d'échéance",
            'Statut'
        ]
        : [
            'System',
            'Theme',
            'Sub-theme',
            'Gap Description',
            'Gap Effect',
            'RPN',
            'Risk Level',
            'Immediate Risk Mitigation Actions',
            'Long-term Recommendations',
            'Responsible Person',
            'Due Date',
            'Status'
        ];

    // Add headers
    const headerRow = worksheet.addRow(headers);

    // Style header row with yellow background, bold, size 12
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF00' }
        };
        cell.font = {
            bold: true,
            size: 12,
            color: { argb: 'FF000000' }
        };
        cell.alignment = {
            horizontal: 'center',
            vertical: 'center',
            wrapText: true
        };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Set column widths
    const colWidths = [20, 20, 20, 30, 30, 8, 15, 35, 35, 20, 15, 15];
    worksheet.columns = colWidths.map(width => ({ width }));

    // Set header row height
    headerRow.height = 30;

    // Add data rows
    for (const system of systemsData) {
        const gaps = system.gaps;
        const capas = system.capas;

        for (const gap of gaps) {
            const gapId = gap.id ?? gap.ID;
            const theme = gap.theme ?? gap.Theme ?? t('na');
            const subTheme = gap.sub_theme ?? gap.subTheme ?? gap.SubTheme ?? t('na');
            const description = gap.gap_description ?? gap.description ?? t('na');
            const effect = gap.gap_effect ?? gap.effect ?? t('na');
            const rpnValue = getRpnNumber(gap);
            const riskLevel = getRiskLevel(rpnValue, t);

            const gapCapas = capas[gapId] || [];

            if (gapCapas.length === 0) {
                const row = worksheet.addRow([
                    system.systemName,
                    theme,
                    subTheme,
                    description,
                    effect,
                    rpnValue ?? t('na'),
                    riskLevel,
                    t('na'),
                    t('na'),
                    t('na'),
                    t('na'),
                    t('na')
                ]);
                row.alignment = { wrapText: true, vertical: 'top' };
                
                // Apply risk level color to column 7 (Risk Level)
                const riskLevelCell = row.getCell(7);
                const riskColor = getRiskLevelColor(riskLevel, t);
                riskLevelCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: riskColor }
                };
                riskLevelCell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White text
                riskLevelCell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
            } else {
                gapCapas.forEach((capa, idx) => {
                    const parsed = parseCapaDescription(capa.action_description);
                    const row = worksheet.addRow([
                        idx === 0 ? system.systemName : '',
                        idx === 0 ? theme : '',
                        idx === 0 ? subTheme : '',
                        idx === 0 ? description : '',
                        idx === 0 ? effect : '',
                        idx === 0 ? (rpnValue ?? t('na')) : '',
                        idx === 0 ? riskLevel : '',
                        parsed.immediate || t('na'),
                        parsed.longterm || t('na'),
                        capa.responsible_person || t('na'),
                        capa.due_date ? new Date(capa.due_date).toLocaleDateString() : t('na'),
                        capa.status || t('na')
                    ]);
                    row.alignment = { wrapText: true, vertical: 'top' };
                    
                    // Apply risk level color to column 7 (Risk Level) only if it's the first row for this gap
                    if (idx === 0) {
                        const riskLevelCell = row.getCell(7);
                        const riskColor = getRiskLevelColor(riskLevel, t);
                        riskLevelCell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: riskColor }
                        };
                        riskLevelCell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White text
                        riskLevelCell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
                    }
                });
            }
        }
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = isFrench
        ? `extraction_gaps_${timestamp}.xlsx`
        : `gaps_export_${timestamp}.xlsx`;

    // Write file using file-saver
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
};
