const SPREADSHEET_ID = '1_w5tGALMS-EI6JdYz-SSwQtC8LXKdB6gA8Qd3pguMpw';
const DRIVE_FOLDER_ID = '1dfpXGTCa-m2vFNJA9A1j6d0ozwrj24sX';

function setup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Aduan');
  if (!sheet) {
    sheet = ss.insertSheet('Aduan');
  }
  
  const headers = [
    'ID',
    'No Aduan',
    'Nama Pelapor',
    'Tarikh',
    'Masa',
    'Lokasi',
    'Pengusaha',
    'Jenis Aduan',
    'Lain-Lain Jenis',
    'Keterangan',
    'Tindakan Susulan',
    'Lain-Lain Tindakan',
    'Status',
    'Pautan Gambar',
    'Tandatangan',
    'Tarikh Dibuat'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    if (action === 'saveAduan') {
      const data = payload.data;
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName('Aduan');
      
      // Handle Image Uploads
      let imageUrls = [];
      if (data.images && data.images.length > 0) {
        const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        data.images.forEach((img, index) => {
          if (img.base64) {
            const base64Data = img.base64.split(',')[1];
            const contentType = img.base64.split(';')[0].split(':')[1];
            const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, `Aduan_${data.id}_${index + 1}`);
            const file = folder.createFile(blob);
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            imageUrls.push(file.getUrl());
          }
        });
      }
      
      let signatureUrl = '';
      if (data.tandatangan) {
         const base64Data = data.tandatangan.split(',')[1];
         const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png', `Sign_${data.id}`);
         const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
         const file = folder.createFile(blob);
         file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
         signatureUrl = file.getUrl();
      }

      const createdAt = new Date(data.createdAt).toISOString();
      
      // Update existing if exists
      const idColumn = sheet.getRange("A:A").getValues();
      let rowIndex = -1;
      for (let i = 1; i < idColumn.length; i++) {
        if (idColumn[i][0] === data.id) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex > -1) {
        // If it's an update, we only update status and perhaps noAduan (we don't reupload images if not passed)
        sheet.getRange(rowIndex, 13).setValue(data.status); // Status is column 13 (M)
      } else {
        // New Row
        const rowData = [
          data.id,
          data.noAduan || '',
          data.namaPelapor || data.guruId || '',
          data.tarikh,
          data.masa,
          data.lokasi,
          data.pengusaha,
          Array.isArray(data.jenisAduan) ? data.jenisAduan.join(', ') : '',
          data.lainLainJenis || '',
          data.keterangan || '',
          data.tindakanSusulan || '',
          data.lainLainTindakan || '',
          data.status,
          imageUrls.join(', '),
          signatureUrl,
          createdAt
        ];
        sheet.appendRow(rowData);
      }
      
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  if (e.parameter.action === 'getAduan') {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Aduan');
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({success: true, data: []})).setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const result = rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return {
        id: obj['ID'],
        noAduan: obj['No Aduan'],
        namaPelapor: obj['Nama Pelapor'],
        tarikh: obj['Tarikh'],
        masa: obj['Masa'],
        lokasi: obj['Lokasi'],
        pengusaha: obj['Pengusaha'],
        jenisAduan: obj['Jenis Aduan'] ? obj['Jenis Aduan'].split(', ') : [],
        lainLainJenis: obj['Lain-Lain Jenis'],
        keterangan: obj['Keterangan'],
        tindakanSusulan: obj['Tindakan Susulan'],
        lainLainTindakan: obj['Lain-Lain Tindakan'],
        status: obj['Status'],
        gambars: obj['Pautan Gambar'] ? obj['Pautan Gambar'].split(', ').filter(Boolean).map(url => ({url})) : [],
        tandatanganUrl: obj['Tandatangan'] || null
      };
    });
    
    return ContentService.createTextOutput(JSON.stringify({success: true, data: result})).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({success: false, message: "Action not found"})).setMimeType(ContentService.MimeType.JSON);
}

// Ensure CORS compatibility if needed by the fetch
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    });
}
