// Universal file parser: handles TXT, MD, JSON, CSV, PDF, DOCX
export async function parseFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const sizeMB = file.size / (1024 * 1024);

  if (sizeMB > 10) {
    return '[Dosya çok büyük! Maksimum 10MB desteklenir.]';
  }

  if (ext === 'pdf') {
    return await parsePdf(file);
  }
  if (ext === 'docx') {
    return await parseDocx(file);
  }

  // For text-based files (txt, md, csv, json, etc.)
  return await file.text();
}

async function parsePdf(file: File): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    (pdfjsLib.GlobalWorkerOptions as any).workerSrc = '';

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items
        .filter((item: any) => item.str && item.str.trim().length > 0)
        .map((item: any) => item.str);
      text += strings.join(' ') + '\n\n';
    }

    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (cleanText.length === 0) {
      return '[PDF dosyası okundu ancak metin bulunamadı. Bu PDF taranmış görsel içerebilir.]';
    }
    return cleanText;
  } catch (e) {
    console.error('PDF parse error:', e);
    return '[PDF dosyası okunamadı. Dosyanın bozuk olmadığından emin olun.]';
  }
}

async function parseDocx(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = result.value || '';

    if (text.trim().length === 0) {
      return '[DOCX dosyası okundu ancak metin bulunamadı.]';
    }

    // Clean up extra whitespace
    return text.replace(/\n{3,}/g, '\n\n').trim();
  } catch (e) {
    console.error('DOCX parse error:', e);
    return '[DOCX dosyası okunamadı. Dosyanın bozuk olmadığından emin olun.]';
  }
}
