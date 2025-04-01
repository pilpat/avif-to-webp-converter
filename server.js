const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files
app.use(express.static('public'));

// Create upload and converted directories if they don't exist
fs.ensureDirSync(path.join(__dirname, 'uploads'));
fs.ensureDirSync(path.join(__dirname, 'converted'));

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Filter for image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/avif') {
    cb(null, true);
  } else {
    cb(new Error('Only AVIF images are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter
});

// Handle file upload and conversion
app.post('/convert', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or file is not an AVIF image' });
    }

    const inputPath = req.file.path;
    const outputFilename = path.basename(req.file.filename, path.extname(req.file.filename)) + '.webp';
    const outputPath = path.join(__dirname, 'converted', outputFilename);

    // Convert AVIF to WEBP using sharp
    await sharp(inputPath)
      .webp()
      .toFile(outputPath);

    // Send the converted file
    res.download(outputPath, outputFilename, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      
      // Clean up files after download (or on error)
      fs.removeSync(inputPath);
      fs.removeSync(outputPath);
    });
    
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'Error converting the file' });
    
    // Clean up the uploaded file on error
    if (req.file) {
      fs.removeSync(req.file.path);
    }
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});