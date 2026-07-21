import { useState, useEffect } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import '../styles/library.css';

interface PDFFile {
  name: string;
  displayName: string;
  author: string;
  size?: number;
  uploadDate: string;
  path?: string;
}

interface PDFFilesByCategory {
  reglementation: PDFFile[];
  standard: PDFFile[];
  procedures: PDFFile[];
  checklist: PDFFile[];
}

const Library = () => {
  const { t } = useTranslation();
  const [pdfFilesByCategory, setPdfFilesByCategory] = useState<PDFFilesByCategory>({
    reglementation: [],
    standard: [],
    procedures: [],
    checklist: []
  });
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({ 
    'Réglementation': false,
    'Procédures': false,
    'Standard': false,
    'Checklist': false
  });
  const [expandedAuthors, setExpandedAuthors] = useState<{ [key: string]: boolean }>({});
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    // Fetch list of PDFs from public folder
    fetchPdfFiles();
  }, []);

  const fetchPdfFiles = async () => {
    try {
      setLoading(true);
      // Load PDFs from manifest files
      const [reglementationResponse, standardResponse, checklistResponse] = await Promise.all([
        fetch('/pdfs_reglementation/manifest.json'),
        fetch('/standard/manifest.json'),
        fetch('/formulaire/manifest.json')
      ]);
      
      const reglementationFiles = reglementationResponse.ok ? await reglementationResponse.json() : [];
      const standardFiles = standardResponse.ok ? await standardResponse.json() : [];
      const checklistFiles = checklistResponse.ok ? await checklistResponse.json() : [];
      
      // Add path information to each file
      const reglementationWithPath = reglementationFiles.map((f: PDFFile) => ({ ...f, path: '/pdfs_reglementation' }));
      const standardWithPath = standardFiles.map((f: PDFFile) => ({ ...f, path: '/standard' }));
      const checklistWithPath = checklistFiles.map((f: PDFFile) => ({ ...f, path: '/formulaire' }));
      
      setPdfFilesByCategory({
        reglementation: reglementationWithPath,
        standard: standardWithPath,
        procedures: [],
        checklist: checklistWithPath
      });
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      setPdfFilesByCategory({
        reglementation: [],
        standard: [],
        procedures: [],
        checklist: []
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0 || !bytes) return t('na');
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const openPdf = (filename: string, path: string = '/pdfs_reglementation') => {
    const fileExtension = filename.split('.').pop()?.toLowerCase();
    const excelExtensions = ['xlsx', 'xls'];
    const encodedFilename = encodeURIComponent(filename);
    
    if (excelExtensions.includes(fileExtension || '')) {
      // Open Excel files in Excel Viewer page
      const encodedPath = encodeURIComponent(path);
      window.open(`/excel-viewer?file=${encodedFilename}&path=${encodedPath}`, '_blank');
    } else {
      // For PDFs and other files, open directly with proper URL encoding
      window.open(`${path}/${encodedFilename}`, '_blank');
    }
  };

  const downloadPdf = async (filename: string, displayName: string, path: string = '/pdfs_reglementation') => {
    try {
      const fileExtension = filename.split('.').pop()?.toLowerCase();
      const response = await fetch(`${path}/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      
      let blob = await response.blob();
      
      // Ensure correct MIME type for Excel files
      const excelExtensions = ['xlsx', 'xls'];
      if (excelExtensions.includes(fileExtension || '')) {
        blob = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = displayName || filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const groupPdfsByAuthor = (files: PDFFile[]): { [key: string]: PDFFile[] } => {
    return files.reduce((groups, pdf) => {
      const author = pdf.author || t('other');
      if (!groups[author]) {
        groups[author] = [];
      }
      groups[author].push(pdf);
      return groups;
    }, {} as { [key: string]: PDFFile[] });
  };

  const toggleGroup = (groupName: string) => {
    if (selectedGroup === groupName) {
      // Clicking the selected group deselects it
      setSelectedGroup(null);
      setExpandedGroups(prev => ({
        ...prev,
        [groupName]: false
      }));
    } else {
      // Clicking a different group selects it and expands it
      setSelectedGroup(groupName);
      setExpandedGroups(prev => {
        const updated = { ...prev };
        // Collapse all others
        Object.keys(updated).forEach(key => {
          if (key !== groupName) {
            updated[key] = false;
          }
        });
        // Expand the selected one
        updated[groupName] = true;
        return updated;
      });
    }
  };

  const toggleAuthorGroup = (authorKey: string) => {
    setExpandedAuthors(prev => ({
      ...prev,
      [authorKey]: !prev[authorKey]
    }));
  };

  const getGroupIcon = (groupName: string): string => {
    const icons: { [key: string]: string } = {
      'Réglementation': '📋',
      'Procédures': '📑',
      'Standard': '✅',
      'Checklist': '📝'
    };
    return icons[groupName] || '📄';
  };

  return (
    <div className="library-container">
      <div className="library-header">
        <h1>{t('library')}</h1>
        <p>{t('library_description')}</p>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <p>{t('loading')}</p>
        </div>
      ) : pdfFilesByCategory.reglementation.length === 0 && pdfFilesByCategory.standard.length === 0 && pdfFilesByCategory.procedures.length === 0 && pdfFilesByCategory.checklist.length === 0 ? (
        <div className="empty-state">
          <p>{t('no_pdfs')}</p>
          <p className="empty-hint">
            {t('no_pdfs_hint')}
          </p>
        </div>
      ) : (
        <div className={`pdf-library-container ${selectedGroup ? 'single-expanded' : ''}`}>
          {(!selectedGroup || selectedGroup === 'Réglementation') && (
            <div className={`pdf-group-section ${selectedGroup === 'Réglementation' ? 'selected' : ''}`}>
              <h2 
                className="group-title" 
                onClick={() => toggleGroup('Réglementation')}
              >
                <span className="group-toggle-icon">
                  {expandedGroups['Réglementation'] ? '▼' : '▶'}
                </span>
                <span className="group-icon">{getGroupIcon('Réglementation')}</span>
                {t('library_group_reglementation')}
              </h2>
              {expandedGroups['Réglementation'] && (
                <div className="pdf-library-grouped">
                  {pdfFilesByCategory.reglementation.length > 0 ? (
                    Object.entries(groupPdfsByAuthor(pdfFilesByCategory.reglementation)).map(([author, files]) => {
                      const authorKey = `Reglementation-${author}`;
                      return (
                        <div key={author} className="author-section">
                          <h3 
                            className="author-title" 
                            onClick={() => toggleAuthorGroup(authorKey)}
                          >
                            <span className="author-toggle-icon">
                              {expandedAuthors[authorKey] ? '▼' : '▶'}
                            </span>
                            {author}
                          </h3>
                          {expandedAuthors[authorKey] && (
                            <div className="pdf-list">
                              {files.map((pdf) => (
                                <div key={pdf.name} className="pdf-item">
                                  <div className="pdf-icon">📄</div>
                                  <div className="pdf-info">
                                    <h4>{pdf.displayName}</h4>
                                    <div className="pdf-metadata">
                                      {pdf.size && <span className="file-size">{t('size')}: {formatFileSize(pdf.size)}</span>}
                                      <span className="upload-date">{t('date')}: {pdf.uploadDate}</span>
                                    </div>
                                  </div>
                                  <div className="pdf-actions">
                                    <button
                                      className="btn btn-primary"
                                      onClick={() => openPdf(pdf.name, pdf.path)}
                                      title={t('view_in_browser')}
                                    >
                                      {t('view')}
                                    </button>
                                    <button
                                      className="btn btn-secondary"
                                      onClick={() => downloadPdf(pdf.name, pdf.displayName, pdf.path)}
                                      title={t('download')}
                                    >
                                      {t('download')}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="empty-group">{t('no_documents_available')}</p>
                  )}
                </div>
              )}
            </div>
          )}
          {(!selectedGroup || selectedGroup === 'Procédures') && (
            <div className={`pdf-group-section ${selectedGroup === 'Procédures' ? 'selected' : ''}`}>
              <h2 
                className="group-title" 
                onClick={() => toggleGroup('Procédures')}
              >
                <span className="group-toggle-icon">
                  {expandedGroups['Procédures'] ? '▼' : '▶'}
                </span>
                <span className="group-icon">{getGroupIcon('Procédures')}</span>
                {t('library_group_procedures')}
              </h2>
              {expandedGroups['Procédures'] && (
                <div className="pdf-library-grouped">
                  <p className="empty-group">{t('no_documents_available')}</p>
                </div>
              )}
            </div>
          )}
          {(!selectedGroup || selectedGroup === 'Standard') && (
            <div className={`pdf-group-section ${selectedGroup === 'Standard' ? 'selected' : ''}`}>
              <h2 
                className="group-title" 
                onClick={() => toggleGroup('Standard')}
              >
                <span className="group-toggle-icon">
                  {expandedGroups['Standard'] ? '▼' : '▶'}
                </span>
                <span className="group-icon">{getGroupIcon('Standard')}</span>
                {t('library_group_standard')}
              </h2>
              {expandedGroups['Standard'] && (
                <div className="pdf-library-grouped">
                  {pdfFilesByCategory.standard.length > 0 ? (
                    Object.entries(groupPdfsByAuthor(pdfFilesByCategory.standard)).map(([author, files]) => {
                      const authorKey = `Standard-${author}`;
                      return (
                        <div key={author} className="author-section">
                          <h3 
                            className="author-title" 
                            onClick={() => toggleAuthorGroup(authorKey)}
                          >
                            <span className="author-toggle-icon">
                              {expandedAuthors[authorKey] ? '▼' : '▶'}
                            </span>
                            {author}
                          </h3>
                          {expandedAuthors[authorKey] && (
                            <div className="pdf-list">
                              {files.map((pdf) => (
                                <div key={pdf.name} className="pdf-item">
                                  <div className="pdf-icon">📄</div>
                                  <div className="pdf-info">
                                    <h4>{pdf.displayName}</h4>
                                    <div className="pdf-metadata">
                                      {pdf.size && <span className="file-size">{t('size')}: {formatFileSize(pdf.size)}</span>}
                                      <span className="upload-date">{t('date')}: {pdf.uploadDate}</span>
                                    </div>
                                  </div>
                                  <div className="pdf-actions">
                                    <button
                                      className="btn btn-primary"
                                      onClick={() => openPdf(pdf.name, pdf.path)}
                                      title={t('view_in_browser')}
                                    >
                                      {t('view')}
                                    </button>
                                    <button
                                      className="btn btn-secondary"
                                      onClick={() => downloadPdf(pdf.name, pdf.displayName, pdf.path)}
                                      title={t('download')}
                                    >
                                      {t('download')}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="empty-group">{t('no_documents_available')}</p>
                  )}
                </div>
              )}
            </div>
          )}
          {(!selectedGroup || selectedGroup === 'Checklist') && (
            <div className={`pdf-group-section ${selectedGroup === 'Checklist' ? 'selected' : ''}`}>
              <h2 
                className="group-title" 
                onClick={() => toggleGroup('Checklist')}
              >
                <span className="group-toggle-icon">
                  {expandedGroups['Checklist'] ? '▼' : '▶'}
                </span>
                <span className="group-icon">{getGroupIcon('Checklist')}</span>
                {t('library_group_checklist')}
              </h2>
              {expandedGroups['Checklist'] && (
                <div className="pdf-library-grouped">
                  {pdfFilesByCategory.checklist.length > 0 ? (
                    Object.entries(groupPdfsByAuthor(pdfFilesByCategory.checklist)).map(([author, files]) => {
                      const authorKey = `Checklist-${author}`;
                      return (
                        <div key={author} className="author-section">
                          <h3 
                            className="author-title" 
                            onClick={() => toggleAuthorGroup(authorKey)}
                          >
                            <span className="author-toggle-icon">
                              {expandedAuthors[authorKey] ? '▼' : '▶'}
                            </span>
                            {author}
                          </h3>
                          {expandedAuthors[authorKey] && (
                            <div className="pdf-list">
                              {files.map((pdf) => (
                                <div key={pdf.name} className="pdf-item">
                                  <div className="pdf-icon">📄</div>
                                  <div className="pdf-info">
                                    <h4>{pdf.displayName}</h4>
                                    <div className="pdf-metadata">
                                      {pdf.size && <span className="file-size">{t('size')}: {formatFileSize(pdf.size)}</span>}
                                      <span className="upload-date">{t('date')}: {pdf.uploadDate}</span>
                                    </div>
                                  </div>
                                  <div className="pdf-actions">
                                    <button
                                      className="btn btn-primary"
                                      onClick={() => openPdf(pdf.name, pdf.path)}
                                      title={t('view_in_browser')}
                                    >
                                      {t('view')}
                                    </button>
                                    <button
                                      className="btn btn-secondary"
                                      onClick={() => downloadPdf(pdf.name, pdf.displayName, pdf.path)}
                                      title={t('download')}
                                    >
                                      {t('download')}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="empty-group">{t('no_documents_available')}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Library;
