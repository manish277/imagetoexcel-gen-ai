const express = require('express');
const multer = require('multer');
const { uploadImage, extractData } = require('../controllers/uploadController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('image'), uploadImage);
router.post('/extract', upload.single('image'), extractData);

module.exports = router;