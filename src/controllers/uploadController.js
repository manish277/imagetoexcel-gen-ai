const fs = require('fs');
const path = require('path');
const { queryHF } = require('../services/hfService');
const { markdownToExcel } = require('../services/excelService');
const { markdownToJson } = require('../services/jsonService');

async function uploadImage(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  try {
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);

    // Pass MIME type if available from multer
    const markdown = await queryHF(imageBuffer, req.file.mimetype);

    const excelPath = path.join(__dirname, '../../outputs', `${req.file.filename}.xlsx`);
    await markdownToExcel(markdown, excelPath);

    res.download(excelPath, 'extracted-data.xlsx', () => {
      // Cleanup temp files
      fs.unlinkSync(imagePath);
      fs.unlinkSync(excelPath);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Extraction failed', details: err.message });
  }
}

async function extractData(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  try {
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);

    // Extract markdown/text from image
    const extractedText = await queryHF(imageBuffer, req.file.mimetype);

    // Convert markdown to structured JSON
    const structuredJson = markdownToJson(extractedText);

    // Cleanup temp file
    fs.unlinkSync(imagePath);

    // Return JSON response with both raw and structured data
    res.json({
      success: true,
      rawText: extractedText,
      structuredData: structuredJson.structuredData,
      parsedData: {
        metadata: structuredJson.metadata || {},
        keyValuePairs: structuredJson.keyValuePairs || [],
        headers: structuredJson.headers,
        tables: structuredJson.tables,
        paragraphs: structuredJson.paragraphs,
        lists: structuredJson.lists,
        formattedText: structuredJson.formattedText || [],
        allContent: structuredJson.allContent || [],
      },
      summary: structuredJson.summary || {
        totalHeaders: structuredJson.headers.length,
        totalTables: structuredJson.tables.length,
        totalParagraphs: structuredJson.paragraphs.length,
        totalLists: structuredJson.lists.length,
        totalTableRows: structuredJson.tables.reduce((sum, t) => sum + (t.rows?.length || 0), 0),
        totalTableColumns: structuredJson.tables.reduce((sum, t) => sum + (t.headers?.length || 0), 0),
        totalKeyValuePairs: Object.keys(structuredJson.metadata || {}).length,
        totalFormattedText: (structuredJson.formattedText || []).length,
        totalContentItems: (structuredJson.allContent || []).length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    // Cleanup temp file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false,
      error: 'Extraction failed', 
      details: err.message 
    });
  }
}

async function generateExcelFromMarkdown(req, res) {
  try {
    const { markdown } = req.body;
    
    if (!markdown) {
      return res.status(400).json({ error: 'Markdown text is required' });
    }

    const excelPath = path.join(__dirname, '../../outputs', `extracted-${Date.now()}.xlsx`);
    await markdownToExcel(markdown, excelPath);

    res.download(excelPath, 'extracted-data.xlsx', () => {
      // Cleanup temp file
      if (fs.existsSync(excelPath)) {
        fs.unlinkSync(excelPath);
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      error: 'Excel generation failed', 
      details: err.message 
    });
  }
}

module.exports = { uploadImage, extractData, generateExcelFromMarkdown };