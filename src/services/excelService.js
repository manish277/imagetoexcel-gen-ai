const ExcelJS = require('exceljs');
const { markdownToJson } = require('./jsonService');

async function markdownToExcel(markdownText, outputPath) {
  const workbook = new ExcelJS.Workbook();
  
  // Parse markdown to structured JSON
  const parsedData = markdownToJson(markdownText);
  
  // Sheet 1: Raw Extracted Text (matches JSON view)
  const rawTextSheet = workbook.addWorksheet('📄 Raw Text');
  rawTextSheet.getCell(1, 1).value = 'Raw Extracted Text';
  rawTextSheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: 'FF667EEA' } };
  rawTextSheet.getRow(1).height = 25;
  
  const rawTextLines = markdownText.split('\n');
  rawTextLines.forEach((line, index) => {
    const cell = rawTextSheet.getCell(index + 3, 1);
    cell.value = line;
    cell.alignment = { wrapText: true, vertical: 'top' };
    cell.font = { name: 'Courier New', size: 11 };
  });
  rawTextSheet.columns[0].width = 100;
  
  // Sheet 2: Structured Data (matches JSON structured view)
  const structuredSheet = workbook.addWorksheet('📊 Structured Data');
  let rowIndex = 1;
  
  // Metadata/Key-Value Pairs Section
  if (parsedData.metadata && Object.keys(parsedData.metadata).length > 0) {
    structuredSheet.getCell(rowIndex, 1).value = 'Metadata';
    structuredSheet.getCell(rowIndex, 1).font = { bold: true, size: 14, color: { argb: 'FF667EEA' } };
    structuredSheet.getCell(rowIndex, 1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7F3FF' }
    };
    structuredSheet.mergeCells(rowIndex, 1, rowIndex, 2);
    rowIndex += 2;
    
    Object.entries(parsedData.metadata).forEach(([key, value]) => {
      const keyCell = structuredSheet.getCell(rowIndex, 1);
      keyCell.value = key;
      keyCell.font = { bold: true };
      keyCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' }
      };
      
      const valueCell = structuredSheet.getCell(rowIndex, 2);
      valueCell.value = value || '';
      valueCell.alignment = { wrapText: true };
      rowIndex++;
    });
    rowIndex += 2;
  }
  
  // Section Headers
  if (parsedData.headers.length > 0) {
    structuredSheet.getCell(rowIndex, 1).value = 'Sections';
    structuredSheet.getCell(rowIndex, 1).font = { bold: true, size: 14, color: { argb: 'FF667EEA' } };
    structuredSheet.getCell(rowIndex, 1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7F3FF' }
    };
    rowIndex += 2;
    
    parsedData.headers.forEach((header, idx) => {
      const levelCell = structuredSheet.getCell(rowIndex, 1);
      levelCell.value = `Level ${header.level}`;
      levelCell.font = { italic: true, color: { argb: 'FF666666' } };
      
      const textCell = structuredSheet.getCell(rowIndex, 2);
      textCell.value = header.text;
      textCell.font = { 
        bold: true, 
        size: header.level === 1 ? 14 : header.level === 2 ? 12 : 11 
      };
      textCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: header.level === 1 ? 'FFE0E0E0' : 'FFF5F5F5' }
      };
      rowIndex++;
    });
    rowIndex += 2;
  }
  
  // Tables Section
  if (parsedData.tables.length > 0) {
    structuredSheet.getCell(rowIndex, 1).value = 'Tables';
    structuredSheet.getCell(rowIndex, 1).font = { bold: true, size: 14, color: { argb: 'FF667EEA' } };
    structuredSheet.getCell(rowIndex, 1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7F3FF' }
    };
    rowIndex += 2;
    
    // Add tables to structured sheet with labels
    parsedData.tables.forEach((table, tableIndex) => {
      if (tableIndex > 0) rowIndex += 2;
      
      // Table label
      const tableLabelCell = structuredSheet.getCell(rowIndex, 1);
      tableLabelCell.value = `Table ${tableIndex + 1}`;
      tableLabelCell.font = { bold: true, size: 12 };
      structuredSheet.mergeCells(rowIndex, 1, rowIndex, table.headers.length);
      rowIndex++;
      
      // Table headers
      table.headers.forEach((header, colIndex) => {
        const cell = structuredSheet.getCell(rowIndex, colIndex + 1);
        cell.value = header;
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF667EEA' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      rowIndex++;

      // Table data rows with alternating colors
      table.rows.forEach((row, rowIdx) => {
        table.headers.forEach((header, colIndex) => {
          const cellValue = row[header] || '';
          const cell = structuredSheet.getCell(rowIndex, colIndex + 1);
          cell.value = cellValue;
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          
          // Alternating row colors
          if (rowIdx % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFFFF' }
            };
          } else {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8F9FA' }
            };
          }
          
          // Try to detect numbers
          if (cellValue && !isNaN(cellValue) && cellValue !== '') {
            cell.value = parseFloat(cellValue);
            cell.numFmt = '#,##0.00';
            cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
          }
        });
        rowIndex++;
      });
    });
    rowIndex += 2;
  }
  
  // Paragraphs Section
  if (parsedData.paragraphs.length > 0) {
    structuredSheet.getCell(rowIndex, 1).value = 'Content';
    structuredSheet.getCell(rowIndex, 1).font = { bold: true, size: 14, color: { argb: 'FF667EEA' } };
    structuredSheet.getCell(rowIndex, 1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7F3FF' }
    };
    rowIndex += 2;
    
    parsedData.paragraphs.forEach((paragraph, idx) => {
      const cell = structuredSheet.getCell(rowIndex, 1);
      cell.value = `Paragraph ${idx + 1}`;
      cell.font = { italic: true, color: { argb: 'FF666666' } };
      
      const textCell = structuredSheet.getCell(rowIndex, 2);
      textCell.value = paragraph;
      textCell.alignment = { wrapText: true, vertical: 'top' };
      structuredSheet.mergeCells(rowIndex, 2, rowIndex, 10);
      rowIndex += Math.max(1, Math.ceil(paragraph.length / 80));
    });
    rowIndex += 2;
  }
  
  // Lists Section
  if (parsedData.lists.length > 0) {
    structuredSheet.getCell(rowIndex, 1).value = 'Lists';
    structuredSheet.getCell(rowIndex, 1).font = { bold: true, size: 14, color: { argb: 'FF667EEA' } };
    structuredSheet.getCell(rowIndex, 1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7F3FF' }
    };
    rowIndex += 2;
    
    parsedData.lists.forEach((list, listIdx) => {
      const listLabelCell = structuredSheet.getCell(rowIndex, 1);
      listLabelCell.value = `List ${listIdx + 1}`;
      listLabelCell.font = { bold: true, size: 12 };
      rowIndex++;
      
      list.forEach((item, idx) => {
        const cell = structuredSheet.getCell(rowIndex, 2);
        cell.value = `• ${item}`;
        cell.alignment = { wrapText: true };
        structuredSheet.mergeCells(rowIndex, 2, rowIndex, 10);
        rowIndex++;
      });
      rowIndex++; // Spacing between lists
    });
  }
  
  // Auto-size columns for structured sheet
  structuredSheet.columns.forEach((column, index) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(Math.max(maxLength + 2, 15), 60);
  });
  
  // Separate sheets for each table (if multiple tables)
  parsedData.tables.forEach((table, index) => {
    if (parsedData.tables.length > 1) {
      const tableSheet = workbook.addWorksheet(`Table ${index + 1}`);
      let tableRowIndex = 1;
      
      // Table headers
      table.headers.forEach((header, colIndex) => {
        const cell = tableSheet.getCell(tableRowIndex, colIndex + 1);
        cell.value = header;
        cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF667EEA' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF000000' } },
          left: { style: 'medium', color: { argb: 'FF000000' } },
          bottom: { style: 'medium', color: { argb: 'FF000000' } },
          right: { style: 'medium', color: { argb: 'FF000000' } }
        };
      });
      tableRowIndex++;

      // Table data rows
      table.rows.forEach((row, rowIdx) => {
        table.headers.forEach((header, colIndex) => {
          const cellValue = row[header] || '';
          const cell = tableSheet.getCell(tableRowIndex, colIndex + 1);
          cell.value = cellValue;
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          
          // Alternating row colors
          if (rowIdx % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFFFF' }
            };
          } else {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8F9FA' }
            };
          }
          
          // Try to detect numbers
          if (cellValue && !isNaN(cellValue) && cellValue !== '') {
            cell.value = parseFloat(cellValue);
            cell.numFmt = '#,##0.00';
            cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
          }
        });
        tableRowIndex++;
      });
      
      // Auto-size columns
      tableSheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(Math.max(maxLength + 2, 15), 50);
      });
    }
  });

  // Summary Sheet (matches JSON summary)
  const summarySheet = workbook.addWorksheet('📋 Summary');
  summarySheet.getCell(1, 1).value = 'Extraction Summary';
  summarySheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: 'FF667EEA' } };
  summarySheet.getRow(1).height = 30;
  
  const summaryData = [
    { label: 'Total Headers:', value: parsedData.headers.length },
    { label: 'Total Tables:', value: parsedData.tables.length },
    { label: 'Total Paragraphs:', value: parsedData.paragraphs.length },
    { label: 'Total Lists:', value: parsedData.lists.length },
  ];
  
  summaryData.forEach((item, index) => {
    const row = index + 3;
    const labelCell = summarySheet.getCell(row, 1);
    labelCell.value = item.label;
    labelCell.font = { bold: true, size: 12 };
    labelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7F3FF' }
    };
    
    const valueCell = summarySheet.getCell(row, 2);
    valueCell.value = item.value;
    valueCell.font = { size: 12 };
    valueCell.alignment = { horizontal: 'center' };
  });
  
  summarySheet.columns[0].width = 25;
  summarySheet.columns[1].width = 15;

  await workbook.xlsx.writeFile(outputPath);
}

module.exports = { markdownToExcel };