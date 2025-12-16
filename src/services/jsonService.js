/**
 * Convert markdown text to structured JSON
 * Ensures NOTHING is lost - captures every element
 */
function markdownToJson(markdownText) {
  // Keep ALL lines including empty ones for context, but track them
  const allLines = markdownText.split('\n');
  const lines = allLines.map((line, idx) => ({ content: line, originalIdx: idx, isEmpty: !line.trim() }));
  
  const result = {
    headers: [],
    tables: [],
    paragraphs: [],
    lists: [],
    keyValuePairs: [],
    metadata: {},
    formattedText: [], // Captures formatted text like **NOTE:**
    rawText: markdownText,
    structuredData: {},
    allContent: [] // Captures everything in order
  };

  let currentTable = null;
  let currentParagraph = '';
  let currentList = [];
  let currentKeyValuePairs = {};
  let inTable = false;
  let inMetadataSection = false;
  
  // Helper to clean markdown formatting but preserve content
  function cleanMarkdown(text) {
    return text
      .replace(/\*\*/g, '') // Remove bold markers but keep text
      .replace(/\*/g, '')
      .replace(/__/g, '')
      .replace(/_/g, '')
      .trim();
  }
  
  // Helper to detect formatted text like **NOTE:**
  function extractFormattedText(line) {
    const boldMatch = line.match(/\*\*([^*]+)\*\*/g);
    if (boldMatch) {
      return boldMatch.map(m => m.replace(/\*\*/g, ''));
    }
    return null;
  }

  // Helper to detect key-value pairs (e.g., "KEY: VALUE" or "KEY:VALUE")
  function parseKeyValue(line) {
    // Match patterns like "KEY: VALUE", "KEY:VALUE", "KEY : VALUE"
    const match = line.match(/^([^:]+)[:\s]+(.+)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      // Only treat as key-value if key is not too long (avoid false positives)
      if (key.length < 100 && value.length > 0) {
        return { key, value };
      }
    }
    return null;
  }

  for (let i = 0; i < lines.length; i++) {
    const lineObj = lines[i];
    const line = lineObj.content.trim();
    
    // Skip processing empty lines, but continue logic flow
    if (!line && !inTable) {
      // Empty line outside table - save current paragraph/list if exists
      if (currentParagraph.trim()) {
        result.paragraphs.push(currentParagraph.trim());
        result.allContent.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      if (currentList.length > 0) {
        result.lists.push([...currentList]);
        result.allContent.push({ type: 'list', content: [...currentList] });
        currentList = [];
      }
      continue;
    }
    
    // Detect headers (# ## ###)
    if (line.match(/^#{1,6}\s+/)) {
      // Save current paragraph if exists
      if (currentParagraph.trim()) {
        result.paragraphs.push(currentParagraph.trim());
        currentParagraph = '';
      }
      
      // Save key-value pairs before moving to new section
      if (Object.keys(currentKeyValuePairs).length > 0) {
        result.keyValuePairs.push({ ...currentKeyValuePairs });
        Object.assign(result.metadata, currentKeyValuePairs);
        currentKeyValuePairs = {};
        inMetadataSection = false;
      }
      
      const headerLevel = line.match(/^#+/)[0].length;
      const headerText = cleanMarkdown(line.replace(/^#+\s+/, ''));
      const originalText = line.replace(/^#+\s+/, '');
      result.headers.push({ level: headerLevel, text: headerText, originalText: originalText });
      result.allContent.push({ type: 'header', level: headerLevel, text: headerText, originalText: originalText });
      
      // Check for formatted text in header
      const formatted = extractFormattedText(originalText);
      if (formatted) {
        result.formattedText.push(...formatted.map(f => ({ type: 'bold', text: f, context: 'header' })));
      }
      
      inMetadataSection = headerLevel <= 2; // Consider H1/H2 as potential metadata sections
    }
    // Detect markdown tables
    else if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        // Start new table
        inTable = true;
        currentTable = {
          headers: [],
          subHeaders: [], // For multi-row headers
          rows: []
        };
      }
      
      // Parse cells more carefully - handle empty cells and edge cases
      const rawCells = line.split('|');
      const cells = rawCells
        .map(c => c.trim())
        .filter((c, idx) => {
          // Keep first and last empty cells if they exist (they're borders)
          if ((idx === 0 || idx === rawCells.length - 1) && !c) {
            return false; // Filter out border pipes
          }
          return true;
        });
      
      if (cells.length > 0) {
        // Check if it's a separator row (contains only dashes, colons, spaces, or empty)
        const isSeparator = cells.every(cell => /^[\s\-:]*$/.test(cell)) || 
                           cells.length <= 2; // Very short rows might be separators
        if (isSeparator) {
          // Skip separator row, but keep table open
          continue;
        }
        
        // Handle multi-row headers - check if we have headers but they're short or have spanning cells
        if (currentTable.headers.length === 0) {
          // First row is main headers
          currentTable.headers = cells.map(h => h || `Column${currentTable.headers.length + 1}`);
          // Remove empty headers at the end
          while (currentTable.headers.length > 0 && !currentTable.headers[currentTable.headers.length - 1].trim()) {
            currentTable.headers.pop();
          }
        } else if (currentTable.subHeaders.length === 0 && currentTable.rows.length === 0) {
          // Check if this could be a sub-header row (has headers-like text, not data)
          // Sub-headers often have text like "BALL SIZE MIN.", "BALL SIZE MAX.", "TIME", etc.
          const hasHeaderLikeText = cells.filter(cell => {
            const trimmed = cell.trim();
            // Check for header-like patterns: ALL CAPS, contains periods, or specific patterns
            return trimmed.length > 3 && (
              trimmed.match(/^[A-Z][A-Z\s\.\/]+$/) || // ALL CAPS with spaces/periods
              trimmed.match(/[A-Z]{2,}/) && trimmed.includes('.') || // Contains caps and period
              trimmed.match(/^(TIME|MIN|MAX|SIZE|BALL)/i) || // Common header keywords
              (trimmed.length > 10 && trimmed.match(/^[A-Z]/) && !trimmed.match(/^\d/))
            );
          }).length;
          
          const hasDataLikeText = cells.filter(cell => {
            const trimmed = cell.trim();
            // Check for data-like patterns: numbers, times, etc.
            return trimmed.match(/^\d+[:\.]/) || // Time like "11:00"
                   trimmed.match(/^\d+\.\d+/) || // Decimal number
                   trimmed.match(/^(Rough|NA|-)$/i); // Common data values
          }).length;
          
          // If we have more header-like cells than data-like, treat as sub-header
          const looksLikeSubHeader = hasHeaderLikeText > hasDataLikeText || 
                                    (hasHeaderLikeText >= 2 && cells.length >= currentTable.headers.length);
          
          if (looksLikeSubHeader) {
            // This is a sub-header row - merge with main headers
            currentTable.subHeaders = cells.map((sh, idx) => sh || '');
            
            // Create final headers by combining main and sub-headers intelligently
            // Rule: Use sub-header if it exists and is meaningful, otherwise use main header
            const finalHeaders = [];
            const maxCols = Math.max(currentTable.headers.length, cells.length);
            
            for (let i = 0; i < maxCols; i++) {
              const subHeader = (cells[i] || '').trim();
              const mainHeader = (currentTable.headers[i] || '').replace(/\*\*/g, '').trim();
              
              if (subHeader && subHeader.length > 0) {
                // Sub-header exists - use it (it's more specific for that column)
                finalHeaders.push(subHeader);
              } else if (mainHeader && mainHeader.length > 0) {
                // No sub-header, use main header
                finalHeaders.push(mainHeader);
              } else {
                // Both empty - check if this is part of a spanning header
                // Look backwards to find the last non-empty main header
                let foundHeader = '';
                for (let j = Math.min(i, currentTable.headers.length - 1); j >= 0; j--) {
                  const h = (currentTable.headers[j] || '').trim();
                  if (h && h.length > 0) {
                    foundHeader = h.replace(/\*\*/g, '');
                    break;
                  }
                }
                finalHeaders.push(foundHeader || `Column${i + 1}`);
              }
            }
            
            currentTable.headers = finalHeaders;
          } else {
            // This is a data row
            const rowObj = {};
            const maxCols = Math.max(currentTable.headers.length, cells.length);
            
            for (let idx = 0; idx < maxCols; idx++) {
              const header = currentTable.headers[idx] || `Column${idx + 1}`;
              const cellValue = cells[idx] || '';
              rowObj[header] = cellValue.trim();
            }
            
            // Ensure all headers have values
            currentTable.headers.forEach((header, idx) => {
              if (!rowObj.hasOwnProperty(header)) {
                rowObj[header] = '';
              }
            });
            
            // Only add row if it has at least one non-empty cell
            const hasData = Object.values(rowObj).some(val => val.trim() !== '');
            if (hasData) {
              currentTable.rows.push(rowObj);
            }
          }
        } else {
          // Data rows - align with headers, handle mismatched column counts
          const rowObj = {};
          const maxCols = Math.max(currentTable.headers.length, cells.length);
          
          for (let idx = 0; idx < maxCols; idx++) {
            const header = currentTable.headers[idx] || `Column${idx + 1}`;
            const cellValue = cells[idx] || '';
            rowObj[header] = cellValue.trim();
          }
          
          // Ensure all headers have values (fill empty ones)
          currentTable.headers.forEach((header, idx) => {
            if (!rowObj.hasOwnProperty(header)) {
              rowObj[header] = '';
            }
          });
          
          // Add row - keep even if mostly empty (might be intentional spacing)
          // Only skip if ALL cells are truly empty
          const hasData = Object.values(rowObj).some(val => val.trim() !== '');
          if (hasData || currentTable.rows.length === 0) {
            // Add if has data OR if it's the first row after headers (might be intentional)
            currentTable.rows.push(rowObj);
          }
        }
      }
    }
    // Detect lists (- * or numbered)
    else if (line.match(/^[-*]\s+/) || line.match(/^\d+\.\s+/)) {
      // Save current paragraph before starting list
      if (currentParagraph.trim()) {
        result.paragraphs.push(currentParagraph.trim());
        result.allContent.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      const listItem = cleanMarkdown(line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''));
      const originalListItem = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
      currentList.push(listItem);
      
      // Check for formatted text in list items
      const formatted = extractFormattedText(originalListItem);
      if (formatted) {
        result.formattedText.push(...formatted.map(f => ({ type: 'bold', text: f, context: 'list' })));
      }
    }
    // Regular text
    else if (line) {
      // End table if we were in one
      if (inTable && currentTable) {
        // Save table if it has headers (even without rows)
        if (currentTable.headers.length > 0) {
          result.tables.push(currentTable);
          result.allContent.push({ type: 'table', content: currentTable });
        }
        currentTable = null;
        inTable = false;
      }
      
      // End list if we were building one
      if (currentList.length > 0) {
        const listCopy = [...currentList];
        result.lists.push(listCopy);
        result.allContent.push({ type: 'list', content: listCopy });
        currentList = [];
      }
      
      // Check for formatted text like **NOTE:**
      const formatted = extractFormattedText(line);
      if (formatted) {
        result.formattedText.push(...formatted.map(f => ({ type: 'bold', text: f, context: 'paragraph' })));
      }
      
      // Try to detect key-value pairs (especially before tables or in metadata sections)
      const kv = parseKeyValue(line);
      if (kv && (inMetadataSection || i < lines.length / 2)) {
        // Likely metadata - store as key-value
        const cleanKey = cleanMarkdown(kv.key);
        const cleanValue = cleanMarkdown(kv.value);
        currentKeyValuePairs[cleanKey] = cleanValue;
        result.metadata[cleanKey] = cleanValue;
        result.allContent.push({ type: 'keyValue', key: cleanKey, value: cleanValue });
      } else {
        // Regular paragraph text - preserve original but also store cleaned
        currentParagraph += (currentParagraph ? ' ' : '') + cleanMarkdown(line);
      }
    }
  }

  // Save any remaining data - ensure NOTHING is lost
  if (inTable && currentTable) {
    // Save table even if it has no rows (might have headers only)
    if (currentTable.headers.length > 0) {
      result.tables.push(currentTable);
      result.allContent.push({ type: 'table', content: currentTable });
    }
  }
  if (currentParagraph.trim()) {
    result.paragraphs.push(currentParagraph.trim());
    result.allContent.push({ type: 'paragraph', content: currentParagraph.trim() });
  }
  if (currentList.length > 0) {
    result.lists.push(currentList);
    result.allContent.push({ type: 'list', content: currentList });
  }
  if (Object.keys(currentKeyValuePairs).length > 0) {
    result.keyValuePairs.push({ ...currentKeyValuePairs });
    Object.assign(result.metadata, currentKeyValuePairs);
  }

  // Convert keyValuePairs array to single object if all are from same section
  if (result.keyValuePairs.length === 1) {
    result.keyValuePairs = result.keyValuePairs[0];
  }

  // Create structured data object - include EVERYTHING
  if (Object.keys(result.metadata).length > 0) {
    result.structuredData.metadata = result.metadata;
  }
  if (result.tables.length > 0) {
    result.structuredData.tables = result.tables;
  }
  if (result.headers.length > 0) {
    result.structuredData.sections = result.headers.map(h => ({
      level: h.level,
      title: h.text,
      originalText: h.originalText || h.text
    }));
  }
  if (result.paragraphs.length > 0) {
    result.structuredData.content = result.paragraphs;
  }
  if (result.lists.length > 0) {
    result.structuredData.lists = result.lists;
  }
  if (result.formattedText.length > 0) {
    result.structuredData.formattedText = result.formattedText;
  }
  
  // Add complete content array to structured data
  result.structuredData.allContent = result.allContent;
  
  // Add comprehensive summary to ensure nothing is lost
  result.summary = {
    totalHeaders: result.headers.length,
    totalTables: result.tables.length,
    totalTableRows: result.tables.reduce((sum, t) => sum + (t.rows?.length || 0), 0),
    totalTableColumns: result.tables.reduce((sum, t) => sum + (t.headers?.length || 0), 0),
    totalParagraphs: result.paragraphs.length,
    totalLists: result.lists.length,
    totalListItems: result.lists.reduce((sum, l) => sum + (l?.length || 0), 0),
    totalKeyValuePairs: Object.keys(result.metadata).length,
    totalFormattedText: result.formattedText.length,
    totalContentItems: result.allContent.length,
    rawTextLength: markdownText.length,
    rawTextLines: markdownText.split('\n').length
  };

  return result;
}

module.exports = { markdownToJson };

