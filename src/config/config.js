require('dotenv').config();

module.exports = {
  hfToken: process.env.HF_TOKEN,
  hfModel: process.env.HF_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
  hfApiUrl: process.env.HF_API_URL || 'https://router.huggingface.co/v1/chat/completions',
  port: process.env.PORT || 3000,
};