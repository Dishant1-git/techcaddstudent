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

  const trainerName = trainer?.name || '';
  const studentRows = rows.map((row, index) => ({ row, index })).filter(({ row, index }) => {
    if (index <= headerRowIndex) return false;
    const keyMatches = keyColumns.some(column => {
      const cell = normalize(row[column]);
      return cell && [student.student_code, student.email, student.name].some(value => value && cell === normalize(value));
    });
    return keyMatches;
  });

  const exactTrainerRows = trainerCol >= 0 && trainerName
    ? studentRows.filter(({ row }) => normalize(row[trainerCol]) === normalize(trainerName))
    : studentRows;
  // The roster can shorten trainer names ("Harinder" / "Harinder Singh").
  const trainerAliasRows = trainerCol >= 0 && trainerName
    ? studentRows.filter(({ row }) => {
        const label = normalize(row[trainerCol]);
        const fullName = normalize(trainerName);
        return label && (fullName.startsWith(`${label} `) || label.startsWith(`${fullName} `) || fullName.split(' ')[0].startsWith(label.split(' ')[0]));
      })
    : studentRows;
  const matchingRows = exactTrainerRows.length ? exactTrainerRows : trainerAliasRows;
  if (matchingRows.length > 1) {
    throw new Error(`Found multiple sheet rows for student ${student.student_code || student.name}; add a unique student identifier or align the Trainer labels`);
  }

  const dateColumns = rows[headerRowIndex].map((cell, index) => ({ index, value: normalize(cell) }))
    .filter(item => dateVariants(record.date).has(item.value));
  const dateColumn = dateColumns.length ? dateColumns[dateColumns.length - 1].index : -1;
  if (dateColumn < 0) throw new Error(`No date column for ${record.date} was found in the sheet header`);

  if (!matchingRows.length) {
    if (studentRows.length) {
      throw new Error(`Student ${student.name} exists in the sheet under a different trainer label; correct the Trainer cell before syncing`);
    }
    if (nameCol < 0 || trainerCol < 0) {
      throw new Error(`No row found for ${student.name}; the sheet needs Student Name and Trainer columns to add the student`);
    }
    const appendedRow = Array(dateColumn + 1).fill('');
    if (headers[1] === 'dept' || headers[1] === 'department') appendedRow[1] = student.domain || student.course_name || '';
    appendedRow[trainerCol] = trainerName;
    appendedRow[nameCol] = student.name;
    appendedRow[dateColumn] = value;
    const appendRange = encodeURIComponent(`'${title}'!A:ZZ`);
    const appended = await sheetsRequest(`/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      body: JSON.stringify({ majorDimension: 'ROWS', values: [appendedRow] }),
    });
    return {
      sheet: sheet.properties.title,
      cell: appended.updates?.updatedRange || 'appended row',
      value,
      trainer: trainerName,
      studentAdded: true,
    };
  }

  const studentRowIndex = matchingRows[0].index;
  const cell = `${columnLetter(dateColumn)}${studentRowIndex + 1}`;
  await sheetsRequest(`/values/${encodeURIComponent(`'${title}'!${cell}`)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    body: JSON.stringify({ range: `'${title}'!${cell}`, majorDimension: 'ROWS', values: [[value]] }),
  });
  return { sheet: sheet.properties.title, cell, value, trainer: matchingRows[0].row[trainerCol] || trainerName };
}
