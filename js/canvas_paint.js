function render({ model, el }) {

    // const markup = `
    //   <div class="all">
    //     <div class="tool-panel">
    //       <div class="tool-buttons">
    //         <button id="rectangle-btn" class="tool-btn"></button>
    //         <button id="brush-btn" class="tool-btn"></button>
    //         <button id="eraser-btn" class="tool-btn"></button>
    //       </div>
          
    //       <div class="line-width-control">
    //         <p class="line-width-text">Brushsize:</p>
    //         <input type="range" id="line-width-range" min="1" max="100">
    //       </div>
    //     </div>
        
    //     <div class="boards">
    //       <canvas id="background-canvas" class="canvases"></canvas>
    //       <canvas id="drawing-canvas" class="canvases"></canvas>
    //     </div>

    //     <div class="bottom-panel">
    //       <div class="color-selector">
    //         <p class="color-selector-title">Labels:</p>
    //         <ul id="color-list" class="color-list"></ul>
    //       </div>

    //       <div class="control-buttons">
    //         <button id="clear-btn" class="control-btn">Clear</button>
    //       </div>
    //     </div>
    //   </div>
    // `;

    // Create the container element
    const container = document.createElement('div');
    container.classList.add('container');

    // Create the all wrapper
    const all = document.createElement('div');
    all.classList.add('all');
    container.appendChild(all);

    // Create the tool panel
    const toolPanel = document.createElement('div');
    toolPanel.classList.add('tool-panel');
    all.appendChild(toolPanel);

    // Create the tool buttons
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

    // Create the line width control
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
    lineWidthRange.max = 100;
    lineWidthControl.appendChild(lineWidthRange);

    // Create the boards
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

    // Create the bottom panel
    const bottomPanel = document.createElement('div');
    bottomPanel.classList.add('bottom-panel');
    all.appendChild(bottomPanel);

    // Create the color selector
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

    // Create the control buttons
    const controlButtons = document.createElement('div');
    controlButtons.classList.add('control-buttons');
    bottomPanel.appendChild(controlButtons);

    const clearBtn = document.createElement('button');
    clearBtn.id = 'clear-btn';
    clearBtn.classList.add('control-btn');
    clearBtn.textContent = 'Clear';
    controlButtons.appendChild(clearBtn);

    //////////////////////////////////////////////////////////////////////////////////////////

    const scalefactor = 1;
    const BOARD_WIDTH = drawingCanvas.width = 500 * scalefactor;
    const BOARD_HEIGHT = drawingCanvas.height = 350 * scalefactor;
    backgroundCanvas.width = BOARD_WIDTH;
    backgroundCanvas.height = BOARD_HEIGHT;

    const ctx = drawingCanvas.getContext('2d')
    const ctx2 = backgroundCanvas.getContext('2d')

    ctx.imageSmoothingEnabled = false;
    ctx2.imageSmoothingEnabled = false;


    let lineWidth = lineWidthRange.value;
    let isDrawing = false;
    const colors = ["rgb(155, 39, 19)", 'green', 'blue', 'yellow'];
    let currentColor = colors[0];

    const tools = {
        brush: 'b',
        rectangle: 'r',
        line: 'l',
        eraser: 'e',
    }

    let currentTool = tools.brush;
    brushBtn.classList.add('selected');

    let prevMouseX = null;
    let prevMouseY = null;
    let snapshot = null;


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
        const stampImageData = ctxTemp.createImageData(width, width);
        
        let currentColorRGBA = parseCssColorRGBA(currentColor); 
        
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
        ctxTemp.putImageData(stampImageData, 0, 0);
        ctx.drawImage(canvasTemp, Math.round(x - radius), Math.round(y - radius));
    }



    function drawEraserStamp(x, y, width) {

        const eraserSize = Math.floor(width / 2);
        const eraserHalfSize = Math.floor(width / 4);

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

        if (width == 1) width++;

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
        let currentX = event.offsetX;
        let currentY = event.offsetY;
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
        let currentX = event.offsetX;
        let currentY = event.offsetY;
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
        ctx.fillRect(
            prevMouseX,
            prevMouseY,
            event.offsetX - prevMouseX,
            event.offsetY - prevMouseY
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
        prevMouseX = event.offsetX;
        prevMouseY = event.offsetY;
        ctx.strokeStyle = currentColor;
        ctx.fillStyle = currentColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        snapshot = ctx.getImageData(0, 0, BOARD_WIDTH, BOARD_HEIGHT)
    }

    function stopDrawing(event) {
        isDrawing = false;
        ctx.closePath();
    }

    function clearBoard() {
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        // ctx.drawImage(backgroundImage, 0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    }

    function changeLineWidth(event) {
        lineWidth = event.target.value;
    }


    function enableRectangleTool() {
        currentTool = tools.rectangle;
        ctx.globalCompositeOperation = "source-over";
        
        rectangleBtn.classList.add('selected');
        brushBtn.classList.remove('selected');
        eraserBtn.classList.remove('selected');
    }

    function enableBrushTool() {
        currentTool = tools.brush;
        ctx.globalCompositeOperation = "source-over";

        brushBtn.classList.add('selected');
        rectangleBtn.classList.remove('selected');
        eraserBtn.classList.remove('selected');
    }

    function enableEraserTool() {
        currentTool = tools.eraser;
        // ctx.globalCompositeOperation = "destination-out";

        eraserBtn.classList.add('selected');
        brushBtn.classList.remove('selected');
        rectangleBtn.classList.remove('selected');
    }


    function displayColors() {
        colors.forEach(color => {
            const listeners = [{event: 'click', handler: () => currentColor = color}];

            const li = document.createElement('li');
            li.classList.add('color-list-item');
            
            listeners.forEach(listener => {
                li.addEventListener(listener.event, listener.handler);
            });

            li.style.backgroundColor = color;
            colorList.appendChild(li);
        });
    }

    displayColors();

    drawingCanvas.addEventListener('mousemove', draw);
    drawingCanvas.addEventListener('mousedown', startDrawing);
    drawingCanvas.addEventListener('mouseup', stopDrawing);
    clearBtn.addEventListener('click', clearBoard);
    lineWidthRange.addEventListener('change', changeLineWidth);

    brushBtn.addEventListener('mousedown', enableBrushTool);
    rectangleBtn.addEventListener('mousedown', enableRectangleTool);
    eraserBtn.addEventListener('mousedown', enableEraserTool);


    el.appendChild(container);
}
export default { render };
