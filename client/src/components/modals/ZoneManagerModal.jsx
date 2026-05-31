import React, { useState } from "react";
import { X, Map, Plus, Pencil, Trash2, Check, XCircle } from "lucide-react";

/**
 * ZoneManagerModal – admin-only modal for creating, editing, and deleting zones.
 * Styled consistently with AdminSettingsModal (same backdrop, glassmorphic panel,
 * close button, and modal-header patterns).
 *
 * @param {boolean}  isOpen
 * @param {Function} onClose
 * @param {Object[]} zones     - array of zone objects from useZones
 * @param {string}   token     - JWT token (passed through for context, not used directly)
 * @param {Function} onCreate  - (name, color) => Promise
 * @param {Function} onUpdate  - (id, name, color) => Promise
 * @param {Function} onDelete  - (id) => Promise
 * @param {Function} onRefresh - () => void
 */
export default function ZoneManagerModal({
  isOpen,
  onClose,
  zones,
  token,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
}) {
  // New zone form state
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#4f98a3");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Inline edit state: { [zoneId]: { name, color } } | null
  const [editState, setEditState] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null); // zoneId pending delete

  if (!isOpen) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleAdd(e) {
    e.preventDefault();
    setAddError("");
    if (!newName.trim()) {
      setAddError("Zone name is required.");
      return;
    }
    setAddLoading(true);
    try {
      await onCreate(newName.trim(), newColor);
      setNewName("");
      setNewColor("#4f98a3");
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(zone) {
    setEditState((prev) => ({
      ...prev,
      [zone.id]: { name: zone.name, color: zone.color },
    }));
    setEditErrors((prev) => ({ ...prev, [zone.id]: "" }));
  }

  function cancelEdit(id) {
    setEditState((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function saveEdit(id) {
    const edit = editState[id];
    if (!edit || !edit.name.trim()) {
      setEditErrors((prev) => ({ ...prev, [id]: "Name cannot be empty." }));
      return;
    }
    try {
      await onUpdate(id, edit.name.trim(), edit.color);
      cancelEdit(id);
    } catch (err) {
      setEditErrors((prev) => ({ ...prev, [id]: err.message }));
    }
  }

  async function handleDelete(id) {
    try {
      await onDelete(id);
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Delete zone failed:", err.message);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="modal-backdrop settings-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Zone Manager"
    >
      <div
        className="modal-box zone-manager-modal glassmorphic-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header settings-header">
          <div className="settings-title-wrap">
            <Map size={20} className="settings-header-icon" />
            <h2>Zonal Mapping Manager</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body settings-body">
          {/* Zone list */}
          <div className="zone-list-section">
            <h3 className="tab-headline">Active Zones</h3>

            {zones.length === 0 ? (
              <p className="zone-list-empty">
                No zones defined yet. Add one below to start grouping bins.
              </p>
            ) : (
              <ul className="zone-list">
                {zones.map((zone) => {
                  const isEditing = Boolean(editState[zone.id]);
                  const edit = editState[zone.id] || {};

                  return (
                    <li key={zone.id} className="zone-list-row">
                      {isEditing ? (
                        /* Inline editor */
                        <div className="zone-row-edit">
                          <input
                            type="color"
                            className="zone-color-picker"
                            value={edit.color}
                            onChange={(e) =>
                              setEditState((prev) => ({
                                ...prev,
                                [zone.id]: { ...prev[zone.id], color: e.target.value },
                              }))
                            }
                            title="Zone colour"
                          />
                          <input
                            type="text"
                            className="modal-input zone-name-input"
                            value={edit.name}
                            onChange={(e) =>
                              setEditState((prev) => ({
                                ...prev,
                                [zone.id]: { ...prev[zone.id], name: e.target.value },
                              }))
                            }
                            placeholder="Zone name"
                          />
                          <div className="zone-row-edit-actions">
                            <button
                              className="zone-icon-btn zone-icon-btn--save"
                              onClick={() => saveEdit(zone.id)}
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              className="zone-icon-btn zone-icon-btn--cancel"
                              onClick={() => cancelEdit(zone.id)}
                              title="Cancel"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                          {editErrors[zone.id] && (
                            <span className="zone-inline-error">{editErrors[zone.id]}</span>
                          )}
                        </div>
                      ) : (
                        /* Normal display row */
                        <div className="zone-row-display">
                          <span
                            className="zone-color-dot"
                            style={{ background: zone.color }}
                          />
                          <span className="zone-row-name">{zone.name}</span>
                          <span className="zone-row-count">
                            {zone.bin_count} bin{zone.bin_count !== 1 ? "s" : ""}
                          </span>
                          <div className="zone-row-actions">
                            <button
                              className="zone-icon-btn"
                              onClick={() => startEdit(zone)}
                              title="Edit zone"
                            >
                              <Pencil size={14} />
                            </button>
                            {deleteConfirm === zone.id ? (
                              <>
                                <button
                                  className="zone-icon-btn zone-icon-btn--danger"
                                  onClick={() => handleDelete(zone.id)}
                                  title="Confirm delete"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  className="zone-icon-btn zone-icon-btn--cancel"
                                  onClick={() => setDeleteConfirm(null)}
                                  title="Cancel"
                                >
                                  <XCircle size={14} />
                                </button>
                              </>
                            ) : (
                              <button
                                className="zone-icon-btn zone-icon-btn--danger"
                                onClick={() => setDeleteConfirm(zone.id)}
                                title="Delete zone"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Divider */}
          <div className="divider-line" />

          {/* Add new zone form */}
          <div className="zone-add-section">
            <h3 className="tab-headline">Add New Zone</h3>
            <form className="zone-add-form" onSubmit={handleAdd}>
              <input
                type="color"
                className="zone-color-picker"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                title="Pick zone colour"
              />
              <input
                type="text"
                className="modal-input zone-name-input"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setAddError("");
                }}
                placeholder="Zone name, e.g. Floor 1"
              />
              <button
                type="submit"
                className="modal-btn modal-btn-primary zone-add-btn"
                disabled={addLoading}
              >
                <Plus size={16} />
                <span>{addLoading ? "Adding…" : "Add Zone"}</span>
              </button>
            </form>
            {addError && <p className="zone-add-error">{addError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
