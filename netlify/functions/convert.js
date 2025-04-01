const sharp = require('sharp');
const formidable = require('formidable');
const fs = require('fs-extra');
const path = require('path');
const { Buffer } = require('buffer');

exports.handler = async function(event, context) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    // Parse the incoming form data
    const { fields, files } = await parseFormData(event);
    
    if (!files || !files.image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No file uploaded" })
      };
    }

    const file = files.image; // In v2, this is not an array
    
    // Read the file buffer
    const inputBuffer = await fs.readFile(file.filepath);
    
    // Convert AVIF to WebP using sharp
    const outputBuffer = await sharp(inputBuffer)
      .webp()
      .toBuffer();
    
    // Clean up temporary files
    await fs.unlink(file.filepath);
    
    // Get original filename without extension
    const originalName = path.basename(file.originalFilename, path.extname(file.originalFilename));
    const webpFilename = `${originalName}.webp`;
    
    // Return the converted file as a downloadable
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Content-Disposition': `attachment; filename="${webpFilename}"`,
        'Content-Length': outputBuffer.length
      },
      body: outputBuffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Conversion error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error converting the file", details: error.toString() })
    };
  }
};

// Function to parse form data
function parseFormData(event) {
  return new Promise((resolve, reject) => {
    // Create the temporary directory for file uploads
    const tmpDir = path.join('/tmp', 'avif-converter');
    fs.ensureDirSync(tmpDir);

    // Create a formidable instance with options to avoid streams
    const form = formidable({
      uploadDir: tmpDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      multiples: false,
      fileWriteStreamHandler: () => null // Prevent formidable from using streams
    });

    // Create a mock request object
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    const req = {
      headers: {
        'content-type': contentType
      }
    };

    // Add the raw body data
    const buffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    req.body = buffer;

    // Parse the form data
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err);
        return reject(err);
      }
      resolve({ fields, files });
    });
  });
}