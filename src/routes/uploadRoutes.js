const express = require('express');
const multer = require('multer');
const { uploadImage, extractData, generateExcelFromMarkdown } = require('../controllers/uploadController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('image'), uploadImage);
router.post('/extract', upload.single('image'), extractData);
router.post('/generate-excel', express.json(), generateExcelFromMarkdown);

module.exports = router;