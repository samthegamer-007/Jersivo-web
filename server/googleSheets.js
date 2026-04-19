// server/googleSheets.js
// Handles all Google Sheets API communication

require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

let auth;

function getAuth() {
  if (auth) return auth;

  // Support both file path and inline JSON (for Render env var approach)
  const saPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  let credentials;

  if (saPath && fs.existsSync(path.resolve(saPath))) {
    credentials = JSON.parse(fs.readFileSync(path.resolve(saPath), 'utf8'));
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else {
    throw new Error('No Google service account credentials found. Set GOOGLE_SERVICE_ACCOUNT_PATH or GOOGLE_SERVICE_ACCOUNT_JSON.');
  }

  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

/**
 * Read all rows from a sheet (excluding header row)
 * @param {string} sheetName - Tab name inside the spreadsheet
 * @param {string} spreadsheetId - Google Sheet ID
 * @returns {Array} Array of row arrays
 */
async function readFromSheet(sheetName, spreadsheetId) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });
  const rows = res.data.values || [];
  // Remove header row (row 0)
  return rows.slice(1);
}

/**
 * Append a row to a sheet
 * @param {string} sheetName
 * @param {string} spreadsheetId
 * @param {Array} rowData - Array of cell values
 */
async function appendToSheet(sheetName, spreadsheetId, rowData) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'RAW',
    requestBody: { values: [rowData] },
  });
}

/**
 * Update a specific row (1-indexed, includes header)
 * @param {string} sheetName
 * @param {string} spreadsheetId
 * @param {number} rowIndex - 1-indexed row number (2 = first data row)
 * @param {Array} rowData
 */
async function updateRow(sheetName, spreadsheetId, rowIndex, rowData) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [rowData] },
  });
}

/**
 * Get all rows WITH their sheet row numbers (for updates/deletes)
 * Returns objects: { rowIndex (1-based, includes header), data: [...] }
 */
async function readRowsWithIndex(sheetName, spreadsheetId) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });
  const rows = res.data.values || [];
  // rowIndex starts at 2 (row 1 is header)
  return rows.slice(1).map((data, i) => ({ rowIndex: i + 2, data }));
}

module.exports = { readFromSheet, appendToSheet, updateRow, readRowsWithIndex };
