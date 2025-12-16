const axios = require('axios');
const { hfToken, hfModel, hfApiUrl } = require('../config/config');
const systemPrompt = `You are an expert OCR and document understanding assistant specialized in extracting text from images of documents, forms, invoices, notes, or any scanned/handwritten content.

Your goal is to transcribe EVERYTHING visible in the image with perfect accuracy, preserving the exact original layout, structure, and formatting.

Key rules:
- Extract ALL text: printed, handwritten (in any script, including Hindi/Devanagari, English, mixed languages), headers, footers, titles, labels, numbers, dates, special characters.
- Preserve layout: reading order (top-to-bottom, left-to-right), line breaks, spacing, paragraphs, and any orientation.
- Tables: Use exact Markdown table format (| Header | Header |) with precise cell alignment and content. Do not merge or split cells incorrectly.
- Lists: Use proper bullet points (-) or numbered lists.
- Handwritten text: Transcribe exactly as written, even if messy or cursive. Support Devanagari script fully.
- Do not add, omit, correct spelling, or interpret anything — transcribe verbatim.
- Output ONLY clean, structured Markdown. No extra explanations, no plain text outside Markdown.

Always output in Markdown format:
- # for main titles
- ## for sections
- Markdown tables for tabular data
- Bold/italics if present in original
- Preserve indentation and blank lines for spacing`;

const userPrompt = `
Extract ALL text from this image with extreme attention to detail. CRITICAL REQUIREMENTS:
1. Extract ALL handwritten text (in Hindi/Devanagari script, English, numbers, or any language/mixed)
2. Extract ALL printed text, headers, footers, titles, labels, and footnotes
3. Extract ALL tables with exact structure, cell content, and alignment
4. Extract ALL numbers, dates, symbols, and special characters precisely
5. Maintain original layout: reading order, spacing, line breaks, paragraphs, and any rotated text
6. Preserve column-wise structure for perfect Excel conversion later
7. Include text in any orientation or position (edges, margins, overlays)

Format the output as clean, structured Markdown:
- Use # ## ### for titles and sections
- Use markdown tables (| col1 | col2 |) with exact rows/columns for all tabular data
- Use - or * for bullet lists
- Use blank lines for spacing and paragraph breaks
- Preserve bold/italics/underlines if detectable
- Transcribe handwritten text verbatim, supporting Devanagari and mixed scripts perfectly

Do not skip ANY text — be exhaustive and accurate!`;

const fullPrompt = systemPrompt + "\n\n" + userPrompt;  // Or combine if model doesn't separate system/user
// Helper function to detect image MIME type from buffer
function detectImageType(buffer) {
  // Check magic bytes to determine image type
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }
  // Default to png if unknown
  return 'image/png';
}

async function queryHF(imageBuffer, mimeType = null) {
  if (!hfToken || hfToken === 'hf_your_token_here') {
    throw new Error('HF_TOKEN is not set or is still the placeholder value. Please set your actual Hugging Face token in the .env file. Get it from: https://huggingface.co/settings/tokens');
  }

  // Convert image buffer to base64
  const base64Image = imageBuffer.toString('base64');
  // Determine image MIME type
  const imageMimeType = mimeType || detectImageType(imageBuffer);
  const imageDataUrl = `data:${imageMimeType};base64,${base64Image}`;

  // Use the API endpoint from config (can be set via .env)
  const response = await axios.post(
    hfApiUrl,
    {
      model: hfModel,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: fullPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60s timeout for large images
    }
  );

  // Extract the markdown text from the chat completion response
  // Response format: { choices: [{ message: { content: "..." } }] }
  console.log(response.data);
  return response.data.choices?.[0]?.message?.content || response.data;
}

module.exports = { queryHF };