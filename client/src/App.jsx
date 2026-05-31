import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import { useAuth } from "./AuthContext.jsx";
import LoginPage from "./LoginPage.jsx";
import { Plus, RefreshCw, LayoutGrid, Map } from "lucide-react";
import ExportToExcel from "./components/ExportToExcel";

import Header from "./components/layout/Header";
import AnalyticsSection from "./components/dashboard/AnalyticsSection";
import PeakHoursHeatmap from "./components/dashboard/PeakHoursHeatmap";
import FleetUtilizationChart from "./components/dashboard/FleetUtilizationChart";
import BinCard from "./components/dashboard/BinCard";
import ZoneMapView from "./components/dashboard/ZoneMapView";
import HistoryModal from "./components/modals/HistoryModal";
import PromptModal from "./components/modals/PromptModal";
import SetupWizard from "./components/modals/SetupWizard";
import AdminSettingsModal from "./components/modals/AdminSettingsModal";
import ZoneManagerModal from "./components/modals/ZoneManagerModal";

import EmptyState from "./components/ui/EmptyState";
import InlineError from "./components/ui/InlineError";
import { BinCardSkeleton } from "./components/ui/Skeleton";

import { useBins } from "./hooks/useBins";
import { useZones } from "./hooks/useZones";
import { API_URL, authHeaders } from "./utils/constants";

export default function App() {
  const { user, token, logout, loading: authLoading } = useAuth();

  const {
    bins,
    loading: binsLoading,
    error,
    wsStatus,
    analyticsKey,
    analyticsBinId,
    setAnalyticsBinId,
    refreshBins,
    addBin,
    updateBinLocation,
    deleteBin,
  } = useBins(token);

  const [history, setHistory] = useState([]);
  const [selectedBinId, setSelectedBinId] = useState(null);
  const [promptConfig, setPromptConfig] = useState({
    isOpen: false,
    title: "",
    fields: [],
    onSubmit: () => {},
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'zone'
  const [isZoneManagerOpen, setIsZoneManagerOpen] = useState(false);

  const { zones, createZone, updateZone, deleteZone, assignBinToZone, refreshZones } =
    useZones(token);

  useEffect(() => {
    const checkConfigStatus = async () => {
      const isCompleted = localStorage.getItem("bt_setup_completed");
      if (isCompleted !== "true") {
        try {
          const res = await fetch(`${API_URL}/api/config/status`, {
            headers: authHeaders(token),
          });
          const data = await res.json();
          if (
            data.status !== "success" ||
            !data.config ||
            !data.config.EMPTY_THRESHOLD
          ) {
            setIsSetupOpen(true);
          } else {
            localStorage.setItem("bt_setup_completed", "true");
          }
        } catch {
          setIsSetupOpen(true);
        }
      }
    };

    if (token) {
      checkConfigStatus();
    }
  }, [token]);

  const closePrompt = () =>
    setPromptConfig((prev) => ({ ...prev, isOpen: false }));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBins();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const openDetail = useCallback(
    async (binId) => {
      setSelectedBinId(binId);
      try {
        const res = await fetch(`${API_URL}/api/bins/${binId}`, {
          headers: authHeaders(token),
        });
        const json = await res.json();
        setHistory(json.history || []);
      } catch {
        setHistory([]);
      }
    },
    [token],
  );

  const handleEditLocation = useCallback(
    async (binId, currLocation) => {
      // Find the current bin to know its current zone
      const currentBin = bins.find((b) => b.id === binId);
      const currentZoneId = currentBin?.zone_id ?? "";

      setPromptConfig({
        isOpen: true,
        title: "Edit Bin Location & Zone",
        fields: [
          {
            name: "location",
            label: "Specific Location",
            initialValue: currLocation,
            placeholder: "e.g. Lobby, 2nd Floor South",
          },
          {
            name: "zone_id",
            label: "Assign to Zone",
            type: "select",
            required: false,
            initialValue: String(currentZoneId),
            options: [
              { value: "", label: "— Unassigned —" },
              ...zones.map((z) => ({ value: String(z.id), label: z.name })),
            ],
          },
        ],
        onSubmit: async (values) => {
          const newLoc = values.location.trim();
          if (!newLoc) return;
          // Convert zone_id: empty string → null, otherwise parse int
          const newZoneId =
            values.zone_id === "" ? null : parseInt(values.zone_id, 10);
          try {
            await updateBinLocation(binId, newLoc, newZoneId);
          } catch (err) {
            alert(`Error updating bin: ${err.message}`);
          }
        },
      });
    },
    [updateBinLocation, bins, zones],
  );

  const handleAddBin = useCallback(async () => {
    setPromptConfig({
      isOpen: true,
      title: "Add New Smart Dustbin",
      fields: [
        {
          name: "name",
          label: "Dustbin Name",
          placeholder: "e.g. SmartBin-CX-01",
        },
        {
          name: "location",
          label: "Physical Location",
          placeholder: "e.g. Main Entrance",
        },
        {
          name: "zone_id",
          label: "Assign to Zone (optional)",
          type: "select",
          required: false,
          initialValue: "",
          options: [
            { value: "", label: "— Unassigned —" },
            ...zones.map((z) => ({ value: String(z.id), label: z.name })),
          ],
        },
      ],
      onSubmit: async (values) => {
        try {
          const zoneId =
            values.zone_id === "" ? null : parseInt(values.zone_id, 10);
          await addBin(values.name.trim(), values.location.trim(), zoneId);
        } catch (err) {
          alert(`Error creating bin: ${err.message}`);
        }
      },
    });
  }, [addBin, zones]);

  const handleDeleteBin = useCallback(
    async (binId, binName) => {
      if (
        !window.confirm(
          `Are you sure you want to delete "${binName}"?\nThis will erase ALL its history permanently.`,
        )
      )
        return;

      try {
        await deleteBin(binId);
      } catch (err) {
        alert(`Error deleting bin: ${err.message}`);
      }
    },
    [deleteBin],
  );

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="pulse-ring" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const selectedBin = bins.find((b) => b.id === selectedBinId);

  return (
    <div className="app">
      <Header
        bins={bins}
        wsStatus={wsStatus}
        user={user}
        onLogout={logout}
        onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
        onOpenZoneManager={() => setIsZoneManagerOpen(true)}
      />

      <main className="main">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Operational Dashboard</h1>
            <p className="page-sub">
              Fleet intelligence & sensor monitoring system
            </p>
          </div>
          <div className="page-title-actions">
            {/* Grid / Zone view toggle */}
            <div className="view-toggle" role="group" aria-label="View mode">
              <button
                id="view-toggle-grid"
                className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <LayoutGrid size={15} />
                <span>Grid</span>
              </button>
              <button
                id="view-toggle-zone"
                className={`view-toggle-btn ${viewMode === "zone" ? "active" : ""}`}
                onClick={() => setViewMode("zone")}
                title="Zone View"
              >
                <Map size={15} />
                <span>Zone</span>
              </button>
            </div>

            <button
              className={`refresh-btn ${isRefreshing ? "refreshing" : ""}`}
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh Data"
            >
              <RefreshCw size={18} className={isRefreshing ? "spin" : ""} />
              <span>Refresh</span>
            </button>
            <button className="add-bin-btn" onClick={handleAddBin}>
              <Plus size={18} />
              <span>Add Dustbin</span>
            </button>
          </div>
        </div>

        <div className="dashboard-hero">
          <FleetUtilizationChart token={token} refreshKey={analyticsKey} />
          <ExportToExcel apiBaseUrl={`${API_URL}/api`} />
        </div>

        {binsLoading && bins.length === 0 ? (
          <div className="bin-grid">
            <BinCardSkeleton />
            <BinCardSkeleton />
            <BinCardSkeleton />
          </div>
        ) : error ? (
          <InlineError message={error} onRetry={refreshBins} />
        ) : bins.length === 0 ? (
          <EmptyState
            icon="🗑️"
            title="No Bins Found"
            description="Waiting for sensor data. Make sure the backend is running and the ESP32 is sending data."
          >
            <button className="add-bin-btn" onClick={handleAddBin}>
              <Plus size={18} />
              <span>Add Dustbin</span>
            </button>
          </EmptyState>
        ) : (
          <>
            <div className="bin-selector-container">
              <div className="selector-meta">
                <label className="selector-label">Unit Analysis Target</label>
                <p className="selector-sub">
                  Focus analytics on specific infrastructure units
                </p>
              </div>
              <select
                className="analytics-bin-select"
                value={analyticsBinId || ""}
                onChange={(e) =>
                  setAnalyticsBinId(
                    e.target.value === "fleet"
                      ? "fleet"
                      : Number(e.target.value),
                  )
                }
              >
                <option value="fleet">All Bins — Overall</option>
                {bins.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.location}
                  </option>
                ))}
              </select>
            </div>

            {analyticsBinId && (
              <>
                <AnalyticsSection
                  binId={analyticsBinId}
                  refreshKey={analyticsKey}
                  token={token}
                />
                {analyticsBinId !== "fleet" && (
                  <PeakHoursHeatmap binId={analyticsBinId} token={token} />
                )}
              </>
            )}

            <div className={viewMode === "grid" ? "bin-grid" : ""}>
              {viewMode === "grid" ? (
                bins.map((bin) => (
                  <BinCard
                    key={bin.id}
                    binId={bin.id}
                    binName={bin.name}
                    binLocation={bin.location}
                    dryPct={bin.dry?.fill_level_percent ?? null}
                    wetPct={bin.wet?.fill_level_percent ?? null}
                    dryRawDistance={bin.dry?.raw_distance_cm}
                    wetRawDistance={bin.wet?.raw_distance_cm}
                    dryUpdated={bin.dry?.last_updated}
                    wetUpdated={bin.wet?.last_updated}
                    onBinClick={openDetail}
                    onEditLocation={handleEditLocation}
                    onDeleteBin={handleDeleteBin}
                    zoneName={bin.zone_name ?? null}
                    zones={zones}
                    onAssignZone={assignBinToZone}
                  />
                ))
              ) : (
                <ZoneMapView
                  bins={bins}
                  zones={zones}
                  onBinClick={openDetail}
                  onEditLocation={handleEditLocation}
                  onDeleteBin={handleDeleteBin}
                  onAssignZone={assignBinToZone}
                />
              )}
            </div>
          </>
        )}
      </main>

      {selectedBin && (
        <HistoryModal
          bin={selectedBin}
          history={history}
          onClose={() => {
            setSelectedBinId(null);
            setHistory([]);
          }}
        />
      )}

      <PromptModal
        isOpen={promptConfig.isOpen}
        title={promptConfig.title}
        fields={promptConfig.fields}
        onSubmit={promptConfig.onSubmit}
        onClose={closePrompt}
      />

      <SetupWizard
        isOpen={isSetupOpen}
        token={token}
        onComplete={(newConfig) => {
          setIsSetupOpen(false);
          refreshBins();
        }}
        onClose={() => setIsSetupOpen(false)}
      />

      <AdminSettingsModal
        isOpen={isAdminSettingsOpen}
        onClose={() => setIsAdminSettingsOpen(false)}
        token={token}
        onConfigUpdate={(newConfig) => {
          refreshBins();
        }}
      />

      {user?.role === "admin" && (
        <ZoneManagerModal
          isOpen={isZoneManagerOpen}
          onClose={() => setIsZoneManagerOpen(false)}
          zones={zones}
          token={token}
          onCreate={createZone}
          onUpdate={updateZone}
          onDelete={deleteZone}
          onRefresh={refreshZones}
        />
      )}
    </div>
  );
}
