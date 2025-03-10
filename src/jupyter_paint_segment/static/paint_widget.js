function render({ model, el }) {

    ////////////// init markup ////////////////
    const container = document.createElement('div');
    container.classList.add('container');

    const all = document.createElement('div');
    all.classList.add('all');
    container.appendChild(all);

    // Tool panel
    const toolPanel = document.createElement('div');
    toolPanel.classList.add('tool-panel');
    all.appendChild(toolPanel);

    // Tool-buttons
    const toolButtons = document.createElement('div');
    toolButtons.classList.add('tool-buttons');
    toolPanel.appendChild(toolButtons);

    const rectangleBtn = document.createElement('button');
    rectangleBtn.id = 'rectangle-btn';
    rectangleBtn.classList.add('tool-btn');
    toolButtons.appendChild(rectangleBtn);

    const brushBtn = document.createElement('button');
    brushBtn.id = 'brush-btn';
    brushBtn.classList.add('tool-btn');
    toolButtons.appendChild(brushBtn);

    const eraserBtn = document.createElement('button');
    eraserBtn.id = 'eraser-btn';
    eraserBtn.classList.add('tool-btn');
    toolButtons.appendChild(eraserBtn);

    // Line width control
    const lineWidthControl = document.createElement('div');
    lineWidthControl.classList.add('line-width-control');
    toolPanel.appendChild(lineWidthControl);

    const lineWidthText = document.createElement('p');
    lineWidthText.classList.add('line-width-text');
    lineWidthText.textContent = 'Brushsize:';
    lineWidthControl.appendChild(lineWidthText);

    const lineWidthRange = document.createElement('input');
    lineWidthRange.type = 'range';
    lineWidthRange.id = 'line-width-range';
    lineWidthRange.min = 1;
    lineWidthRange.max = 200;
    lineWidthControl.appendChild(lineWidthRange);

    // Canvases
    const boards = document.createElement('div');
    boards.classList.add('boards');
    all.appendChild(boards);

    const backgroundCanvas = document.createElement('canvas');
    backgroundCanvas.id = 'background-canvas';
    backgroundCanvas.classList.add('canvases');
    boards.appendChild(backgroundCanvas);

    const drawingCanvas = document.createElement('canvas');
    drawingCanvas.id = 'drawing-canvas';
    drawingCanvas.classList.add('canvases');
    boards.appendChild(drawingCanvas);

    const brushCursor = document.createElement('div');
    brushCursor.id = 'brush-cursor';
    boards.appendChild(brushCursor);

    // Bottom panel
    const bottomPanel = document.createElement('div');
    bottomPanel.classList.add('bottom-panel');
    all.appendChild(bottomPanel);

    // Color selector
    const colorSelector = document.createElement('div');
    colorSelector.classList.add('color-selector');
    bottomPanel.appendChild(colorSelector);

    const colorSelectorTitle = document.createElement('p');
    colorSelectorTitle.classList.add('color-selector-title');
    colorSelectorTitle.textContent = 'Labels:';
    colorSelector.appendChild(colorSelectorTitle);

    const colorList = document.createElement('ul');
    colorList.id = 'color-list';
    colorList.classList.add('color-list');
    colorSelector.appendChild(colorList);

    // Control buttons
    const controlButtons = document.createElement('div');
    controlButtons.classList.add('control-buttons');
    bottomPanel.appendChild(controlButtons);

    const clearBtn = document.createElement('button');
    clearBtn.id = 'clear-btn';
    clearBtn.classList.add('control-btn');
    clearBtn.textContent = 'Clear';
    controlButtons.appendChild(clearBtn);

    ////////////// end init markup ////////////////
    
    // load image and setup canvas
    const backgroundImageWidth = model.get('_image_width');
    const backgroundImageHeight = model.get('_image_height');
    const backgroundImageBase64 = model.get('_image_data');
    backgroundCanvas.style.backgroundImage =  "url(" + backgroundImageBase64 + ")";

    const scalefactor =  model.get('_scale_factor');

    const BOARD_WIDTH = backgroundImageWidth;
    const BOARD_HEIGHT = backgroundImageHeight;
    drawingCanvas.width = BOARD_WIDTH;
    drawingCanvas.height = BOARD_HEIGHT;
    backgroundCanvas.width = BOARD_WIDTH;
    backgroundCanvas.height = BOARD_HEIGHT;
    
    const DISPLAY_WIDTH = Math.floor(BOARD_WIDTH * scalefactor);
    const DISPLAY_HEIGHT = Math.floor(BOARD_HEIGHT * scalefactor);
    backgroundCanvas.style.backgroundSize = `${DISPLAY_WIDTH}px ${DISPLAY_HEIGHT}px`;
    backgroundCanvas.style.width = `${DISPLAY_WIDTH}px`;
    backgroundCanvas.style.height = `${DISPLAY_HEIGHT}px`;
    drawingCanvas.style.width = `${DISPLAY_WIDTH}px`;
    drawingCanvas.style.height = `${DISPLAY_HEIGHT}px`;

    // sync empty drawing canvas image with python
    let drawingSnapshotBase64 = drawingCanvas.toDataURL("image/png");
    model.set("_drawing_base64", drawingSnapshotBase64);
    model.save_changes()

    const ctx = drawingCanvas.getContext('2d')
    const ctx2 = backgroundCanvas.getContext('2d')

    ctx.imageSmoothingEnabled = false;
    ctx2.imageSmoothingEnabled = false;


    let isDrawing = false;
    // const colors = ["rgb(155, 39, 19)", 'green', 'blue', 'yellow'];
    const colors = model.get('_colors');
    const label_titles = model.get('_label_titles');
    let labelColorMap = new Map();
    for (let i = 0; i < label_titles.length; i++) {
        labelColorMap.set(label_titles[i], colors[i]);
    }

    let currentColor = colors[0];

    const tools = {
        brush: 'b',
        rectangle: 'r',
        line: 'l',
        eraser: 'e',
    }

    let currentTool = tools.brush;
    brushBtn.classList.add('selected');
    let lineWidth = lineWidthRange.value;
    let brushStamp = generateBrushStamp(lineWidth, currentColor);

    brushCursor.classList.add('circle-brush-cursor');
    brushCursor.style.width = `${lineWidth * scalefactor}px`;
    brushCursor.style.height = `${lineWidth * scalefactor}px`

    let prevMouseX = null;
    let prevMouseY = null;
    let snapshot = null;


    function generateBrushStamp(width, color) {
        const radius = Math.floor(width / 2);
    
        // temporary canvas for creating stamp image
        const canvasTemp = document.createElement('canvas');
        canvasTemp.width = width;
        canvasTemp.height = width;
    
        const ctxTemp = canvasTemp.getContext('2d');
        const stampImageData = ctxTemp.createImageData(width, width);
        
        let currentColorRGBA = parseCssColorRGBA(color); 
        
        for (let i = -radius+1; i <= radius-1; i++) {
            for (let j = -radius+1; j <= radius-1; j++) {
                
                const px = i + radius;
                const py = j + radius;
                const index = (py * width + px) * 4; // Pixel index in ImageData (RGBA)
                
                if (i * i + j * j <= radius**2) {
                    // stamp object color
                    stampImageData.data[index] = currentColorRGBA[0];     // R
                    stampImageData.data[index + 1] = currentColorRGBA[1]; // G
                    stampImageData.data[index + 2] = currentColorRGBA[2]; // B
                    stampImageData.data[index + 3] = 255; // alpha, always 255 for correct drawing without anti-aliasing
                } else {
                    // fully transparent background of stamp image
                    stampImageData.data[index] = 255;
                    stampImageData.data[index + 1] = 255;
                    stampImageData.data[index + 2] = 255;
                    stampImageData.data[index + 3] = 0;
                }
            }
        }
    
        return stampImageData;
    }

    function parseCssColorRGBA(str) {
        const div = document.createElement("div");
        document.body.appendChild(div);
        div.style.color = str;
        const res = getComputedStyle(div).color.match(/[\.\d]+/g).map(Number);
        div.remove();

        // add alpha channel for rgb colors
        if (res.length == 3) {
            res.push(1);
        }

        return res;
    }


    function drawCircleStamp(x, y, width) {
        
        const radius = Math.floor(width / 2);

        // temporary canvas for creating stamp image
        const canvasTemp = document.createElement('canvas');
        canvasTemp.width = width;
        canvasTemp.height = width;
        const ctxTemp = canvasTemp.getContext('2d');
        
        ctxTemp.putImageData(brushStamp, 0, 0);
        ctx.drawImage(canvasTemp, Math.round(x - radius), Math.round(y - radius));
    }



    function drawEraserStamp(x, y, width) {

        // const eraserSize = Math.floor(width / 2);
        // const eraserHalfSize = Math.floor(width / 4);
        const eraserSize = width;
        const eraserHalfSize = Math.floor(width / 2);

        const canvasTemp = document.createElement('canvas');
        canvasTemp.width = eraserSize;
        canvasTemp.height = eraserSize;

        const ctxTemp = canvasTemp.getContext('2d');
        const stampImageData = ctxTemp.createImageData(eraserSize, eraserSize);

        ctx.putImageData(stampImageData, Math.round(x - eraserHalfSize), Math.round(y - eraserHalfSize));
    }



    function drawLineStamp(x1, y1, x2, y2, width, stampDrawFunction) {
        let dx = Math.abs(x2 - x1);
        let dy = Math.abs(y2 - y1);
        let sx = (x1 < x2) ? 1 : -1;
        let sy = (y1 < y2) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            
            stampDrawFunction(x1, y1, width);

            if (x1 === x2 && y1 === y2) break;

            let e2 = err * 2;
            if (e2 > -dy) {
                err -= dy;
                x1 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y1 += sy;
            }
        }
    }



    function drawBrush(event) {
        let currentX = Math.floor(event.offsetX / scalefactor);
        let currentY = Math.floor(event.offsetY / scalefactor);
        drawLineStamp(
            prevMouseX, prevMouseY, 
            currentX, currentY,
            lineWidth,
            drawCircleStamp
        );
        prevMouseX = currentX;
        prevMouseY = currentY;
    }


    function drawEraser(event) {
        let currentX = Math.floor(event.offsetX / scalefactor);
        let currentY = Math.floor(event.offsetY / scalefactor);
        drawLineStamp(
            prevMouseX, prevMouseY, 
            currentX, currentY,
            lineWidth,
            drawEraserStamp
        );
        prevMouseX = currentX;
        prevMouseY = currentY;
    }


    function drawRect(event) {
        ctx.putImageData(snapshot, 0, 0);
        ctx.lineWidth = 1;    
        let currentX = Math.floor(event.offsetX / scalefactor);
        let currentY = Math.floor(event.offsetY / scalefactor);
        ctx.fillRect(
            prevMouseX,
            prevMouseY,
            currentX - prevMouseX,
            currentY - prevMouseY
        );
        
        ctx.lineWidth = lineWidth;
    }

    function drawLine(event) {
        ctx.beginPath();
        ctx.putImageData(snapshot, 0, 0);
        ctx.moveTo(prevMouseX, prevMouseY);
        ctx.lineTo(event.offsetX, event.offsetY);
        ctx.stroke();
    }


    function draw(event) {
        if (!isDrawing) return;
        
        if (currentTool === tools.brush) {
            drawBrush(event);
        }
        else if (currentTool === tools.rectangle) {
            drawRect(event);
        } else if (currentTool === tools.line) {
            drawLine(event);
        } else if (currentTool === tools.eraser) {
            drawEraser(event);
        }
    }

    function startDrawing(event) {
        isDrawing = true;
        prevMouseX = Math.floor(event.offsetX / scalefactor);
        prevMouseY = Math.floor(event.offsetY / scalefactor);
        ctx.strokeStyle = currentColor;
        ctx.fillStyle = currentColor;
        ctx.lineWidth = lineWidth / scalefactor;
        ctx.beginPath();
        snapshot = ctx.getImageData(0, 0, BOARD_WIDTH, BOARD_HEIGHT)
    }

    function stopDrawing(event) {
        isDrawing = false;
        ctx.closePath();

        // sync drawing with python
        let drawingSnapshotBase64 = drawingCanvas.toDataURL("image/png");
        model.set("_drawing_base64", drawingSnapshotBase64);
        model.save_changes()
    }

    function clearBoard() {
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        // ctx.drawImage(backgroundImage, 0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    }

    function changeLineWidth(event) {
        lineWidth = event.target.value;
        if (lineWidth == 1) lineWidth++;

        brushStamp = generateBrushStamp(lineWidth, currentColor);  // generate brush stamp with new size

        brushCursor.style.width = `${lineWidth * scalefactor}px`;
        brushCursor.style.height = `${lineWidth * scalefactor}px`;
    }


    function enableRectangleTool() {
        currentTool = tools.rectangle;
        ctx.globalCompositeOperation = "source-over";
        
        rectangleBtn.classList.add('selected');
        brushBtn.classList.remove('selected');
        eraserBtn.classList.remove('selected');

        brushCursor.style.display = "none";
    }

    function enableBrushTool() {
        currentTool = tools.brush;
        ctx.globalCompositeOperation = "source-over";

        brushBtn.classList.add('selected');
        rectangleBtn.classList.remove('selected');
        eraserBtn.classList.remove('selected');

        brushCursor.classList.remove(...brushCursor.classList);  // remove all classes of brushCursor element
        brushCursor.classList.add("circle-brush-cursor");
        brushCursor.style.display = "block";
    }

    function enableEraserTool() {
        currentTool = tools.eraser;
        // ctx.globalCompositeOperation = "destination-out";

        eraserBtn.classList.add('selected');
        brushBtn.classList.remove('selected');
        rectangleBtn.classList.remove('selected');

        brushCursor.classList.remove(...brushCursor.classList);  // remove all classes of brushCursor element
        brushCursor.classList.add("square-brush-cursor");
        brushCursor.style.display = "block";
    }


    function displayColors() {
        let labelNum = 1;
        
        labelColorMap.forEach((color, label, map) => {

            const listeners = [
                {event: 'click', handler: () => currentColor = color},
                {event: 'click', handler: () => brushStamp = generateBrushStamp(lineWidth, currentColor)}  // generate brush stamp with new color
            ];
    
            const colorLiWithTooltip = document.createElement('div');
            colorLiWithTooltip.classList.add('tooltip-trigger');
            
            const li = document.createElement('li');
            li.classList.add('color-list-item');
    
            const tooltip = document.createElement('div');
            tooltip.classList.add('tooltip');
            tooltip.innerHTML = `${label} (${labelNum})`;  // tooltip text here
            labelNum++;
    
            colorLiWithTooltip.appendChild(li);
            colorLiWithTooltip.appendChild(tooltip);
            
            listeners.forEach(listener => {
                li.addEventListener(listener.event, listener.handler);
            });
    
            li.style.backgroundColor = color;
            colorList.appendChild(colorLiWithTooltip);
        });
    }

    // style progress of slider
    function colorRangeProgress() {
        let lineWidthPercent = 100 * (lineWidthRange.value - lineWidthRange.min) / (lineWidthRange.max - lineWidthRange.min);
        lineWidthRange.style.background = `linear-gradient(to right, #3879ea 0%, #3879ea ${lineWidthPercent}%, #b6b5b5 ${lineWidthPercent}%, #b6b5b5 100%)`;
    };

    displayColors();
    colorRangeProgress();

    drawingCanvas.addEventListener('mousemove', draw);
    drawingCanvas.addEventListener('mousedown', startDrawing);
    drawingCanvas.addEventListener('mouseup', stopDrawing);
    clearBtn.addEventListener('click', clearBoard);
    lineWidthRange.addEventListener('change', changeLineWidth);
    lineWidthRange.addEventListener("input", colorRangeProgress);

    brushBtn.addEventListener('mousedown', enableBrushTool);
    rectangleBtn.addEventListener('mousedown', enableRectangleTool);
    eraserBtn.addEventListener('mousedown', enableEraserTool);

    drawingCanvas.addEventListener('mousemove', e => {
        brushCursor.style.top = `${ e.offsetY - (lineWidth * scalefactor)/2 }px`;
        brushCursor.style.left = `${ e.offsetX - (lineWidth * scalefactor)/2}px`;
    });

    // selected status for color list items
    const colorListElements = colorList.querySelectorAll('li');
    colorListElements.forEach((li) => {
        li.addEventListener('mousedown', e => {
            colorListElements.forEach((li2) => {
                li2.classList.remove('selected');
            });
            li.classList.add('selected');
        });
    });
    colorListElements[0].classList.add('selected');
    

    el.appendChild(container);
}
export default { render };
