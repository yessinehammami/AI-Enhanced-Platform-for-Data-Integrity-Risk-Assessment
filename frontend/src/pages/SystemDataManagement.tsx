import { AddSystem, DeleteSystem, ManualDataEntryForm } from "../components/user_input";
import { useTranslation } from 'react-i18next';
import "../styles/data_upload.css";

const SystemDataManagement = () => {
  const { t } = useTranslation();
  return (
    <div style={{ backgroundColor: '#1a1f2e', minHeight: '100vh', padding: '0' }}>
      {/* Header Section */}
      <header style={{
        background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
        color: '#e8eaed',
        padding: '40px 32px',
        marginBottom: '40px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700', letterSpacing: '-0.5px', color: '#f0f2f5' }}>
            {t('system_data_management')}
          </h1>
          <p style={{ margin: 0, fontSize: '15px', opacity: 0.85, fontWeight: '400', color: '#bcc4ca' }}>
            {t('select_site_system')}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px', paddingBottom: '40px' }}>
        {/* Add Local Systems Section */}
        <section style={{
          backgroundColor: '#232e42',
          borderRadius: '8px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          borderLeft: '4px solid #4a5f79',
          transition: 'box-shadow 0.3s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #3a4757' }}>
            <span style={{ fontSize: '24px', marginRight: '12px' }}>⚙️</span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#e8eaed' }}>
              {t('add_local_systems')}
            </h2>
          </div>
          <div>
            <AddSystem />
          </div>
        </section>

        {/* Manual Data Entry Section */}
        <section style={{
          backgroundColor: '#232e42',
          borderRadius: '8px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          borderLeft: '4px solid #8b8c5c',
          transition: 'box-shadow 0.3s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #3a4757' }}>
            <span style={{ fontSize: '24px', marginRight: '12px' }}>✏️</span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#e8eaed' }}>
              {t('manual_entry.title')}
            </h2>
          </div>
          <p style={{ color: '#bcc4ca', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
            {t('manual_entry.description')}
          </p>
          <div>
            <ManualDataEntryForm />
          </div>
        </section>

        {/* Delete Section */}
        <section style={{
          backgroundColor: '#232e42',
          borderRadius: '8px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          borderLeft: '4px solid #7a5555',
          transition: 'box-shadow 0.3s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #3a4757' }}>
            <span style={{ fontSize: '24px', marginRight: '12px' }}>🗑️</span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#e8eaed' }}>
              {t('delete_section_title')}
            </h2>
          </div>
          <p style={{ color: '#bcc4ca', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
            {t('delete_section_desc')}
          </p>
          <div>
            <DeleteSystem />
          </div>
        </section>
      </div>
    </div>
  );
};

export default SystemDataManagement;
