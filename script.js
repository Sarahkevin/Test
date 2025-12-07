const imageInput = document.getElementById('imageInput');
const fileName = document.getElementById('fileName');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const mergeBtn = document.getElementById('mergeBtn');
const canvas = document.getElementById('resultCanvas');
const sourceCanvas = document.getElementById('sourceCanvas');
const ctx = canvas.getContext('2d');
const sourceCtx = sourceCanvas.getContext('2d');
const downloadSection = document.getElementById('downloadSection');

// Settings inputs
const sliceHeightInput = document.getElementById('sliceHeight');
const fontSizeInput = document.getElementById('fontSize');
const lineHeightInput = document.getElementById('lineHeight');
const fontColorInput = document.getElementById('fontColor');
const strokeColorInput = document.getElementById('strokeColor');
const strokeWidthInput = document.getElementById('strokeWidth');
const subtitleInput = document.getElementById('subtitleInput');

// Value displays
const sliceHeightVal = document.getElementById('sliceHeightVal');
const fontSizeVal = document.getElementById('fontSizeVal');
const lineHeightVal = document.getElementById('lineHeightVal');
const fontColorVal = document.getElementById('fontColorVal');
const strokeColorVal = document.getElementById('strokeColorVal');
const strokeWidthVal = document.getElementById('strokeWidthVal');

let currentImage = null;

// Update value displays
function updateDisplays() {
    sliceHeightVal.textContent = sliceHeightInput.value;
    fontSizeVal.textContent = fontSizeInput.value;
    lineHeightVal.textContent = lineHeightInput.value;
    fontColorVal.textContent = fontColorInput.value;
    strokeColorVal.textContent = strokeColorInput.value;
    strokeWidthVal.textContent = strokeWidthInput.value;
}

[sliceHeightInput, fontSizeInput, lineHeightInput, fontColorInput, strokeColorInput, strokeWidthInput].forEach(input => {
    input.addEventListener('input', updateDisplays);
});

// Handle Image Upload
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        fileName.textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Resize logic: Scale to 900px width
                const targetWidth = 900;
                const scaleFactor = targetWidth / img.width;
                const targetHeight = Math.floor(img.height * scaleFactor);

                // Create an off-screen canvas for the resized image
                const resizedCanvas = document.createElement('canvas');
                resizedCanvas.width = targetWidth;
                resizedCanvas.height = targetHeight;
                const resizedCtx = resizedCanvas.getContext('2d');
                // Draw and resize
                resizedCtx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // Update currentImage to use the resized version
                currentImage = resizedCanvas;
                
                // Draw to source canvas (display)
                sourceCanvas.width = targetWidth;
                sourceCanvas.height = targetHeight;
                sourceCtx.drawImage(currentImage, 0, 0);

                // Smart defaults based on image size
                const defaultFontSize = Math.floor(targetWidth / 25); // ~4% of width
                fontSizeInput.value = defaultFontSize;
                fontSizeInput.max = Math.floor(targetWidth / 5);
                
                const defaultMargin = Math.floor(targetHeight * 0.05);
                lineHeightInput.value = defaultMargin;
                lineHeightInput.max = Math.floor(targetHeight / 5);
                
                updateDisplays();
                // Generate a preview with empty text or current text
                generateImage(); 
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    }
});

// Draw Text Helper
function drawSubtitleText(text, yPosition, fontSize, margin, fontColor, strokeColor, strokeWidth) {
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    const x = canvas.width / 2;
    const y = yPosition - margin;

    // Stroke for readability
    if (strokeWidth > 0) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, y);
    }

    // Fill
    ctx.fillStyle = fontColor;
    ctx.fillText(text, x, y);
}

// Main Generation Function
function generateImage() {
    if (!currentImage) {
        // If no image, maybe clear canvas or do nothing
        return;
    }

    const text = subtitleInput.value.trim();
    // Split by newlines and filter out empty lines? 
    // Usually empty lines might be intended for spacing, but for subtitles usually we skip.
    // Let's keep empty lines as "no subtitle" frames if user wants spacing, or filter?
    // User said "Split text by lines". Let's assume non-empty.
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    // If no lines, treat as 1 line (empty) to show the image at least
    const displayLines = lines.length > 0 ? lines : [''];

    const slicePercent = parseInt(sliceHeightInput.value);
    const fontSize = parseInt(fontSizeInput.value);
    const margin = parseInt(lineHeightInput.value);
    const fontColor = fontColorInput.value;
    const strokeColor = strokeColorInput.value;
    const strokeWidth = parseFloat(strokeWidthInput.value);
    
    const imgWidth = currentImage.width;
    const imgHeight = currentImage.height;
    
    const sliceHeightPixels = Math.floor(imgHeight * (slicePercent / 100));
    
    // Calculate total height
    // First line = full image height
    // Subsequent lines = sliceHeightPixels each
    const totalHeight = imgHeight + (displayLines.length - 1) * sliceHeightPixels;

    // Resize canvas
    canvas.width = imgWidth;
    canvas.height = totalHeight;

    // 1. Draw first block (Full Image)
    ctx.drawImage(currentImage, 0, 0);
    // Draw first subtitle
    drawSubtitleText(displayLines[0], imgHeight, fontSize, margin, fontColor, strokeColor, strokeWidth);

    // 2. Draw subsequent blocks
    for (let i = 1; i < displayLines.length; i++) {
        const line = displayLines[i];
        
        // Destination Y start for this slice
        const destY = imgHeight + (i - 1) * sliceHeightPixels;
        
        // Source: Bottom part of image
        const sourceY = imgHeight - sliceHeightPixels;
        
        // Draw the slice
        ctx.drawImage(currentImage, 
            0, sourceY, imgWidth, sliceHeightPixels, // Source
            0, destY, imgWidth, sliceHeightPixels    // Destination
        );

        // Draw subtitle for this slice
        // The text should be at the same relative position as in the first block
        // Relative to the bottom of the slice
        drawSubtitleText(line, destY + sliceHeightPixels, fontSize, margin, fontColor, strokeColor, strokeWidth);
    }

    downloadSection.style.display = 'block';
}

generateBtn.addEventListener('click', generateImage);

downloadBtn.addEventListener('click', function() {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'subtitle-stitched.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});

mergeBtn.addEventListener('click', function() {
    if (!currentImage || !canvas) return;
    
    // Create a temporary canvas for merging
    const mergeCanvas = document.createElement('canvas');
    const mergeCtx = mergeCanvas.getContext('2d');
    
    // Calculate dimensions
    // Width = Source Width + Result Width + Gap (optional)
    const gap = 20;
    const totalWidth = sourceCanvas.width + canvas.width + gap;
    const totalHeight = Math.max(sourceCanvas.height, canvas.height);
    
    mergeCanvas.width = totalWidth;
    mergeCanvas.height = totalHeight;
    
    // Fill background (white)
    mergeCtx.fillStyle = '#ffffff';
    mergeCtx.fillRect(0, 0, totalWidth, totalHeight);
    
    // Draw Source Image (Left)
    // Center vertically if needed, but usually top alignment is fine
    mergeCtx.drawImage(sourceCanvas, 0, 0);
    
    // Draw Result Image (Right)
    mergeCtx.drawImage(canvas, sourceCanvas.width + gap, 0);
    
    // Download
    const link = document.createElement('a');
    link.download = 'merged-comparison.png';
    link.href = mergeCanvas.toDataURL('image/png');
    link.click();
});
