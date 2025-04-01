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

    const file = files.image;
    
    // Read the file buffer
    const inputBuffer = await fs.readFile(file.path);
    
    // Convert AVIF to WebP using sharp
    const outputBuffer = await sharp(inputBuffer)
      .webp()
      .toBuffer();
    
    // Clean up temporary files
    await fs.unlink(file.path);
    
    // Get original filename without extension
    const originalName = path.basename(file.name, path.extname(file.name));
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
      body: JSON.stringify({ error: "Error converting the file" })
    };
  }
};

// Function to parse form data
function parseFormData(event) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false });
    
    // Create the temporary directory for file uploads
    const tmpDir = path.join('/tmp', 'avif-converter');
    fs.ensureDirSync(tmpDir);
    
    form.uploadDir = tmpDir;
    form.keepExtensions = true;
    
    // Parse the raw request body
    form.parse(
      { headers: event.headers, body: Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8') }, 
      (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      }
    );
  });
}