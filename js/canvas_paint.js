function render({ model, el }) {

    const markup = `
      <div class="all">
        <div class="tool-panel">
          <div class="tool-buttons">
            <button id="rectangle-btn" class="tool-btn">A</button>
            <button id="brush-btn" class="tool-btn">B</button>
            <button id="eraser-btn" class="tool-btn">C</button>
          </div>
          
          <div class="line-width-control">
            <p class="line-width-text">Brushsize:</p>
            <input type="range" id="line-width-range" min="1" max="100">
          </div>
        </div>
        
        <div class="boards">
          <canvas id="background-canvas" width="500" height="300"></canvas>
          <canvas id="drawing-canvas" width="500" height="300"></canvas>
        </div>

        <div class="bottom-panel">
          <div class="color-selector">
            <p class="color-selector-title">Labels:</p>
            <ul id="color-list" class="color-list"></ul>
          </div>

          <div class="control-buttons">
            <!-- <button id="save-btn" class="btn">Save</button> -->
            <button id="clear-btn" class="btn">Clear</button>
          </div>
        </div>
      </div>
    `;

    let container = document.createElement('div');
    container.setAttribute("class", "container");
    container.innerHTML = markup.trim();

    el.appendChild(container);
}
export default { render };
