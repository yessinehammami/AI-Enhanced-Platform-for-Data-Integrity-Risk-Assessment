import { useState, useEffect } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import '../styles/excel-viewer.css';

interface ExcelViewerProps {
  filename?: string;
  path?: string;
}

interface CellModal {
  isOpen: boolean;
  content: string;
  row: number;
  col: number;
}

const ExcelViewer = () => {
  const { t } = useTranslation();
  const [tableData, setTableData] = useState<any[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [cellModal, setCellModal] = useState<CellModal>({
    isOpen: false,
    content: '',
    row: 0,
    col: 0
  });

  useEffect(() => {
    loadExcelFile();
  }, []);

  const loadExcelFile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get query parameters from URL
      const params = new URLSearchParams(window.location.search);
      const filename = params.get('file');
      const path = params.get('path') || '/formulaire';

      if (!filename) {
        setError('No file specified');
        setLoading(false);
        return;
      }

      // Fetch the Excel file
      const response = await fetch(`${path}/${filename}`);
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Get all sheet names
      setSheetNames(workbook.SheetNames);

      // Read the first sheet by default
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      setTableData(data as any[][]);
    } catch (err) {
      console.error('Error loading Excel file:', err);
      setError(err instanceof Error ? err.message : 'Error loading file');
    } finally {
      setLoading(false);
    }
  };

  const handleSheetChange = async (sheetIndex: number) => {
    try {
      const params = new URLSearchParams(window.location.search);
      const filename = params.get('file');
      const path = params.get('path') || '/formulaire';

      const response = await fetch(`${path}/${filename}`);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const sheetName = workbook.SheetNames[sheetIndex];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      setTableData(data as any[][]);
      setSelectedSheet(sheetIndex);
    } catch (err) {
      console.error('Error changing sheet:', err);
    }
  };

  const downloadFile = async () => {
    const params = new URLSearchParams(window.location.search);
    const filename = params.get('file');
    const path = params.get('path') || '/formulaire';

    if (!filename) return;

    const link = document.createElement('a');
    link.href = `${path}/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openCellModal = (content: any, row: number, col: number) => {
    if (typeof content === 'string' && content.length > 100) {
      setCellModal({
        isOpen: true,
        content: String(content),
        row,
        col
      });
    }
  };

  const closeCellModal = () => {
    setCellModal({
      isOpen: false,
      content: '',
      row: 0,
      col: 0
    });
  };

  const truncateText = (text: any, maxLength: number = 100): string => {
    const str = String(text);
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  };

  const shouldTruncate = (content: any): boolean => {
    return typeof content === 'string' && content.length > 100;
  };

  return (
    <div className="excel-viewer-container">
      <div className="excel-viewer-header">
        <h1>{t('excel_viewer_title')}</h1>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <p>{t('loading')}</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      ) : (
        <>
          {sheetNames.length > 1 && (
            <div className="sheet-selector">
              {sheetNames.map((name, index) => (
                <button
                  key={index}
                  className={`sheet-tab ${selectedSheet === index ? 'active' : ''}`}
                  onClick={() => handleSheetChange(index)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          <div className="table-wrapper">
            <table className="excel-table">
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex === 0 ? 'header-row' : ''}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={`${rowIndex === 0 ? 'header-cell' : ''} ${shouldTruncate(cell) ? 'truncated-cell' : ''}`}
                        onClick={() => openCellModal(cell, rowIndex, cellIndex)}
                        title={shouldTruncate(cell) ? String(cell) : ''}
                      >
                        {truncateText(cell)}
                        {shouldTruncate(cell) && <span className="expand-indicator">...</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Cell Content Modal */}
      {cellModal.isOpen && (
        <div className="modal-overlay" onClick={closeCellModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="modal-close" onClick={closeCellModal}>×</button>
            </div>
            <div className="modal-body">
              <p className="cell-text">{cellModal.content}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeCellModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelViewer;

