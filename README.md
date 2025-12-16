# 📄 Image to Excel OCR Service

A powerful Node.js web application that extracts text, tables, and structured data from images using AI-powered OCR (Optical Character Recognition). Converts extracted content into organized JSON and Excel formats, supporting both printed and handwritten text in multiple languages including Hindi/Devanagari and English.

## ✨ Features

- 🔍 **AI-Powered OCR**: Uses Hugging Face models for accurate text extraction
- 📊 **Structured Data Extraction**: Automatically parses tables, headers, paragraphs, and lists
- 📝 **Multi-language Support**: Extracts handwritten and printed text in Hindi/Devanagari, English, and mixed languages
- 📑 **Excel Export**: Generates well-formatted Excel files with multiple sheets
- 🎨 **JSON API**: Provides structured JSON output with metadata
- 🌐 **Modern Web UI**: Beautiful, responsive interface with drag-and-drop support
- 🔧 **Comprehensive Parsing**: Handles complex tables with multi-row headers
- 💾 **Multiple Formats**: Export data as JSON or Excel files

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Hugging Face API token

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd image-to-excel
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
HF_TOKEN=your_huggingface_token_here
HF_MODEL=Qwen/Qwen2.5-7B-Instruct
HF_API_URL=https://router.huggingface.co/v1/chat/completions
PORT=3000
```

4. Get your Hugging Face token:
   - Visit [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
   - Create a new token with read access
   - Add it to your `.env` file

5. Start the server:
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

6. Open your browser and navigate to:
```
http://localhost:3000
```

## 📁 Project Structure

```
image-to-excel/
├── src/
│   ├── config/
│   │   └── config.js          # Configuration management
│   ├── controllers/
│   │   └── uploadController.js # Request handlers
│   ├── routes/
│   │   └── uploadRoutes.js    # API routes
│   ├── services/
│   │   ├── hfService.js       # Hugging Face API integration
│   │   ├── jsonService.js     # Markdown to JSON conversion
│   │   └── excelService.js    # Excel file generation
│   ├── utils/
│   │   └── fileUtils.js       # File utility functions
│   └── server.js              # Express server setup
├── views/
│   └── index.html             # Main UI template
├── public/
│   ├── css/
│   │   └── style.css          # Styles
│   └── js/
│       └── app.js             # Client-side JavaScript
├── uploads/                   # Temporary upload storage
├── outputs/                   # Generated Excel files
├── .env                       # Environment variables (not in git)
├── package.json
└── README.md
```

## 🔌 API Endpoints

### POST `/api/extract`
Extract text and structured data from an image. Returns JSON response.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `image` (file)

**Response:**
```json
{
  "success": true,
  "rawText": "extracted markdown text...",
  "structuredData": {
    "metadata": {...},
    "tables": [...],
    "sections": [...],
    "content": [...]
  },
  "parsedData": {
    "metadata": {...},
    "headers": [...],
    "tables": [...],
    "paragraphs": [...],
    "lists": [...]
  },
  "summary": {
    "totalHeaders": 5,
    "totalTables": 2,
    "totalTableRows": 15,
    "totalTableColumns": 20,
    ...
  },
  "timestamp": "2025-12-15T10:30:00.000Z"
}
```

### POST `/api/upload`
Extract text from an image and download as Excel file.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `image` (file)

**Response:**
- Excel file download (`extracted-data.xlsx`)

### GET `/`
Serves the web UI for uploading and viewing extracted data.

## 🎯 Usage Examples

### Using the Web UI

1. Open `http://localhost:3000` in your browser
2. Click or drag-and-drop an image file
3. Click "Extract Data (JSON)" to view structured data
4. Click "Download as Excel" to get Excel file
5. Use "Download as JSON" to save JSON file
6. Use "Copy Text" to copy extracted text to clipboard

### Using cURL

**Extract as JSON:**
```bash
curl -X POST http://localhost:3000/api/extract \
  -F "image=@path/to/your/image.png"
```

**Download as Excel:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "image=@path/to/your/image.png" \
  -o output.xlsx
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HF_TOKEN` | Hugging Face API token (required) | - |
| `HF_MODEL` | Model to use for OCR | `Qwen/Qwen2.5-7B-Instruct` |
| `HF_API_URL` | Hugging Face API endpoint | `https://router.huggingface.co/v1/chat/completions` |
| `PORT` | Server port | `3000` |

### Supported Models

- `Qwen/Qwen2.5-7B-Instruct` (default)
- `Qwen/Qwen2.5-VL-32B-Instruct:fastest`
- Any Hugging Face vision-language model

## 📊 Features Breakdown

### Text Extraction
- ✅ Printed text
- ✅ Handwritten text (English & Hindi/Devanagari)
- ✅ Mixed languages
- ✅ Numbers, dates, special characters
- ✅ Headers, footers, titles

### Structured Data
- ✅ Tables with multi-row headers
- ✅ Key-value pairs
- ✅ Lists (bulleted and numbered)
- ✅ Paragraphs
- ✅ Section headers

### Excel Output
- 📑 Multiple sheets (Raw Text, Structured Data, Individual Tables, Summary)
- 🎨 Formatted tables with colors and borders
- 📈 Auto-sized columns
- 🔢 Number formatting
- 📋 Summary statistics

### JSON Output
- 📦 Complete structured data
- 🔍 Raw extracted text
- 📊 Parsed tables, headers, lists
- 🏷️ Metadata and key-value pairs
- 📈 Comprehensive summary

## 🛠️ Technologies Used

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Axios** - HTTP client
- **ExcelJS** - Excel file generation
- **Multer** - File upload handling
- **dotenv** - Environment variable management
- **Hugging Face API** - OCR/vision models

## 📝 Development

### Running in Development Mode

```bash
npm run dev
```

This uses `nodemon` for automatic server restarts on file changes.

### Building for Production

```bash
npm start
```

## 🐛 Troubleshooting

### Common Issues

1. **"HF_TOKEN is not set" error**
   - Make sure your `.env` file exists and contains `HF_TOKEN=your_token_here`
   - Verify the token is valid at [Hugging Face settings](https://huggingface.co/settings/tokens)

2. **"Request failed with status code 410"**
   - The API endpoint has been updated. Make sure `HF_API_URL` is set to `https://router.huggingface.co/v1/chat/completions`

3. **"ENOENT: no such file or directory"**
   - Ensure `uploads/` and `outputs/` directories exist
   - They are created automatically, but you can create them manually: `mkdir -p uploads outputs`

4. **Port already in use**
   - Change the `PORT` in `.env` file
   - Or kill the process using the port: `lsof -ti:3000 | xargs kill`

## 📄 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions, please open an issue on the repository.

---

**Note**: This project uses Hugging Face API which may have rate limits based on your account type. For production use, consider implementing rate limiting and caching mechanisms.

