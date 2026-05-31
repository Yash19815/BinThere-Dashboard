import { useState, useCallback, useEffect } from "react";
import { API_URL, authHeaders } from "../utils/constants";

/**
 * useZones – manages zone state and all zone-related API calls.
 * Modelled after useBins.js: fetch on mount, expose state + action functions.
 *
 * @param {string} token - JWT auth token
 */
export function useZones(token) {
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(true);

  const fetchZones = useCallback(async () => {
    setZonesLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/zones`, {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error("Failed to fetch zones");
      const json = await res.json();
      if (json.zones) setZones(json.zones);
    } catch (err) {
      console.error("useZones fetchZones:", err.message);
    } finally {
      setZonesLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  /**
   * Create a new zone.
   * @param {string} name
   * @param {string} color - hex colour string, e.g. "#4f98a3"
   */
  const createZone = async (name, color) => {
    const res = await fetch(`${API_URL}/api/zones`, {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    const json = await res.json();
    if (json.status === "success") {
      await fetchZones();
      return json.zone;
    }
    throw new Error(json.error || json.message || "Failed to create zone");
  };

  /**
   * Update an existing zone's name and/or colour.
   * @param {number} id
   * @param {string} name
   * @param {string} color
   */
  const updateZone = async (id, name, color) => {
    const res = await fetch(`${API_URL}/api/zones/${id}`, {
      method: "PUT",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    const json = await res.json();
    if (json.status === "success") {
      await fetchZones();
      return json.zone;
    }
    throw new Error(json.error || json.message || "Failed to update zone");
  };

  /**
   * Delete a zone. All bins in that zone will be unassigned automatically.
   * @param {number} id
   */
  const deleteZone = async (id) => {
    const res = await fetch(`${API_URL}/api/zones/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    const json = await res.json();
    if (json.status === "success") {
      setZones((prev) => prev.filter((z) => z.id !== id));
      return true;
    }
    throw new Error(json.error || json.message || "Failed to delete zone");
  };

  /**
   * Assign a bin to a zone, or unassign it (pass null for zoneId).
   * @param {number} binId
   * @param {number|null} zoneId
   */
  const assignBinToZone = async (binId, zoneId) => {
    const res = await fetch(`${API_URL}/api/bins/${binId}/zone`, {
      method: "PATCH",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ zone_id: zoneId ?? null }),
    });
    const json = await res.json();
    if (json.status === "success") {
      // Refresh zone bin_counts after assignment change
      await fetchZones();
      return json.bin;
    }
    throw new Error(json.error || json.message || "Failed to assign bin to zone");
  };

  return {
    zones,
    zonesLoading,
    createZone,
    updateZone,
    deleteZone,
    assignBinToZone,
    refreshZones: fetchZones,
  };
}
