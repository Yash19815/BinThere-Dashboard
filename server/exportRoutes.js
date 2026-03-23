import express from 'express';
import pkg from 'sqlite3';
const { Database } = pkg;
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path - matches your structure (bins.db in server root)
const DB_PATH = join(__dirname, 'bins.db');

// Fixed IST offset (UTC+05:30) - no daylight savings, so it's safe to hardcode.
const IST_OFFSET_MINUTES = 330;
const IST_TIME_ZONE = "Asia/Kolkata";

const istDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const istTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function validateYmd(ymd) {
  return typeof ymd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ymd);
}

// Converts a YYYY-MM-DD *in IST* to an ISO timestamp (UTC) for SQL filtering.
function istYmdToUtcIso(ymd, hour, minute, second, millisecond) {
  const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
  const utcMs = Date.UTC(y, m - 1, d, hour, minute, second, millisecond);
  const utcMsAdjusted = utcMs - IST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMsAdjusted).toISOString();
}

function formatIstDate(isoString) {
  if (!isoString) return "";
  return istDateFormatter.format(new Date(isoString));
}

function formatIstTime(isoString) {
  if (!isoString) return "";
  return istTimeFormatter.format(new Date(isoString));
}

function formatIstDateTime(isoString) {
  if (!isoString) return "";
  return `${formatIstDate(isoString)} ${formatIstTime(isoString)}`;
}

/**
 * GET /api/export/excel
 * Exports bins + filtered measurements (+ filtered fill_cycles) to Excel.
 *
 * Query params:
 *  - from: YYYY-MM-DD (interpreted as IST date)
 *  - to:   YYYY-MM-DD (interpreted as IST date, inclusive to 23:59:59.999)
 */
router.get('/export/excel', async (req, res) => {
  const db = new Database(DB_PATH, pkg.OPEN_READONLY, (err) => {
    if (err) {
      console.error('Database connection error:', err);
      return res.status(500).json({ error: 'Failed to connect to database' });
    }
  });

  try {
    const { from, to } = req.query;
    if (from && !validateYmd(from)) {
      return res.status(400).json({ error: "Invalid 'from' date format (expected YYYY-MM-DD)" });
    }
    if (to && !validateYmd(to)) {
      return res.status(400).json({ error: "Invalid 'to' date format (expected YYYY-MM-DD)" });
    }

    const fromUtcIso = from ? istYmdToUtcIso(from, 0, 0, 0, 0) : null;
    const toUtcIso = to ? istYmdToUtcIso(to, 23, 59, 59, 999) : null;

    const measurementConditions = [];
    const measurementParams = [];
    if (fromUtcIso) {
      measurementConditions.push('timestamp >= ?');
      measurementParams.push(fromUtcIso);
    }
    if (toUtcIso) {
      measurementConditions.push('timestamp <= ?');
      measurementParams.push(toUtcIso);
    }
    const measurementWhere = measurementConditions.length
      ? `WHERE ${measurementConditions.join(' AND ')}`
      : '';

    const fillCycleConditions = [];
    const fillCycleParams = [];
    if (fromUtcIso) {
      fillCycleConditions.push('filled_at >= ?');
      fillCycleParams.push(fromUtcIso);
    }
    if (toUtcIso) {
      fillCycleConditions.push('filled_at <= ?');
      fillCycleParams.push(toUtcIso);
    }
    const fillCycleWhere = fillCycleConditions.length
      ? `WHERE ${fillCycleConditions.join(' AND ')}`
      : '';

    // Fetch data from all three tables
    const [bins, measurements, fillCycles] = await Promise.all([
      queryDatabase(db, 'SELECT * FROM bins ORDER BY id'),
      queryDatabase(db, `SELECT * FROM measurements ${measurementWhere} ORDER BY timestamp DESC`, measurementParams),
      queryDatabase(db, `SELECT * FROM fill_cycles ${fillCycleWhere} ORDER BY filled_at DESC`, fillCycleParams)
    ]);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BinThere Dashboard';
    workbook.created = new Date();

    // Add Bins sheet
    createBinsSheet(workbook, bins);

    // Add Measurements sheet
    createMeasurementsSheet(workbook, measurements);

    // Add Fill Cycles sheet
    createFillCyclesSheet(workbook, fillCycles);

    // Add Summary/Overview sheet
    createSummarySheet(workbook, bins, measurements, fillCycles);

    // Set response headers
    const filename = `binthere_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to generate Excel file', details: error.message });
  } finally {
    db.close();
  }
});

// Helper function to promisify database queries
function queryDatabase(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Create Bins sheet with formatting
function createBinsSheet(workbook, bins) {
  const sheet = workbook.addWorksheet('Bins');

  // Define columns
  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Location', key: 'location', width: 25 },
    { header: 'Max Height (cm)', key: 'max_height_cm', width: 18 }
  ];

  // Style header row
  styleHeaderRow(sheet);

  // Add data
  bins.forEach(bin => {
    sheet.addRow(bin);
  });

  // Apply number formatting
  sheet.getColumn('max_height_cm').numFmt = '0.00';
}

// Create Measurements sheet with formatting
function createMeasurementsSheet(workbook, measurements) {
  const sheet = workbook.addWorksheet('Measurements');

  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Bin ID', key: 'bin_id', width: 10 },
    { header: 'Compartment', key: 'compartment', width: 15 },
    { header: 'Raw Distance (cm)', key: 'raw_distance_cm', width: 18 },
    { header: 'Fill Level (%)', key: 'fill_level_percent', width: 15 },
    { header: 'Date (IST)', key: 'ist_date', width: 14 },
    { header: 'Time (IST)', key: 'ist_time', width: 14 }
  ];

  styleHeaderRow(sheet);

  measurements.forEach(measurement => {
    const rowData = {
      ...measurement,
      ist_date: formatIstDate(measurement.timestamp),
      ist_time: formatIstTime(measurement.timestamp),
    };

    const row = sheet.addRow(rowData);
    
    // Color code compartments
    const compartmentCell = row.getCell('compartment');
    if (measurement.compartment === 'dry') {
      compartmentCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' } // Light blue
      };
    } else if (measurement.compartment === 'wet') {
      compartmentCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F9E6' } // Light green
      };
    }

    // Highlight high fill levels
    const fillCell = row.getCell('fill_level_percent');
    if (measurement.fill_level_percent >= 80) {
      fillCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE6E6' } // Light red
      };
      fillCell.font = { bold: true, color: { argb: 'FFCC0000' } };
    }
  });

  // Apply number formatting
  sheet.getColumn('raw_distance_cm').numFmt = '0.00';
  sheet.getColumn('fill_level_percent').numFmt = '0.0"%"';
}

// Create Fill Cycles sheet with formatting
function createFillCyclesSheet(workbook, fillCycles) {
  const sheet = workbook.addWorksheet('Fill Cycles');

  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Bin ID', key: 'bin_id', width: 10 },
    { header: 'Compartment', key: 'compartment', width: 15 },
    { header: 'Filled At (IST)', key: 'filled_at', width: 22 },
    { header: 'Emptied At (IST)', key: 'emptied_at', width: 22 },
    { header: 'Duration (hours)', key: 'duration', width: 18 }
  ];

  styleHeaderRow(sheet);

  fillCycles.forEach(cycle => {
    const filledAtRaw = cycle.filled_at;
    const emptiedAtRaw = cycle.emptied_at;
    const rowData = { ...cycle };

    // Display fill/empty timestamps in IST (24-hour), while keeping raw ISO
    // timestamps available via local variables for duration calculation.
    rowData.filled_at = formatIstDateTime(filledAtRaw);
    rowData.emptied_at = emptiedAtRaw ? formatIstDateTime(emptiedAtRaw) : '';
    
    // Calculate duration if both timestamps exist
    if (filledAtRaw && emptiedAtRaw) {
      const filled = new Date(filledAtRaw);
      const emptied = new Date(emptiedAtRaw);
      const durationHours = (emptied - filled) / (1000 * 60 * 60);
      rowData.duration = durationHours.toFixed(2);
    } else {
      rowData.duration = 'Still Full';
    }

    const row = sheet.addRow(rowData);

    // Highlight active (not emptied) cycles
    if (!cycle.emptied_at) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF4E6' } // Light orange
        };
      });
    }

    // Color code compartments
    const compartmentCell = row.getCell('compartment');
    if (cycle.compartment === 'dry') {
      compartmentCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      };
    } else if (cycle.compartment === 'wet') {
      compartmentCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F9E6' }
      };
    }
  });

  sheet.getColumn('duration').numFmt = '0.00';
}

// Create Summary sheet with statistics
function createSummarySheet(workbook, bins, measurements, fillCycles) {
  const sheet = workbook.addWorksheet('Summary', { properties: { tabColor: { argb: 'FF4472C4' } } });

  sheet.getColumn('A').width = 30;
  sheet.getColumn('B').width = 20;

  // Title
  const titleRow = sheet.addRow(['BinThere Export Summary']);
  titleRow.font = { size: 16, bold: true };
  titleRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  titleRow.getCell(1).font.color = { argb: 'FFFFFFFF' };
  sheet.addRow([]);

  // Export date
  sheet.addRow(['Export Date:', new Date().toLocaleString()]);
  sheet.addRow([]);

  // Statistics
  sheet.addRow(['Statistics']).font = { bold: true, size: 14 };
  sheet.addRow(['Total Bins:', bins.length]);
  sheet.addRow(['Total Measurements:', measurements.length]);
  sheet.addRow(['Total Fill Cycles:', fillCycles.length]);
  sheet.addRow([]);

  // Active cycles
  const activeCycles = fillCycles.filter(c => !c.emptied_at).length;
  sheet.addRow(['Active Fill Cycles:', activeCycles]);
  sheet.addRow(['Completed Fill Cycles:', fillCycles.length - activeCycles]);
  sheet.addRow([]);

  // Latest measurements by compartment
  if (measurements.length > 0) {
    sheet.addRow(['Latest Fill Levels']).font = { bold: true, size: 14 };
    
    const latestDry = measurements.find(m => m.compartment === 'dry');
    const latestWet = measurements.find(m => m.compartment === 'wet');
    
    if (latestDry) {
      sheet.addRow(['Dry Compartment:', `${latestDry.fill_level_percent.toFixed(1)}%`]);
    }
    if (latestWet) {
      sheet.addRow(['Wet Compartment:', `${latestWet.fill_level_percent.toFixed(1)}%`]);
    }
  }

  sheet.addRow([]);
  sheet.addRow(['Data Sheets:']).font = { bold: true, size: 14 };
  sheet.addRow(['• Bins - Physical dustbin units']);
  sheet.addRow(['• Measurements - Sensor readings']);
  sheet.addRow(['• Fill Cycles - Fill/empty events']);
}

// Helper to style header rows consistently
function styleHeaderRow(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 20;
}

export default router;