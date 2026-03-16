import * as XLSX from 'xlsx';

export type FileType = 'excel' | 'pptx' | 'csv' | 'unknown';

export function detectFileType(file: File): FileType {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return 'excel';
  if (ext === 'pptx') return 'pptx';
  if (ext === 'csv') return 'csv';
  return 'unknown';
}

export async function extractExcelText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  let fullText = '';

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    fullText += `\n=== HOJA: ${sheetName} ===\n${csv}\n`;
  });

  return fullText;
}

export async function extractPPTXText(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
    .sort();

  let fullText = '';
  for (const slidePath of slideFiles) {
    const slideNum = slidePath.match(/slide(\d+)/)?.[1] || '?';
    const xml = await zip.files[slidePath].async('text');

    // Extract text from XML tags <a:t>text</a:t>
    const texts: string[] = [];
    const regex = /<a:t>(.*?)<\/a:t>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      texts.push(match[1]);
    }

    fullText += `\n=== SLIDE ${slideNum} ===\n${texts.join('\n')}\n`;
  }

  return fullText;
}

export async function extractCSVText(file: File): Promise<string> {
  return await file.text();
}

export async function processFileContent(file: File): Promise<{text: string, type: FileType}> {
  const fileType = detectFileType(file);
  if (fileType === 'unknown') {
    throw new Error(`Formato no soportado: .${file.name.split('.').pop()}. Usá .xlsx, .pptx o .csv`);
  }

  let extractedText = '';
  if (fileType === 'excel') extractedText = await extractExcelText(file);
  else if (fileType === 'pptx') extractedText = await extractPPTXText(file);
  else if (fileType === 'csv') extractedText = await extractCSVText(file);

  if (!extractedText.trim()) {
    throw new Error('El archivo está vacío o no se pudo extraer contenido.');
  }

  return { text: extractedText, type: fileType };
}
