const SETTINGS = {
  defaultSpreadsheetId: '1vDwV2V81pUszVFx7RnbnBvApzBL8TxVh4CRTwMJsSAQ',
  defaultDriveFolderId: '1mjpZHafYnaH7JeRGpKdz6bJOyeGsvOBR',
  notifyEmail: 'marketing@firstclinic-tokyo.com',
  sheetName: 'Applications',
  rootFolderName: 'Recruit Applications',
  requiredTextFields: {
    lastName: '姓',
    firstName: '名',
    lastNameKana: 'セイ',
    firstNameKana: 'メイ',
    birthDate: '生年月日',
    gender: '性別',
    email: 'メールアドレス',
    phone: '電話番号'
  },
  requiredFiles: {
    resume: '履歴書',
    cv: '職務経歴書'
  }
};

function doGet() {
  return jsonOutput_({
    status: 'ok',
    message: 'Recruit form endpoint is running.'
  });
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    validatePayload_(payload);

    const submittedAt = new Date();
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId_());
    const sheet = getOrCreateSheet_(spreadsheet, SETTINGS.sheetName);
    ensureHeaderRow_(sheet);

    const rootFolder = getUploadRootFolder_();
    const applicantFolder = rootFolder.createFolder(buildApplicantFolderName_(payload, submittedAt));

    const resumeFile = saveFile_(payload, 'resume', applicantFolder);
    const cvFile = saveFile_(payload, 'cv', applicantFolder);

    sheet.appendRow([
      Utilities.formatDate(submittedAt, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      normalizeText_(payload.lastName),
      normalizeText_(payload.firstName),
      normalizeText_(payload.lastNameKana),
      normalizeText_(payload.firstNameKana),
      normalizeText_(payload.birthDate),
      normalizeText_(payload.gender),
      normalizeText_(payload.email),
      normalizeText_(payload.phone),
      resumeFile.name,
      resumeFile.url,
      resumeFile.id,
      cvFile.name,
      cvFile.url,
      cvFile.id,
      applicantFolder.getName(),
      applicantFolder.getUrl(),
      applicantFolder.getId()
    ]);

    sendNotificationEmail_(payload, resumeFile, cvFile, applicantFolder, submittedAt);

    return jsonOutput_({
      status: 'success',
      message: '応募データを保存しました。'
    });
  } catch (error) {
    console.error(error);
    return jsonOutput_({
      status: 'error',
      message: error && error.message ? error.message : '予期しないエラーが発生しました。'
    });
  }
}

function parsePayload_(e) {
  if (!e) {
    throw new Error('リクエストが空です。');
  }

  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }

  const contents = e.postData && e.postData.contents ? e.postData.contents.trim() : '';
  if (contents) {
    return JSON.parse(contents);
  }

  if (e.parameter && Object.keys(e.parameter).length > 0) {
    return e.parameter;
  }

  throw new Error('送信データを読み取れませんでした。');
}

function validatePayload_(payload) {
  Object.keys(SETTINGS.requiredTextFields).forEach(function(key) {
    if (!normalizeText_(payload[key])) {
      throw new Error(SETTINGS.requiredTextFields[key] + 'を入力してください。');
    }
  });

  Object.keys(SETTINGS.requiredFiles).forEach(function(prefix) {
    if (!normalizeText_(payload[prefix + 'Base64']) || !normalizeText_(payload[prefix + 'Name'])) {
      throw new Error(SETTINGS.requiredFiles[prefix] + 'を添付してください。');
    }
  });
}

function getUploadRootFolder_() {
  const folderId = getOptionalProperty_('DRIVE_FOLDER_ID') || SETTINGS.defaultDriveFolderId;
  if (folderId) {
    return DriveApp.getFolderById(folderId);
  }

  const folderIterator = DriveApp.getFoldersByName(SETTINGS.rootFolderName);
  if (folderIterator.hasNext()) {
    return folderIterator.next();
  }

  return DriveApp.createFolder(SETTINGS.rootFolderName);
}

function getOrCreateSheet_(spreadsheet, sheetName) {
  const existingSheet = spreadsheet.getSheetByName(sheetName);
  if (existingSheet) {
    return existingSheet;
  }

  const sheets = spreadsheet.getSheets();
  if (sheets.length === 1 && sheets[0].getLastRow() === 0 && sheets[0].getLastColumn() === 0) {
    sheets[0].setName(sheetName);
    return sheets[0];
  }

  return spreadsheet.insertSheet(sheetName);
}

function ensureHeaderRow_(sheet) {
  if (sheet.getLastRow() > 0) {
    return;
  }

  sheet.appendRow([
    'submittedAt',
    'lastName',
    'firstName',
    'lastNameKana',
    'firstNameKana',
    'birthDate',
    'gender',
    'email',
    'phone',
    'resumeFileName',
    'resumeFileUrl',
    'resumeFileId',
    'cvFileName',
    'cvFileUrl',
    'cvFileId',
    'applicantFolderName',
    'applicantFolderUrl',
    'applicantFolderId'
  ]);
  sheet.setFrozenRows(1);
}

function saveFile_(payload, prefix, folder) {
  const fileName = sanitizeFileName_(normalizeText_(payload[prefix + 'Name']));
  const mimeType = normalizeText_(payload[prefix + 'Mime']) || 'application/octet-stream';
  const bytes = Utilities.base64Decode(normalizeText_(payload[prefix + 'Base64']));
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = folder.createFile(blob);

  return {
    id: file.getId(),
    name: file.getName(),
    url: file.getUrl()
  };
}

function sendNotificationEmail_(payload, resumeFile, cvFile, applicantFolder, submittedAt) {
  const applicantName = normalizeText_(payload.lastName) + ' ' + normalizeText_(payload.firstName);
  const submittedAtText = Utilities.formatDate(
    submittedAt,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd HH:mm:ss'
  );

  MailApp.sendEmail({
    to: SETTINGS.notifyEmail,
    subject: '【採用応募】' + applicantName + ' さんから応募がありました',
    body:
      '採用フォームから新しい応募がありました。\n\n' +
      '受付日時: ' + submittedAtText + '\n' +
      '氏名: ' + applicantName + '\n' +
      'カナ: ' + normalizeText_(payload.lastNameKana) + ' ' + normalizeText_(payload.firstNameKana) + '\n' +
      '生年月日: ' + normalizeText_(payload.birthDate) + '\n' +
      '性別: ' + normalizeText_(payload.gender) + '\n' +
      'メールアドレス: ' + normalizeText_(payload.email) + '\n' +
      '電話番号: ' + normalizeText_(payload.phone) + '\n' +
      '履歴書: ' + resumeFile.url + '\n' +
      '職務経歴書: ' + cvFile.url + '\n' +
      '保存フォルダ: ' + applicantFolder.getUrl() + '\n'
  });
}

function buildApplicantFolderName_(payload, submittedAt) {
  const timestamp = Utilities.formatDate(submittedAt, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const applicantName = sanitizeFileName_(
    normalizeText_(payload.lastName) + normalizeText_(payload.firstName)
  );

  return timestamp + '_' + applicantName;
}

function sanitizeFileName_(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|#%{}~&]/g, '_')
    .replace(/\s+/g, '_')
    .trim() || 'file';
}

function normalizeText_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function getOptionalProperty_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function getSpreadsheetId_() {
  return getOptionalProperty_('SPREADSHEET_ID') || SETTINGS.defaultSpreadsheetId;
}

function jsonOutput_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
