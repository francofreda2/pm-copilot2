import * as XLSX from 'xlsx';

export type FileType = 'excel' | 'pptx' | 'csv' | 'docx' | 'txt' | 'unknown';

export function detectFileType(file: File): FileType {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return 'excel';
  if (ext === 'pptx') return 'pptx';
  if (ext === 'csv') return 'csv';
  if (ext === 'docx') return 'docx';
  if (ext === 'txt') return 'txt';
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

    const texts: string[] = [];
    const regex = /<a:t>(.*?)<\/a:t>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      if (match[1].trim()) texts.push(match[1]);
    }

    fullText += `\n=== SLIDE ${slideNum} ===\n${texts.join('\n')}\n`;
  }

  return fullText;
}

export async function extractDOCXText(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const docXml = zip.files['word/document.xml'];
  if (!docXml) throw new Error('No se encontró el contenido del documento Word.');

  const xml = await docXml.async('text');

  // Extract text from <w:t> tags
  const texts: string[] = [];
  const regex = /<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    if (match[1].trim()) texts.push(match[1]);
  }

  // Group by paragraphs (separate by </w:p>)
  const paragraphs: string[] = [];
  const paraRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
  let paraMatch;
  while ((paraMatch = paraRegex.exec(xml)) !== null) {
    const paraText: string[] = [];
    const tRegex = /<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(paraMatch[0])) !== null) {
      if (tMatch[1]) paraText.push(tMatch[1]);
    }
    const line = paraText.join('').trim();
    if (line) paragraphs.push(line);
  }

  return paragraphs.length > 0 ? paragraphs.join('\n') : texts.join('\n');
}

export async function extractCSVText(file: File): Promise<string> {
  return await file.text();
}

export async function extractTXTText(file: File): Promise<string> {
  return await file.text();
}

export async function processFileContent(file: File): Promise<{ text: string; type: FileType }> {
  const fileType = detectFileType(file);

  if (fileType === 'unknown') {
    throw new Error(
      `Formato no soportado: .${file.name.split('.').pop()}. Usá .pptx, .xlsx, .xls, .csv, .docx o .txt`
    );
  }

  let extractedText = '';
  if (fileType === 'excel') extractedText = await extractExcelText(file);
  else if (fileType === 'pptx') extractedText = await extractPPTXText(file);
  else if (fileType === 'csv') extractedText = await extractCSVText(file);
  else if (fileType === 'docx') extractedText = await extractDOCXText(file);
  else if (fileType === 'txt') extractedText = await extractTXTText(file);

  if (!extractedText.trim()) {
    throw new Error('El archivo está vacío o no se pudo extraer contenido.');
  }

  return { text: extractedText, type: fileType };
}
