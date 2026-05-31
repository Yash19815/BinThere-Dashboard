import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import BinCard from "./BinCard";

/**
 * ZoneMapView – renders bins grouped into collapsible zone sections.
 * Replaces the flat `.bin-grid` when "Zone View" is active in App.jsx.
 *
 * @param {Object[]} bins         - Full bin array from useBins
 * @param {Object[]} zones        - Zone array from useZones
 * @param {Function} onBinClick   - Open detail modal
 * @param {Function} onEditLocation
 * @param {Function} onDeleteBin
 * @param {Function} onAssignZone - (binId, zoneId|null) => void
 */
export default function ZoneMapView({
  bins,
  zones,
  onBinClick,
  onEditLocation,
  onDeleteBin,
  onAssignZone,
}) {
  // Track which zone sections are collapsed (by zone id, "unassigned" for null)
  const [collapsed, setCollapsed] = useState(new Set());

  function toggleCollapse(key) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Group bins by zone_id; null → "unassigned"
  const grouped = {};
  bins.forEach((bin) => {
    const key = bin.zone_id ?? "unassigned";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(bin);
  });

  // Build ordered sections: named zones first (sorted by name), then Unassigned
  const sections = zones.map((zone) => ({
    key: zone.id,
    label: zone.name,
    color: zone.color,
    bins: grouped[zone.id] || [],
  }));

  // Always append Unassigned section (even if empty, when there are zones)
  sections.push({
    key: "unassigned",
    label: "Unassigned",
    color: "#6b7280",
    bins: grouped["unassigned"] || [],
  });

  // Helper: average fill% for a group of bins
  function avgFill(groupBins) {
    if (!groupBins.length) return 0;
    let total = 0;
    let count = 0;
    groupBins.forEach((bin) => {
      const dry = bin.dry?.fill_level_percent ?? null;
      const wet = bin.wet?.fill_level_percent ?? null;
      const n = (dry !== null ? 1 : 0) + (wet !== null ? 1 : 0);
      if (n > 0) {
        total += ((dry ?? 0) + (wet ?? 0)) / n;
        count++;
      }
    });
    return count > 0 ? total / count : 0;
  }

  // Build zone select options for assignment dropdown
  const zoneOptions = [
    { id: null, name: "— Unassigned —" },
    ...zones.map((z) => ({ id: z.id, name: z.name })),
  ];

  return (
    <div className="zone-map-view">
      {sections.map((section) => {
        const isCollapsed = collapsed.has(section.key);
        const avg = avgFill(section.bins);

        return (
          <div
            key={section.key}
            className={`zone-section ${isCollapsed ? "zone-section--collapsed" : ""}`}
          >
            {/* Zone section header */}
            <div
              className="zone-section-header"
              onClick={() => toggleCollapse(section.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") && toggleCollapse(section.key)
              }
              aria-expanded={!isCollapsed}
            >
              <div className="zone-header-left">
                <span
                  className="zone-color-dot"
                  style={{ background: section.color }}
                />
                <span className="zone-section-name">{section.label}</span>
                <span className="zone-badge">{section.bins.length} bin{section.bins.length !== 1 ? "s" : ""}</span>
                {section.bins.length > 0 && (
                  <span className="zone-avg-fill">avg {avg.toFixed(0)}% full</span>
                )}
              </div>
              <span className={`zone-collapse-chevron ${isCollapsed ? "zone-collapse-chevron--collapsed" : ""}`}>
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </span>
            </div>

            {/* Bins grid (hidden when collapsed) */}
            {!isCollapsed && (
              <div className="zone-bins-grid">
                {section.bins.length === 0 ? (
                  <p className="zone-empty-hint">No bins in this zone.</p>
                ) : (
                  section.bins.map((bin) => (
                    <div key={bin.id} className="zone-bin-wrapper">
                      <BinCard
                        binId={bin.id}
                        binName={bin.name}
                        binLocation={bin.location}
                        dryPct={bin.dry?.fill_level_percent ?? null}
                        wetPct={bin.wet?.fill_level_percent ?? null}
                        dryRawDistance={bin.dry?.raw_distance_cm}
                        wetRawDistance={bin.wet?.raw_distance_cm}
                        dryUpdated={bin.dry?.last_updated}
                        wetUpdated={bin.wet?.last_updated}
                        onBinClick={onBinClick}
                        onEditLocation={onEditLocation}
                        onDeleteBin={onDeleteBin}
                        zoneName={bin.zone_name ?? null}
                        zones={zones}
                        onAssignZone={onAssignZone}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
