let currentData = null;
let currentFile = null;
let isExtracting = false;
let progressTimer = null;

function setProgress(show, label) {
  const container = document.getElementById('progressBar');
  const labelEl = document.getElementById('progressLabel');
  if (!container || !labelEl) return;

  // Show or hide the progress bar
  if (show) {
    container.classList.add('show');
  } else {
    container.classList.remove('show');
  }

  if (label) {
    labelEl.textContent = label;
  }
}

function startProgressSequence() {
  const steps = [
    'Uploading file…',
    'Reading file details…',
    'Sending to AI for extraction…',
    'Extracting text from image…',
    'Structuring data for Excel…'
  ];
  let index = 0;

  // Immediately show first step
  setProgress(true, steps[index]);

  // Clear any previous timer
  if (progressTimer) {
    clearInterval(progressTimer);
  }

  progressTimer = setInterval(() => {
    if (!isExtracting) {
      stopProgressSequence();
      return;
    }
    index = (index + 1) % steps.length;
    setProgress(true, steps[index]);
  }, 6000);
}

function stopProgressSequence() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
  setProgress(false, '');
}

// File input change handler - auto-extract on file selection
document.getElementById('imageInput').addEventListener('change', function(e) {
  const fileName = document.getElementById('fileName');
  if (e.target.files[0]) {
    currentFile = e.target.files[0];
    setProgress(true, 'Upload complete. Starting extraction…');
    fileName.textContent = `Selected: ${currentFile.name}`;
    fileName.classList.add('show');
    // Auto-extract when file is selected
    autoExtract();
  } else {
    fileName.classList.remove('show');
    currentFile = null;
    currentData = null;
    hideResult();
  }
});

// Drag and drop functionality
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('imageInput');

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = '#667eea';
  uploadArea.style.background = '#f0f0ff';
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.borderColor = '#ddd';
  uploadArea.style.background = '#f8f9fa';
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = '#ddd';
  uploadArea.style.background = '#f8f9fa';
  
  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type.startsWith('image/')) {
    fileInput.files = files;
    currentFile = files[0];
    const fileName = document.getElementById('fileName');
    fileName.textContent = `Selected: ${currentFile.name}`;
    fileName.classList.add('show');
    setProgress(true, 'Upload complete. Starting extraction…');
    // Auto-extract when file is dropped
    autoExtract();
  } else {
    showError('Please drop an image file');
  }
});

// Auto-extract function - called when file is selected
async function autoExtract() {
  if (!currentFile || isExtracting) return;
  
  const formData = new FormData();
  formData.append('image', currentFile);

  setLoading(true);
  hideResult();
  clearError();
  isExtracting = true;
  startProgressSequence();

  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    setLoading(false);
    isExtracting = false;
    stopProgressSequence();

    if (data.success) {
      currentData = data;
      // Commented out: Preview display - can uncomment if needed later
      // displayResult(data);
      
      // Commented out: Show action buttons - can uncomment if needed later
      // const actionButtons = document.getElementById('actionButtons');
      // if (actionButtons) {
      //   actionButtons.style.display = 'flex';
      // }
      
      // Auto-download Excel directly after extraction completes
      await downloadExcel();
    } else {
      showError('Error: ' + (data.details || data.error));
    }
  } catch (error) {
    setLoading(false);
    isExtracting = false;
    stopProgressSequence();
    showError('Error: ' + error.message);
  }
}

// extractData function removed - data is displayed automatically after extraction

function clearFileInput() {
  // Clear the file input
  const fileInput = document.getElementById('imageInput');
  if (fileInput) {
    fileInput.value = '';
  }
  
  // Clear the file name display
  const fileName = document.getElementById('fileName');
  if (fileName) {
    fileName.textContent = '';
    fileName.classList.remove('show');
  }
  
  // Reset variables
  currentFile = null;
  currentData = null;
  
  // Hide progress bar
  stopProgressSequence();
}

async function downloadExcel() {
  // If we have extracted data, use it to generate Excel without calling LLM again
  if (currentData && currentData.rawText) {
    try {
      setLoading(true);
      clearError();
      
      // Send only the markdown text to generate Excel (no image needed)
      const response = await fetch('/api/generate-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          markdown: currentData.rawText
        })
      });

      setLoading(false);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${getBaseFileName()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('Excel file downloaded successfully!');
        // Clear the file input after successful download
        clearFileInput();
      } else {
        const error = await response.json();
        showError('Error: ' + (error.details || error.error));
      }
    } catch (error) {
      setLoading(false);
      showError('Error: ' + error.message);
    }
    return;
  }

  // Fallback: if no cached data, extract first
  if (!currentData && currentFile) {
    await autoExtract();
    // Retry after extraction
    setTimeout(() => downloadExcel(), 500);
    return;
  }

  showError('Please select an image file first');
}

function getBaseFileName() {
  if (currentFile && currentFile.name) {
    return currentFile.name.replace(/\.[^/.]+$/, '') || 'extracted-data';
  }
  return 'extracted-data';
}

function downloadJSON() {
  if (!currentData) {
    showError('No data to download');
    return;
  }

  const jsonStr = JSON.stringify(currentData, null, 2);

  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${getBaseFileName()}.json`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  showSuccess('JSON file downloaded successfully!');
}

function copyToClipboard() {
  if (!currentData) {
    showError('No data to copy');
    return;
  }

  const textToCopy = currentData.rawText || JSON.stringify(currentData, null, 2);
  navigator.clipboard.writeText(textToCopy).then(() => {
    showSuccess('Text copied to clipboard!');
  }).catch(err => {
    showError('Failed to copy: ' + err.message);
  });
}

function clearResult() {
  // Commented out: Hide result preview - can uncomment if needed later
  // hideResult();
  // document.getElementById('extractedData').textContent = '';
  currentData = null;
  currentFile = null;
  document.getElementById('imageInput').value = '';
  document.getElementById('fileName').classList.remove('show');
  // Commented out: Hide action buttons - can uncomment if needed later
  // const actionButtons = document.getElementById('actionButtons');
  // if (actionButtons) {
  //   actionButtons.style.display = 'none';
  // }
  stopProgressSequence();
  clearError();
}

function displayResult(data) {
  const resultDiv = document.getElementById('result');
  const dataDiv = document.getElementById('extractedData');
  
  // Create structured display
  let html = '';
  
  // Show raw text
  html += '<div class="data-section"><h3>📄 Raw Extracted Text</h3><pre class="raw-text">' + escapeHtml(data.rawText || '') + '</pre></div>';
  
  // Show structured data if available
  if (data.structuredData) {
    html += '<div class="data-section"><h3>📊 Structured Data</h3>';
    
    // Metadata/Key-Value Pairs
    if (data.parsedData && data.parsedData.metadata && Object.keys(data.parsedData.metadata).length > 0) {
      html += '<h4>Metadata:</h4>';
      html += '<table class="extracted-table metadata-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>';
      Object.entries(data.parsedData.metadata).forEach(([key, value]) => {
        html += '<tr><td><strong>' + escapeHtml(key) + '</strong></td><td>' + escapeHtml(value || '') + '</td></tr>';
      });
      html += '</tbody></table>';
    }
    
    // Tables
    if (data.parsedData && data.parsedData.tables && data.parsedData.tables.length > 0) {
      html += '<h4>Tables:</h4>';
      data.parsedData.tables.forEach((table, idx) => {
        html += '<div class="table-display"><table class="extracted-table">';
        if (table.headers) {
          html += '<thead><tr>';
          table.headers.forEach(header => {
            html += '<th>' + escapeHtml(header) + '</th>';
          });
          html += '</tr></thead>';
        }
        if (table.rows) {
          html += '<tbody>';
          table.rows.forEach(row => {
            html += '<tr>';
            table.headers.forEach(header => {
              html += '<td>' + escapeHtml(row[header] || '') + '</td>';
            });
            html += '</tr>';
          });
          html += '</tbody>';
        }
        html += '</table></div>';
      });
    }
    
    // Headers/Sections
    if (data.parsedData && data.parsedData.headers && data.parsedData.headers.length > 0) {
      html += '<h4>Sections:</h4><ul class="section-list">';
      data.parsedData.headers.forEach(header => {
        html += '<li><strong>' + escapeHtml(header.text) + '</strong> (Level ' + header.level + ')</li>';
      });
      html += '</ul>';
    }
    
    // Summary
    if (data.summary) {
      html += '<div class="summary-box"><h4>Summary:</h4>';
      html += '<p>Tables: ' + data.summary.totalTables + ' | ';
      html += 'Headers: ' + data.summary.totalHeaders + ' | ';
      html += 'Paragraphs: ' + data.summary.totalParagraphs + ' | ';
      html += 'Lists: ' + data.summary.totalLists + '</p></div>';
    }
    
    html += '</div>';
  }
  
  dataDiv.innerHTML = html;
  resultDiv.classList.add('show');
  
  // Scroll to result
  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideResult() {
  // Result container is commented out, so check if it exists first
  const resultEl = document.getElementById('result');
  if (resultEl) {
    resultEl.classList.remove('show');
  }
}

function setLoading(show) {
  // Loading element is hidden permanently - we use progress bar instead
  const excelBtn = document.getElementById('excelBtn');
  
  if (show) {
    if (excelBtn) excelBtn.disabled = true;
  } else {
    if (excelBtn) excelBtn.disabled = false;
  }
}

function showError(message) {
  const errorContainer = document.getElementById('error');
  errorContainer.innerHTML = `
    <div class="error">
      <span class="error-icon">⚠️</span>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

function showSuccess(message) {
  const errorContainer = document.getElementById('error');
  errorContainer.innerHTML = `
    <div class="success">
      <span class="error-icon">✅</span>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
  
  // Auto-hide success message after 3 seconds
  setTimeout(() => {
    if (errorContainer.innerHTML.includes('success')) {
      errorContainer.innerHTML = '';
    }
  }, 3000);
}

function clearError() {
  document.getElementById('error').innerHTML = '';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

