document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('fileName');
    const convertBtn = document.getElementById('convertBtn');
    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const statusMessage = document.getElementById('status-message');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when dragging file over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.querySelector('.upload-box').classList.add('highlight');
    }

    function unhighlight() {
        dropArea.querySelector('.upload-box').classList.remove('highlight');
    }

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    // Handle selected files from file input
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            
            // Check if file is AVIF
            if (!file.type.includes('avif')) {
                alert('Please select an AVIF image file.');
                return;
            }
            
            fileName.textContent = file.name;
            fileInfo.classList.remove('hidden');
        }
    }

    // Handle convert button click
    convertBtn.addEventListener('click', function() {
        if (!fileInput.files.length) {
            alert('Please select a file first.');
            return;
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('image', file);

        // Show progress
        fileInfo.classList.add('hidden');
        progressContainer.classList.remove('hidden');
        progressBarFill.style.width = '0%';
        statusMessage.textContent = 'Converting...';

        // Simulate progress (since we don't have real-time progress from the server)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
            if (progress <= 90) {
                progressBarFill.style.width = progress + '%';
            }
        }, 200);

        // Send file to server for conversion
        fetch('/convert', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            clearInterval(progressInterval);
            
            if (!response.ok) {
                throw new Error('Server error: ' + response.status);
            }
            
            progressBarFill.style.width = '100%';
            statusMessage.textContent = 'Download starting...';
            
            // Get filename from Content-Disposition header if available
            let downloadFilename = 'converted.webp';
            const contentDisposition = response.headers.get('Content-Disposition');
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/);
                if (filenameMatch && filenameMatch[1]) {
                    downloadFilename = filenameMatch[1];
                }
            }
            
            return response.blob().then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = downloadFilename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                
                // Reset form after short delay
                setTimeout(() => {
                    progressContainer.classList.add('hidden');
                    fileInput.value = '';
                    statusMessage.textContent = 'Converting...';
                }, 2000);
            });
        })
        .catch(error => {
            clearInterval(progressInterval);
            console.error('Error:', error);
            progressBarFill.style.width = '100%';
            progressBarFill.style.backgroundColor = '#e74c3c';
            statusMessage.textContent = 'Error: ' + error.message;
            
            // Reset form after error message
            setTimeout(() => {
                progressContainer.classList.add('hidden');
                fileInfo.classList.remove('hidden');
            }, 3000);
        });
    });
});