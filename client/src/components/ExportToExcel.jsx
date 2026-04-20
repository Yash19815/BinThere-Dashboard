import React, { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  XCircle,
  Calendar,
} from "lucide-react";

const ExportToExcel = ({ apiBaseUrl = "http://localhost:3001/api" }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null); // 'success', 'error', null
  const [successInfo, setSuccessInfo] = useState(null);

  const toYmd = (d) => d.toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState(() =>
    toYmd(new Date(Date.now() - 6 * 86400000)),
  );
  const [toDate, setToDate] = useState(() => toYmd(new Date()));
  const [formError, setFormError] = useState(null);

  const applyPreset = (days) => {
    const end = new Date();
    const start = new Date();
    if (days > 0) start.setDate(start.getDate() - days);

    setFromDate(toYmd(start));
    setToDate(toYmd(end));
    setFormError(null);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus(null);
    setFormError(null);
    setSuccessInfo(null);

    try {
      if (fromDate && toDate && fromDate > toDate) {
        throw new Error("Invalid date range");
      }

      const qs = new URLSearchParams();
      if (fromDate) qs.set("from", fromDate);
      if (toDate) qs.set("to", toDate);

      const response = await fetch(
        `${apiBaseUrl}/export/excel?${qs.toString()}`,
        {
          method: "GET",
          headers: {
            Accept:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `binthere_report_${new Date().toISOString().split("T")[0]}.xlsx`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) filename = filenameMatch[1];
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportStatus("success");
      setSuccessInfo(`Report ready: ${fromDate} to ${toDate}`);
      setTimeout(() => {
        setExportStatus(null);
        setSuccessInfo(null);
      }, 5000);
    } catch (error) {
      console.error("Export error:", error);
      if (error?.message === "Invalid date range") {
        setFormError("Start date cannot be after end date.");
      }
      setExportStatus("error");
      setTimeout(() => setExportStatus(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-parent">
      <div className="export-container">
        {/* Presets Column */}
        <div className="presets-section">
          <div className="section-title">
            <Calendar size={12} className="title-icon" />
            <span>Presets</span>
          </div>
          <div className="preset-buttons">
            <button onClick={() => applyPreset(0)} className="preset-btn">
              Today
            </button>
            <button onClick={() => applyPreset(7)} className="preset-btn">
              Last 7D
            </button>
            <button onClick={() => applyPreset(30)} className="preset-btn">
              Last 30D
            </button>
          </div>
        </div>

        <div className="divider" />

        {/* Date Form Column */}
        <div className="form-section">
          <div className="date-range">
            <div className="date-field">
              <span className="field-label">Start Date</span>
              <input
                className="date-input"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                disabled={isExporting}
              />
            </div>
            <span className="date-arrow">→</span>
            <div className="date-field">
              <span className="field-label">End Date</span>
              <input
                className="date-input"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                disabled={isExporting}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`export-button ${isExporting ? "exporting" : ""} ${exportStatus || ""}`}
        >
          {isExporting ? (
            <Loader2 className="icon spin" size={18} />
          ) : exportStatus === "success" ? (
            <CheckCircle className="icon" size={18} />
          ) : exportStatus === "error" ? (
            <XCircle className="icon" size={18} />
          ) : (
            <FileSpreadsheet className="icon" size={18} />
          )}
          <span>
            {isExporting
              ? "Genering..."
              : exportStatus === "success"
                ? "Done!"
                : "Generate Report"}
          </span>
        </button>

        {successInfo && <div className="success-feedback">{successInfo}</div>}

        {exportStatus === "error" && (
          <div className="error-message">
            {formError ? formError : "Export failed. Please try again."}
          </div>
        )}
      </div>

      <style jsx="true">{`
        .export-parent {
          position: relative;
        }

        .export-container {
          display: flex;
          align-items: center;
          gap: 20px;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 8px 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .presets-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .preset-buttons {
          display: flex;
          gap: 6px;
        }

        .preset-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .preset-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .divider {
          width: 1px;
          height: 32px;
          background: rgba(255, 255, 255, 0.1);
        }

        .form-section {
          padding-top: 4px;
        }

        .date-range {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .date-field {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .field-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .date-arrow {
          color: #475569;
          margin-top: 12px;
        }

        .date-input {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #f8fafc;
          border-radius: 8px;
          padding: 5px 10px;
          font-size: 0.85rem;
          font-family: inherit;
          transition: all 0.2s;
        }

        .date-input:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
        }

        .export-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          margin-left: 8px;
        }

        .export-button:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .export-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .export-button:disabled {
          background: #475569;
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .export-button.success {
          background: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .export-button.error {
          background: #ef4444;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .success-feedback {
          position: absolute;
          top: calc(100% + 12px);
          left: 0;
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 500;
          white-space: nowrap;
          animation: fadeIn 0.3s ease;
        }

        .error-message {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 500;
          white-space: nowrap;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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

        @media (max-width: 768px) {
          .export-container {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }
          .divider {
            display: none;
          }
          .date-range {
            flex-direction: column;
            align-items: stretch;
          }
          .date-arrow {
            display: none;
          }
          .export-button {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ExportToExcel;
