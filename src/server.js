const express = require('express');
const path = require('path');
const { port } = require('./config/config');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// Get the project root directory (parent of src)
const projectRoot = path.join(__dirname, '..');

app.use(express.json());
app.use(express.static(path.join(projectRoot, 'public')));
app.use('/api', uploadRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'views', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});