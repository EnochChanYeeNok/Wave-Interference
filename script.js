// Get the canvas element and set up the context
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Grid dimensions
let gridScale = 4; // Adjust for performance vs. quality
let nx, ny;

// Wave field arrays
let field, prevField, tempField;

// Wall grid
let walls;

// Initialize sources array
let sources = [];

// Simulation parameters
let waveSpeed = 0.5;
let damping = 0.005;

// Flags for user interaction
let isAddingSource = false;
let isDrawingWall = false;

// Set the canvas to full window size and initialize the grid
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initializeGrid();
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Controls
const waveSpeedControl = document.getElementById('waveSpeed');
const dampingControl = document.getElementById('damping');
const addSourceButton = document.getElementById('addSource');
const clearSourcesButton = document.getElementById('clearSources');
const drawWallButton = document.createElement('button');
drawWallButton.id = 'drawWall';
drawWallButton.textContent = 'Draw Walls';
document.getElementById('controls').appendChild(drawWallButton);
const clearWallsButton = document.createElement('button');
clearWallsButton.id = 'clearWalls';
clearWallsButton.textContent = 'Clear Walls';
document.getElementById('controls').appendChild(clearWallsButton);

// Update parameters based on controls
waveSpeedControl.addEventListener('input', (e) => {
    waveSpeed = parseFloat(e.target.value);
});
dampingControl.addEventListener('input', (e) => {
    damping = parseFloat(e.target.value);
});

addSourceButton.addEventListener('click', () => {
    // Enable adding a source on the next canvas click
    isAddingSource = true;
    canvas.style.cursor = 'pointer'; // Change cursor to a visible pointer
});

clearSourcesButton.addEventListener('click', () => {
    sources = [];
});

// Wall drawing controls
drawWallButton.addEventListener('click', () => {
    isDrawingWall = !isDrawingWall;
    if (isDrawingWall) {
        canvas.style.cursor = 'crosshair'; // Crosshair cursor for wall drawing
        drawWallButton.textContent = 'Stop Drawing Walls';
    } else {
        canvas.style.cursor = 'default';
        drawWallButton.textContent = 'Draw Walls';
    }
});

clearWallsButton.addEventListener('click', () => {
    initializeWalls();
});

// Function to initialize the grid
function initializeGrid() {
    nx = Math.floor(canvas.width / gridScale);
    ny = Math.floor(canvas.height / gridScale);

    // Create wave field arrays
    field = new Float32Array(nx * ny);
    prevField = new Float32Array(nx * ny);
    tempField = new Float32Array(nx * ny);

    // Initialize walls array
    initializeWalls();
}

// Function to initialize walls
function initializeWalls() {
    walls = new Uint8Array(nx * ny); // 0: no wall, 1: wall
}

// Event listeners for canvas interactions
canvas.addEventListener('click', (e) => {
    if (isAddingSource) {
        const { x, y } = getMouseGridPosition(e);
        sources.push({ x: x, y: y });
        isAddingSource = false;
        canvas.style.cursor = 'default'; // Reset cursor to default
    }
});

let wallStartPoint = null;

canvas.addEventListener('mousedown', (e) => {
    if (isDrawingWall) {
        wallStartPoint = getMouseGridPosition(e);
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (isDrawingWall && wallStartPoint) {
        const wallEndPoint = getMouseGridPosition(e);
        drawWallLine(wallStartPoint, wallEndPoint);
        wallStartPoint = null;
    }
});

// Helper function to get mouse position in grid coordinates
function getMouseGridPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Convert canvas coordinates to grid indices
    const x = Math.floor((canvasX / canvas.width) * nx);
    const y = Math.floor((canvasY / canvas.height) * ny);

    return { x, y };
}

// Function to draw a wall line between two points
function drawWallLine(start, end) {
    // Bresenham's line algorithm
    let x0 = start.x;
    let y0 = start.y;
    let x1 = end.x;
    let y1 = end.y;

    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    while (true) {
        if (x0 >= 0 && x0 < nx && y0 >= 0 && y0 < ny) {
            walls[x0 + y0 * nx] = 1; // Set this cell as a wall
        }

        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) {
            err += dy;
            x0 += sx;
        }
        if (e2 <= dx) {
            err += dx;
            y0 += sy;
        }
    }
}

// Main update function
function updateField() {
    for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
            let idx = i + j * nx;
            if (walls[idx]) {
                // Wall boundary condition
                field[idx] = 0;
                prevField[idx] = 0;
                continue;
            }

            // Discrete wave equation with walls handling
            tempField[idx] = (2 * field[idx] - prevField[idx] +
                (waveSpeed * waveSpeed) * (
                    (walls[idx + 1] ? 0 : field[idx + 1]) +
                    (walls[idx - 1] ? 0 : field[idx - 1]) +
                    (walls[idx + nx] ? 0 : field[idx + nx]) +
                    (walls[idx - nx] ? 0 : field[idx - nx]) -
                    4 * field[idx]
                )) * (1 - damping);

            // Add sources
            for (let s = 0; s < sources.length; s++) {
                let source = sources[s];
                if (i === source.x && j === source.y) {
                    tempField[idx] += Math.sin(Date.now() / 100);
                }
            }
        }
    }

    // Swap fields
    let swap = prevField;
    prevField = field;
    field = tempField;
    tempField = swap;
}

// Draw the field
function drawField() {
    const imageData = ctx.createImageData(nx, ny);
    for (let i = 0; i < field.length; i++) {
        let intensity = field[i] * 128 + 128; // Normalize to [0, 255]
        intensity = Math.max(0, Math.min(255, intensity));

        if (walls[i]) {
            // Wall visualization
            imageData.data[i * 4] = 50;        // Red channel
            imageData.data[i * 4 + 1] = 50;    // Green channel
            imageData.data[i * 4 + 2] = 50;    // Blue channel
            imageData.data[i * 4 + 3] = 255;   // Alpha channel
        } else {
            imageData.data[i * 4] = intensity;      // Red channel
            imageData.data[i * 4 + 1] = intensity;  // Green channel
            imageData.data[i * 4 + 2] = intensity;  // Blue channel
            imageData.data[i * 4 + 3] = 255;        // Alpha channel
        }
    }
    // Draw to canvas, scaling up
    ctx.putImageData(imageData, 0, 0);
    ctx.drawImage(canvas, 0, 0, nx, ny, 0, 0, canvas.width, canvas.height);
}

// Animation loop
function animate() {
    updateField();
    drawField();
    requestAnimationFrame(animate);
}

// Start the simulation
animate();
