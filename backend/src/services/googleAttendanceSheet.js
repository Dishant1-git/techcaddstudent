import crypto from 'crypto';
import config from '../config/index.js';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
let tokenCache = { token: '', expiresAt: 0 };

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function getAccessToken() {
  if (tokenCache.token && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const { googleServiceAccountEmail: clientEmail, googleServiceAccountPrivateKey: privateKey } = config;
  if (!clientEmail || !privateKey || !config.attendanceSheetId || !config.attendanceSheetGid) {
    throw new Error('Google attendance sheet integration is not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify({
    iss: clientEmail,
    scope: SHEETS_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(privateKey, 'base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || payload.error || 'Google token request failed');
  tokenCache = { token: payload.access_token, expiresAt: Date.now() + (payload.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

async function sheetsRequest(path, options = {}) {
  const token = await getAccessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.attendanceSheetId}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'Google Sheets request failed');
  return payload;
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ');
}

function columnLetter(index) {
  let result = '';
  for (let value = index + 1; value; value = Math.floor((value - 1) / 26)) {
    result = String.fromCharCode(65 + ((value - 1) % 26)) + result;
  }
  return result;
}

function columnIndex(column) {
  let index = 0;
  for (const char of String(column || '').toUpperCase()) {
    if (char < 'A' || char > 'Z') throw new Error(`Invalid student ID column: ${column}`);
    index = index * 26 + char.charCodeAt(0) - 64;
  }
  return index - 1;
}

function studentNameScore(sheetName, portalName) {
  const sheetValue = normalize(sheetName);
  const portalValue = normalize(portalName);
  if (!sheetValue || !portalValue) return 0;
  if (sheetValue === portalValue) return 100;
  const sheetTokens = sheetValue.split(' ');
  const portalTokens = portalValue.split(' ');
  const sharedPrefix = sheetTokens.some(sheetToken => portalTokens.some(portalToken =>
    Math.min(sheetToken.length, portalToken.length) >= 4 &&
    (sheetToken.startsWith(portalToken) || portalToken.startsWith(sheetToken))
  ));
  return sharedPrefix ? 50 : 0;
}

function dateVariants(date) {
  const [year, month, day] = date.split('-');
  return new Set([date, `${Number(day)}/${Number(month)}/${year}`, `${day}/${month}/${year}`, `${Number(month)}/${Number(day)}/${year}`, `${month}/${day}/${year}`, `${Number(day)}-${Number(month)}-${year}`].map(normalize));
}

/** Updates the existing student's daily cell after attendance is verified or rejected. */
export async function syncAttendanceToSheet(record, student, trainer, status) {
  const value = status === 'Verified'
    ? config.attendanceSheetPresentValue
    : status === 'Rejected'
      ? config.attendanceSheetAbsentValue
      : null;
  if (!value) throw new Error(`Unsupported attendance status for sheet sync: ${status}`);

  const metadata = await sheetsRequest('?fields=sheets(properties(sheetId,title))');
  const sheet = metadata.sheets?.find(item => String(item.properties.sheetId) === String(config.attendanceSheetGid));
  if (!sheet) throw new Error(`Configured sheet tab gid ${config.attendanceSheetGid} was not found`);
  const title = sheet.properties.title.replace(/'/g, "''");
  const range = `'${title}'!A1:ZZ`;
  const values = await sheetsRequest(`/values/${encodeURIComponent(range)}?majorDimension=ROWS`);
  const rows = values.values || [];
  const headerRowIndex = rows.findIndex(row => row.some(cell => /^(student ?(id|code|email|name)|email|date|trainer|attendance)$/i.test(String(cell || '').trim())));
  if (headerRowIndex < 0) throw new Error('Could not identify the sheet header row');
  const headers = rows[headerRowIndex].map(normalize);
  const indexOf = patterns => headers.findIndex(header => patterns.includes(header));
  const studentCodeCol = indexOf(['student id', 'student code', 'id', 'code']);
  const emailCol = indexOf(['email', 'student email']);
  const nameCol = indexOf(['student name', 'name', 'student']);
  const trainerCol = indexOf(['trainer', 'trainer name', 'faculty']);
  const keyColumns = [studentCodeCol, emailCol, nameCol].filter(index => index >= 0);
  if (!keyColumns.length) throw new Error('Sheet needs a Student ID/Code, Email, or Student Name column');

  if (trainerCol < 0 || nameCol < 0) throw new Error('Sheet needs Trainer and Student Name columns');
  const trainerName = trainer?.name || '';
  if (!trainerName) throw new Error('The student has no assigned trainer in the portal');
  const configuredIdCol = columnIndex(config.attendanceSheetStudentIdColumn);
  const idValues = [student.id, student.student_id, student.student_code].filter(value => value !== undefined && value !== null && value !== '').map(normalize);
  const rosterRows = rows.map((row, index) => ({ row, index })).filter(({ index }) => index > headerRowIndex);
  const exactTrainerRows = rosterRows.filter(({ row }) => normalize(row[trainerCol]) === normalize(trainerName));
  const trainerRows = exactTrainerRows.length ? exactTrainerRows : rosterRows.filter(({ row }) => {
    const label = normalize(row[trainerCol]);
    const fullName = normalize(trainerName);
    return label && (fullName.startsWith(`${label} `) || label.startsWith(`${fullName} `) || fullName.split(' ')[0].startsWith(label.split(' ')[0]));
  });
  if (!trainerRows.length) throw new Error(`No roster rows found for assigned trainer ${trainerName}`);

  const scoredRows = trainerRows.map(({ row, index }) => {
    const idMatch = idValues.includes(normalize(row[configuredIdCol]));
    const keyMatch = [student.student_code, student.email].some(value => value && keyColumns.some(column => normalize(row[column]) === normalize(value)));
    const nameScore = studentNameScore(row[nameCol], student.name);
    return { row, index, score: idMatch ? 300 : keyMatch ? 200 : nameScore };
  }).filter(item => item.score > 0);
  const topScore = Math.max(0, ...scoredRows.map(item => item.score));
  const matchingRows = scoredRows.filter(item => item.score === topScore);
  if (matchingRows.length > 1) {
    throw new Error(`Multiple students under ${trainerName} match ${student.name}; add a unique student ID to column ${config.attendanceSheetStudentIdColumn}`);
  }

  const dateColumns = rows[headerRowIndex].map((cell, index) => ({ index, value: normalize(cell) }))
    .filter(item => dateVariants(record.date).has(item.value));
  const dateColumn = dateColumns.length ? dateColumns[dateColumns.length - 1].index : -1;
  if (dateColumn < 0) throw new Error(`No date column for ${record.date} was found in the sheet header`);

  if (!matchingRows.length) {
    throw new Error(`No existing student row found under trainer ${trainerName} for ${student.name} (portal ID ${student.id}); no row was added`);
  }

  const studentRowIndex = matchingRows[0].index;
  const cell = `${columnLetter(dateColumn)}${studentRowIndex + 1}`;
  await sheetsRequest(`/values/${encodeURIComponent(`'${title}'!${cell}`)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    body: JSON.stringify({ range: `'${title}'!${cell}`, majorDimension: 'ROWS', values: [[value]] }),
  });
  return { sheet: sheet.properties.title, cell, value, trainer: matchingRows[0].row[trainerCol] || trainerName };
}
