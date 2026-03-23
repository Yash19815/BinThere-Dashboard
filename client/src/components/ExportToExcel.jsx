import React, { useState } from 'react';
import { Download, FileSpreadsheet, Loader2, CheckCircle, XCircle } from 'lucide-react';

/**
 * ExportToExcel Component
 * 
 * Add this component to your dashboard wherever you want the export button
 * Example usage:
 * 
 * import ExportToExcel from './components/ExportToExcel';
 * 
 * function Dashboard() {
 *   return (
 *     <div>
 *       <ExportToExcel />
 *       {/* rest of your dashboard *\/}
 *     </div>
 *   );
 * }
 */

const ExportToExcel = ({ apiBaseUrl = 'http://localhost:3001/api' }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null); // 'success', 'error', null
  const toYmd = (d) => d.toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(() => toYmd(new Date(Date.now() - 6 * 86400000)));
  const [toDate, setToDate] = useState(() => toYmd(new Date()));
  const [formError, setFormError] = useState(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus(null);
    setFormError(null);

    try {
      if (fromDate && toDate && fromDate > toDate) {
        throw new Error('Invalid date range');
      }

      const qs = new URLSearchParams();
      if (fromDate) qs.set('from', fromDate);
      if (toDate) qs.set('to', toDate);

      const response = await fetch(`${apiBaseUrl}/export/excel?${qs.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `binthere_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportStatus('success');
      setTimeout(() => setExportStatus(null), 3000);

    } catch (error) {
      console.error('Export error:', error);
      if (error?.message === 'Invalid date range') {
        setFormError('From date must be earlier than or equal to To date.');
      }
      setExportStatus('error');
      setTimeout(() => setExportStatus(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-container">
      <div className="date-range">
        <label className="date-label">
          From
          <input
            className="date-input"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            disabled={isExporting}
          />
        </label>
        <label className="date-label">
          To
          <input
            className="date-input"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            disabled={isExporting}
          />
        </label>
      </div>

      <button
        onClick={handleExport}
        disabled={isExporting}
        className={`export-button ${isExporting ? 'exporting' : ''} ${exportStatus || ''}`}
        title="Export selected date range to Excel"
      >
        {isExporting ? (
          <>
            <Loader2 className="icon spin" size={18} />
            <span>Exporting...</span>
          </>
        ) : exportStatus === 'success' ? (
          <>
            <CheckCircle className="icon" size={18} />
            <span>Exported!</span>
          </>
        ) : exportStatus === 'error' ? (
          <>
            <XCircle className="icon" size={18} />
            <span>Export Failed</span>
          </>
        ) : (
          <>
            <Download className="icon" size={18} />
            <span>Export to Excel</span>
          </>
        )}
      </button>

      {exportStatus === 'error' && (
        <div className="error-message">
          {formError ? formError : 'Failed to export data. Please try again.'}
        </div>
      )}

      <style jsx>{`
        .export-container {
          display: inline-block;
          position: relative;
        }

        .date-range {
          display: flex;
          gap: 10px;
          align-items: flex-end;
          margin-bottom: 8px;
        }

        .date-label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.9);
        }

        .date-input {
          appearance: none;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(0, 0, 0, 0.18);
          color: white;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 13px;
        }

        .date-input:disabled {
          opacity: 0.7;
        }

        .export-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #4472C4;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .export-button:hover:not(:disabled) {
          background: #365DA3;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(68, 114, 196, 0.3);
        }

        .export-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .export-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .export-button.success {
          background: #28a745;
        }

        .export-button.error {
          background: #dc3545;
        }

        .icon {
          flex-shrink: 0;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .error-message {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          background: #dc3545;
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ExportToExcel;