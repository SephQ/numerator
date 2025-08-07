/* To do
    Fix the jump behaviour at high speeds, goes way too high and takes too long to land.
    Add optional music.
    Uncomment loadsettings() and savesettings() functions and add missing settings.
    Add a divisor creep option that increases the probability of divisors spawning as the game progresses
    Add a scaling enemies option that increases the value of enemies as the game progresses
    Make subtractorSpawnDelay optional
    Add an exit button for gameplay for mobile users (no 'ESC' key)
*/
// Game state
let gameState = 'menu'; // 'menu', 'playing', 'gameOver', 'settings'
let infinityCelebration = false; // Whether the player has reached infinity and is celebrating
let celebrationSymbols = [];
let isCelebrating = false;
let canvas, ctx;
let player;
let gameObjects = [];
let keys = {};
let gameSpeed = 1;
let maxSpeed = 5;
let maxAdder = 10; // Maximum value for adder objects
let maxMultiplier = 4;
let maxSubtractor = 8;
let maxDivisor = 8;
let scaleJump = false; // Whether to scale jump height to game speed
let multiplierGuards = true; // Whether to have guards around multipliers
const guardDistance = 220; // Distance of subtractor guards from multiplier
let divisionYScale = 0.3; // Reduces the vertical collision range for division lines (0.5=50% of player height)
let score = 0;
let gameTime = 0;
let highestScoreThisRun = 0;
let gameStartTime = 0;
let subtractorSpawnDelay = 100; // Delay before subtractors start spawning (in game ticks)

// Relative frequencies for spawning game objects
let objectList = ['adder', 'subtractor', 'multiplier', 'divisor'];
let spawnsPerFrame = 0.2; // Chance to spawn an object each frame
let spawnFrequencies = {
    adder: 40, // Relative chance to spawn an adder
    subtractor: 30, // Relative chance to spawn a subtractor
    multiplier: 1, // Relative chance to spawn a multiplier
    divisor: 2 // Relative chance to spawn a divisor
}

// Save default settings for reset
const defMaxSpeed = maxSpeed;
const defMaxDivisor = maxDivisor;
const defMaxMultiplier = maxMultiplier;
const defScaleJump = scaleJump;
const defMultiplierGuards = multiplierGuards;
const defSpawnsPerFrame = spawnsPerFrame;
const defSpawnFrequencies = structuredClone(spawnFrequencies);

const defaultSettings = {
    maxSpeed: defMaxSpeed,
    maxDivisor: defMaxDivisor,
    maxMultiplier: defMaxMultiplier,
    scaleJump: defScaleJump,
    multiplierGuards: defMultiplierGuards,
    spawnsPerFrame: defSpawnsPerFrame,
    spawnFrequencies: defSpawnFrequencies
};

resetDefaults();

// High scores storage
let highScores = JSON.parse(localStorage.getItem('numeratorHighScores')) || []; // Any settings
let defaultScores = JSON.parse(localStorage.getItem('numeratorDefaultScores')) || [];   // Default settings only

// Inspirational quotes about soaring and falling
const soaringQuotes = [
    '"The higher you soar, the greater the fall."',
    '"Even eagles must return to earth."',
    '"What goes up must come down, but the flight is worth it."',
    '"To fly with the angels, one must risk falling with the demons."',
    '"The view from the top is magnificent, but the ground is inevitable."',
    '"Like Icarus, we reach for the sun knowing our wings may melt."',
    '"Every mountain climbed leads to a valley below."',
    '"The stars are beautiful, but we are bound to earth."',
    '"Rise like the phoenix, fall like the autumn leaves."',
    '"In our ascent to greatness, we court our own descent."'
];

// Initialize the game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // // Load settings
    // loadSettings();
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Add unified input handlers for both mouse and touch
    canvas.addEventListener('mousedown', handleInput);
    canvas.addEventListener('mouseup', handleInputEnd);
    canvas.addEventListener('mouseleave', handleInputEnd);
    
    // Touch events with passive: false to prevent scrolling
    canvas.addEventListener('touchstart', handleInput, { passive: false });
    canvas.addEventListener('touchend', handleInputEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleInputEnd, { passive: false });
    
    // Initialize player
    resetPlayer();
    
    // Start game loop
    gameLoop();
}

let screenScale = 1; // Default scale for desktop

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Calculate scale based on screen width and orientation
    // Use 1024 as our "standard" width for landscape
    // Use 768 as our "standard" height for portrait
    const isPortrait = window.innerHeight > window.innerWidth;
    if (isPortrait) {
        // In portrait, scale based on width but with a higher minimum
        screenScale = Math.max(0.3, Math.min(1, window.innerWidth / 768));
    } else {
        // In landscape, use normal width-based scaling
        screenScale = Math.min(1, window.innerWidth / 1024);
    }
    
    // Update the CSS variable for UI scaling
    document.documentElement.style.setProperty('--screen-scale', screenScale);

    // Update player size
    if (player) {
        player.width = 80 * screenScale;
        player.height = 80 * screenScale;
    }
}

function resetPlayer() {
    player = {
        x: canvas.width / 2,
        y: canvas.height - 100,
        width: 80 * screenScale,
        height: 80 * screenScale,
        number: 0,
        velocity: { x: 0, y: 0 },
        onGround: true,
        jumpPower: 16,
        gravity: 0.8,
        maxSpeed: 6
    };
}

// Function to set spawn frequencies in the UI
function setSpawnFrequencies(freqs) {
    objectList.forEach((type) => {
        document.getElementById(`${type}FrequencySlider`).value = freqs[type];
        document.getElementById(`${type}FrequencyValue`).textContent = `${freqs[type]} (${Math.round((freqs[type] / Object.values(freqs).reduce((sum, freq) => sum + freq, 0)) * 100)}%)`;
    });
};

// Game object classes
class GameObject {
    constructor(x, y, type, value) {
        this.x = x;
        this.y = y;
        this.type = type; // 'positive', 'negative', 'division', 'multiplier'
        this.value = value;
        // Scale the objects based on screen size
        this.width = (type === 'division' ? canvas.width : type === 'multiplier' ? 30 : 60) * screenScale;
        this.height = (type === 'division' ? 20 : type === 'multiplier' ? 30 : 60) * screenScale;
        this.collected = false;
        this.attackTimer = 0;
        this.attacking = false;
    }
    
    update() {
        // Move objects down based on game speed
        this.y += 3 * gameSpeed;
        
        // Handle negative number behavior
        if (this.type === 'negative') {
            const distanceToPlayer = Math.sqrt(
                Math.pow(this.x - player.x, 2) + Math.pow(this.y - player.y, 2)
            );
            
            if (distanceToPlayer < player.width * 1.5 && !this.attacking) {
                this.attacking = true;
                this.attackTimer = 30; // Attack animation duration
            }
            
            if (this.attacking && this.attackTimer > 0) {
                this.attackTimer--;
                // Move towards player during attack
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 0) {
                    this.x += (dx / distance) * 4;
                    this.y += (dy / distance) * 4;
                }
            }
        }
        
        // Remove objects that are off screen
        if (this.y > canvas.height + 100) {
            this.remove = true;
        }
    }
    
    draw() {
        ctx.save();
        
        if (this.type === 'positive') {
            // Draw positive numbers in green
            ctx.fillStyle = '#4ade80';
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 3;
            ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
            ctx.strokeRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
            
            ctx.fillStyle = 'white';
            ctx.font = `bold ${24 * screenScale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`+${this.value}`, this.x, this.y);
            
        } else if (this.type === 'negative') {
            // Draw subtractors in red with attack animation
            const intensity = this.attacking ? (this.attackTimer / 30) : 0;
            ctx.fillStyle = `rgb(${239 + intensity * 16}, ${68 - intensity * 20}, ${68 - intensity * 20})`;
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 3 + intensity * 2;
            
            // Pulsing effect when attacking
            const scale = 1 + intensity * 0.3;
            const width = this.width * scale;
            const height = this.height * scale;
            
            ctx.fillRect(this.x - width/2, this.y - height/2, width, height);
            ctx.strokeRect(this.x - width/2, this.y - height/2, width, height);
            
            ctx.fillStyle = 'white';
            ctx.font = `bold ${24 * scale * screenScale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`-${this.value}`, this.x, this.y);
            
        } else if (this.type === 'multiplier') {
            // Draw multipliers in gold with flee animation
            const distanceToPlayer = Math.abs(this.y - player.y);
            const isClose = distanceToPlayer < 100;
            const intensity = isClose ? Math.max(0, (100 - distanceToPlayer) / 100) : 0;
            
            ctx.lineWidth = 3;
            // Base color with gold intensity when close
            const blueComponent = Math.floor(76 + intensity * 10);
            const redGreen = Math.floor(224 - intensity * 50);
            ctx.fillStyle = `rgb(${redGreen}, ${redGreen}, ${blueComponent})`;
            ctx.strokeStyle = 'rgba(240, 226, 70, 1)';
            // ctx.fillRect(0, this.y - this.height/2, canvas.width, this.height);
            ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
            ctx.strokeRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
            
            ctx.fillStyle = 'white';
            ctx.font = `bold ${28 * screenScale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`*${this.value}`, this.x, this.y);
            
        } else if (this.type === 'division') {
            // Draw divisor line with highlight when close to player
            const distanceToPlayer = Math.abs(this.y - player.y);
            const isClose = distanceToPlayer < 100;
            const intensity = isClose ? Math.max(0, (100 - distanceToPlayer) / 100) : 0;
            
            // Base color with red intensity when close
            const redComponent = Math.floor(245 + intensity * 10);
            const greenBlue = Math.floor(158 - intensity * 50);
            ctx.fillStyle = `rgb(${redComponent}, ${greenBlue}, ${greenBlue})`;
            ctx.fillRect(0, this.y - this.height/2, canvas.width, this.height);
            
            // Highlight line where division will make contact
            if (isClose) {
                ctx.strokeStyle = `rgba(255, 0, 0, ${intensity})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, this.y);
                ctx.lineTo(canvas.width, this.y);
                ctx.stroke();
            }
            
            // Bold text for division lines
            ctx.fillStyle = '#92400e';
            ctx.font = `bold ${18 * screenScale}px Arial`;
            ctx.textAlign = 'left';
            // Fill the entire line with repeated "/ N / N / N"
            const pattern = ` / ${this.value}`;
            const patternWidth = ctx.measureText(pattern).width;
            const repetitions = Math.ceil(canvas.width / patternWidth);
            const text = pattern.repeat(repetitions);
            ctx.fillText(text, 0, this.y + 5);
        }
        
        ctx.restore();
    }
    
    checkCollision(player) {
        if (this.type === 'division') {
            return (
                // For division lines, check if player is within the vertical range
                player.y - player.height/2 * divisionYScale < this.y &&
                this.y < player.y + player.height/2 * divisionYScale
            );
        } else {
            return (
                // For other objects, check rectangular collision
                player.x - player.width/2 < this.x &&
                this.x < player.x + player.width/2 &&
                player.y - player.height/2 < this.y &&
                this.y < player.y + player.height/2
            );
        }
    }
}

// Input handling
function handleKeyDown(e) {
    keys[e.key.toLowerCase()] = true;
    
    if (gameState === 'playing') {
        if (e.key === 'Escape') {
            // showMainMenu();
            gameOver();
        } else if (e.key === 'w' || e.key === 'ArrowUp') {
            jump();
        }
    }
}

function handleKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
}

function handleClick() {
    if (gameState === 'playing') {
        jump();
    }
}

function jump() {
    if (player.onGround) {
        // player.velocity.y = -player.jumpPower * gameSpeed;
        player.velocity.y = -player.jumpPower * (scaleJump ? gameSpeed : 1);
        player.onGround = false;
    }
}

// Touch screen input handling
function handleInput(e) {
    e.preventDefault(); // Prevent scrolling and other default behaviors
    
    // Get the x coordinate whether it's a mouse or touch event
    const rect = canvas.getBoundingClientRect();
    const x = (e.type.includes('touch') ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.type.includes('touch') ? e.touches[0].clientY : e.clientY) - rect.top;
    const width = rect.width;
    const height = rect.height;
    
    // Reset all keys first
    keys['left'] = false;
    keys['right'] = false;
    keys['jump'] = false;
    
    // Calculate relative position (0 to 1)
    const relativeX = x / width;
    const relativeY = y / height;
    
    // Left third
    if (relativeX < 0.33 && relativeY > 0.33) {
        keys['left'] = true;
    }
    // Right third
    else if (relativeX > 0.66 && relativeY > 0.33) {
        keys['right'] = true;
    }
    // Middle third
    else {
        keys['jump'] = true;
        if (player.onGround) {
            jump();
        }
    }
}

function handleInputEnd(e) {
    e.preventDefault();
    // Reset all input states
    keys['jump'] = false;
    keys['left'] = false;
    keys['right'] = false;
}

// Function to toggle scaling jump height to speed
function toggleScaleJump() {
    const checkbox = document.getElementById('scaleJumpCheckbox');
    if (checkbox.checked) {
        scaleJump = true;
    } else {
        scaleJump = false;
    }
}

// Function to toggle guards around multipliers
function toggleMultiplierGuards() {
    const checkbox = document.getElementById('multiplierGuardsCheckbox');
    if (checkbox.checked) {
        multiplierGuards = true;
    } else {
        multiplierGuards = false;
    }
}

// Function to toggle the high score display for default settings or all settings
function toggleDefaultHighScores() {
    const checkbox = document.getElementById('defaultHighScoresCheckbox');
    if (checkbox.checked) {
        // Filter high scores to only show those with default settings
        updateRankingsDisplay(defaultScores);
    } else {
        // Show all high scores
        updateRankingsDisplay(highScores);
    }
}

// Game logic
function updatePlayer() {
    // Handle horizontal movement with game speed multiplier
    let moveSpeed = 5 * gameSpeed;
    if (keys['a'] || keys['arrowleft'] || keys['left']) {
        player.velocity.x = Math.max(player.velocity.x - 0.5, -moveSpeed);
    } else if (keys['d'] || keys['arrowright'] || keys['right']) {
        player.velocity.x = Math.min(player.velocity.x + 0.5, moveSpeed);
    } else {
        player.velocity.x *= 0.8; // Friction
    }
    
    // Jump when jump key is pressed
    if (keys['jump'] && player.onGround) {
        jump();
    }

    // Apply gravity
    if (!player.onGround) {
        player.velocity.y += player.gravity;
    }
    
    // Update position
    player.x += player.velocity.x;
    player.y += player.velocity.y;
    
    // Keep player on screen horizontally
    player.x = Math.max(player.width/2, Math.min(canvas.width - player.width/2, player.x));
    
    // Ground collision
    const groundY = canvas.height - 100;
    if (player.y >= groundY && player.velocity.y > 0) {
        player.y = groundY;
        player.velocity.y = 0;
        player.onGround = true;
    }
    
    // Update game speed based on score
    const speedMultiplier = 1 + (Math.abs(player.number) * 0.02);
    gameSpeed = Math.min(speedMultiplier, maxSpeed);
}

function spawnGameObject() {
    if (Math.random() < spawnsPerFrame) { // 2% chance per frame
        const x = Math.random() * (canvas.width - 100) + 50;
        const y = -50;
        
        const rand = Math.random();
        const totalFrequency = Object.values(spawnFrequencies).reduce((sum, freq) => sum + freq, 0);
        const cumulativeFrequencies = [];
        let cumulative = 0;
        objectList.forEach((type) => {
            cumulative += spawnFrequencies[type];
            cumulativeFrequencies.push(cumulative / totalFrequency);
        });
        if (rand < cumulativeFrequencies[0] || gameTime < subtractorSpawnDelay) {
            // Spawn adder
            const value = Math.floor(Math.random() * maxAdder) + 1;
            gameObjects.push(new GameObject(x, y, 'positive', value));
        } else if (rand < cumulativeFrequencies[1]) {
            // Spawn subtractor
            const value = Math.floor(Math.random() * maxSubtractor) + 1;
            gameObjects.push(new GameObject(x, y, 'negative', value));
        } else if (rand < cumulativeFrequencies[2]) {
            // Spawn multiplier
            const value = Math.floor(Math.random() * (maxMultiplier - 1)) + 2;
            const yMult = y - guardDistance * screenScale;
            if (!multiplierGuards) {
                gameObjects.push(new GameObject(x, y, 'multiplier', value));
                // return; // Skip guards if not enabled
            } else {
                gameObjects.push(new GameObject(x, yMult, 'multiplier', value));
                // Also spawn 4 subtractors as guards around it
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2;
                    const offsetX = Math.cos(angle) * guardDistance * screenScale;
                    const offsetY = Math.sin(angle) * guardDistance * screenScale;
                    const subValue = Math.floor(Math.random() * 5) + 1; // Smaller subtractors
                    gameObjects.push(new GameObject(x + offsetX, yMult + offsetY, 'negative', subValue));
                }
            }
        } else {
            // Spawn divisor with configurable max divisor
            const value = Math.floor(Math.random() * (maxDivisor - 1)) + 2;
            gameObjects.push(new GameObject(0, y, 'division', value));
        }
    }
}

function updateGameObjects() {
    gameObjects.forEach(obj => {
        obj.update();
        
        // Check collision with player
        if (!obj.collected && obj.checkCollision(player)) {
            if (obj.type === 'positive') {
                player.number += obj.value;
                // Track highest score this run
                if (player.number > highestScoreThisRun) {
                    highestScoreThisRun = player.number;
                }
                obj.collected = true;
                obj.remove = true;
            } else if (obj.type === 'negative') {
                player.number -= obj.value;
                obj.collected = true;
                obj.remove = true;
            } else if (obj.type === 'multiplier') {
                player.number *= obj.value;
                obj.collected = true;
                obj.remove = true;
                // Track highest score this run
                if (player.number > highestScoreThisRun) {
                    highestScoreThisRun = player.number;
                }
            } else if (obj.type === 'division') {
                if (player.onGround) { // Only divide if on ground (not jumping)
                    player.number = Math.floor(player.number / obj.value);
                    obj.collected = true;
                    obj.remove = true;
                }
            }
        }
        
    });
    
    // Remove objects marked for removal
    gameObjects = gameObjects.filter(obj => !obj.remove);
    
    // Check game over/win conditions
    if (player.number < 0) {
        gameOver(false);
    } else if (player.number === Infinity) {
        // Player has reached infinity
        infinityCelebration = true;
    }
}

function drawPlayer() {
    ctx.save();
    
    // Player shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(player.x - player.width/2, canvas.height - 95, player.width, 10);
    
    // Player body (large number display)
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 4;
    ctx.fillRect(player.x - player.width/2, player.y - player.height/2, player.width, player.height);
    ctx.strokeRect(player.x - player.width/2, player.y - player.height/2, player.width, player.height);
    
    // Player number
    ctx.fillStyle = 'white';
    ctx.font = `bold ${36 * screenScale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.number.toString(), player.x, player.y);
    
    ctx.restore();
}

function drawBackground() {
    // Animated stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 50; i++) {
        const x = (i * 37 + gameTime * 0.5) % canvas.width;
        const y = (i * 73 + gameTime * 0.3) % canvas.height;
        const size = (i % 3) + 1;
        ctx.fillRect(x, y, size, size);
    }
    
    // Ground
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
    
    // Ground pattern
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2;
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - 100);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
}

function drawHUD() {
    document.getElementById('score').textContent = player.number;
    document.getElementById('speed').textContent = gameSpeed.toFixed(1);
}

// Settings functions
function updateMaxSpeed(value) {
    maxSpeed = parseFloat(value);
    document.getElementById('maxSpeedValue').textContent = maxSpeed;
}

function updateSpawn(value, id) {
    let type = id.replace('FrequencySlider', '');
    let relativeFrequency = parseInt(value);
    spawnFrequencies[type] = relativeFrequency;
    
    let totalFrequency = Object.values(spawnFrequencies).reduce((sum, freq) => sum + freq, 0);
    objectList.forEach( (iType) => {
        let relativeFrequency = spawnFrequencies[iType];
        let idVal = iType + 'FrequencyValue';
        let percentage = Math.round((relativeFrequency / totalFrequency * 100));
        document.getElementById(idVal).textContent = `${relativeFrequency} (${percentage}%)`;
    });
}

function updateMaxDivisor(value) {
    maxDivisor = parseInt(value);
    document.getElementById('maxDivisorValue').textContent = maxDivisor;
}

function updateMaxMultiplier(value) {
    maxMultiplier = parseInt(value);
    document.getElementById('maxMultiplierValue').textContent = maxMultiplier;
}

function updateSpawnsPerFrame(value) {
    spawnsPerFrame = parseFloat(value);
    document.getElementById('spawnsPerFrameValue').textContent = spawnsPerFrame;
}

function saveSettings() {
    localStorage.setItem('numeratorMaxSpeed', maxSpeed);
    localStorage.setItem('numeratorMaxDivisor', maxDivisor);
    localStorage.setItem('numeratorMaxMultiplier', maxMultiplier);
}

function loadSettings() {
    const savedMaxSpeed = localStorage.getItem('numeratorMaxSpeed');
    const savedMaxDivisor = localStorage.getItem('numeratorMaxDivisor');
    const savedMaxMultiplier = localStorage.getItem('numeratorMaxMultiplier');
    
    if (savedMaxSpeed !== null) {
        maxSpeed = parseFloat(savedMaxSpeed);
    }
    if (savedMaxDivisor !== null) {
        maxDivisor = parseInt(savedMaxDivisor);
    }
    if (savedMaxMultiplier !== null) {
        maxMultiplier = parseInt(savedMaxMultiplier);
    }
}

function resetDefaults() { 
    maxSpeed = defaultSettings.maxSpeed;
    maxDivisor = defaultSettings.maxDivisor;
    maxMultiplier = defaultSettings.maxMultiplier;
    scaleJump = defaultSettings.scaleJump;
    multiplierGuards = defaultSettings.multiplierGuards;
    spawnsPerFrame = defaultSettings.spawnsPerFrame;
    spawnFrequencies = structuredClone(defaultSettings.spawnFrequencies);
    
    // Update UI elements and sliders
    // showSettings();
    document.getElementById('maxSpeedValue').textContent = maxSpeed;
    document.getElementById('maxDivisorValue').textContent = maxDivisor;
    document.getElementById('maxMultiplierValue').textContent = maxMultiplier;
    document.getElementById('maxSpeedSlider').value = maxSpeed;
    document.getElementById('maxDivisorSlider').value = maxDivisor;
    document.getElementById('maxMultiplierSlider').value = maxMultiplier;
    document.getElementById('scaleJumpCheckbox').checked = scaleJump;
    document.getElementById('multiplierGuardsCheckbox').checked = multiplierGuards;
    // showMainMenu();
    // Reset spawn frequencies
    setSpawnFrequencies(spawnFrequencies);
}

// Function to check if game settings are all defaults (for high score validation)
function defaultCheck() {
    // return true if current settings match the default settings
    return (
        maxSpeed === defMaxSpeed &&
        maxDivisor === defMaxDivisor &&
        maxMultiplier === defMaxMultiplier &&
        scaleJump === defScaleJump &&
        multiplierGuards === defMultiplierGuards &&
        spawnsPerFrame === defSpawnsPerFrame &&
        JSON.stringify(spawnFrequencies) === JSON.stringify(defSpawnFrequencies)
    );
}

// Game state management
function startGame() {
    gameState = 'playing';
    score = player.number = 0;
    gameTime = 0;
    gameStartTime = Date.now();
    highestScoreThisRun = 0;
    gameObjects = [];
    resetPlayer();
    
    // Hide menus, show game UI
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('instructionsMenu').classList.add('hidden');
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('settingsMenu').classList.add('hidden');
    document.getElementById('rankingsMenu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('gameInstructions').classList.remove('hidden');
}

function showMainMenu() {
    gameState = 'menu';
    
    // Show main menu, hide others
    document.getElementById('mainMenu').classList.remove('hidden');
    document.getElementById('instructionsMenu').classList.add('hidden');
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('settingsMenu').classList.add('hidden');
    document.getElementById('rankingsMenu').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('gameInstructions').classList.add('hidden');
}

function showInstructions() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('instructionsMenu').classList.remove('hidden');
}

function showSettings() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('settingsMenu').classList.remove('hidden');
    
    // Update settings display
    document.getElementById('maxSpeedValue').textContent = maxSpeed;
    document.getElementById('maxDivisorValue').textContent = maxDivisor;
    document.getElementById('maxMultiplierValue').textContent = maxMultiplier;
    document.getElementById('maxSpeedSlider').value = maxSpeed;
    document.getElementById('maxDivisorSlider').value = maxDivisor;
    document.getElementById('maxMultiplierSlider').value = maxMultiplier;
}

function showRankings() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('rankingsMenu').classList.remove('hidden');
    // Check if default scores or all scores should be shown
    const showDefault = document.getElementById('defaultHighScoresCheckbox').checked;
    updateRankingsDisplay(showDefault ? defaultScores : highScores);
}

function updateRankingsDisplay(scores) {
    const tableBody = document.getElementById('rankingsTableBody');
    tableBody.innerHTML = '';
    
    // Ensure we have at least one empty row for rank 1
    const displayScores = [...scores];
    if (displayScores.length === 0) {
        displayScores.push({ score: 0, time: '0:00' });
    }

    // Sometimes Infinity is set to null, sort it to the top
    displayScores.sort((a, b) => {
        if (a.score === null && b.score !== null || b.time > a.time) return -1; // Null scores go to top
        if (b.score === null) return 1; // Null scores go to top
        return b.score - a.score; // Sort descending
    });
    
    displayScores.forEach((entry, index) => {
        const row = document.createElement('tr');
        let score = entry.score > 1e9 ?
            parseFloat(entry.score).toPrecision(5) : entry.score;
        score === null ? score = Infinity : score;
        row.innerHTML = `
            <td>${index + 1}.</td>
            <td>${score}</td>
            <td>${entry.time}</td>
        `;
        tableBody.appendChild(row);
    });
}

function saveHighScore(score, gameTimeMs) {
    const minutes = Math.floor(gameTimeMs / 60000);
    const seconds = Math.floor((gameTimeMs % 60000) / 1000);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const newScore = { score, time: timeString };
    highScores.push(newScore);
    
    // Sort by score (descending) and keep only top 10
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 10);
    
    // Save to localStorage
    localStorage.setItem('numeratorHighScores', JSON.stringify(highScores));

    // If default settings, also save to default scores
    if (defaultCheck()) {
        defaultScores.push(newScore);
        defaultScores.sort((a, b) => b.score - a.score);
        defaultScores = defaultScores.slice(0, 10);
        localStorage.setItem('numeratorDefaultScores', JSON.stringify(defaultScores));
    }
}

function resetHighScores() {
    highScores = [];
    defaultScores = [];
    localStorage.setItem('numeratorHighScores', JSON.stringify(highScores));
    localStorage.setItem('numeratorDefaultScores', JSON.stringify(defaultScores));
    updateRankingsDisplay(highScores);
}

function getRandomQuote() {
    return soaringQuotes[Math.floor(Math.random() * soaringQuotes.length)];
}

function gameOver(isWin = false) {
    gameState = 'gameOver';
    
    // Calculate game duration
    const gameEndTime = Date.now();
    const gameDuration = gameEndTime - gameStartTime;
    
    // Save high score if it's good enough
    if (highestScoreThisRun > 0) {
        saveHighScore(highestScoreThisRun, gameDuration);
    }
    
    // Show game over screen
    document.getElementById('gameOverMenu').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('gameInstructions').classList.add('hidden');
    // Change title based on win/lose condition
    document.getElementById('gameOverTitle').textContent = isWin ? 'YOU WIN!' : 'GAME OVER';
    document.getElementById('finalScore').textContent = `Final Score: ${isWin ? '∞' : player.number}`;
    document.getElementById('highestScore').textContent = `Highest This Run: ${isWin ? '∞' : highestScoreThisRun}`;
    document.getElementById('soaringQuote').textContent = isWin ? 
        '"You have transcended mere numbers and reached infinity!"' : 
        getRandomQuote();
}

function celebrateInfinity() {
    if (isCelebrating) return; // Prevent multiple celebrations
    isCelebrating = true;
    
    const colors = ['#FF1493', '#00FF00', '#FFD700', '#FF4500', '#7B68EE'];
    
    function celebrate() {
        // Create 60 infinity symbols with random properties
        for (let i = 0; i < 60; i++) {
            celebrationSymbols.push({
                x: player.x,
                y: player.y,
                vx: (Math.random() - 0.5) * 13,
                vy: -Math.random() * 8 - 4,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                scale: Math.random() * 2 + 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                pulse: 0,
                pulseSpeed: Math.random() * 0.1 + 0.05
            });
        }
    }
    celebrate();
    setTimeout(() => {
        celebrate();
    }, 400);

    // End celebration after animation
    setTimeout(() => {
        gameOver(true);
        isCelebrating = false;
        celebrationSymbols = [];
    }, 3000);
}

// Main game loop
function gameLoop() {
    if (gameState === 'playing') {
        gameTime++;
        updatePlayer();
        if (!isCelebrating) {
            spawnGameObject();
            updateGameObjects();
        }
        drawHUD();
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'playing') {
        drawBackground();
        drawPlayer();
        if (!isCelebrating) {
            // Draw non-multiplier objects first
            gameObjects.forEach(obj => {
                if (obj.type !== 'multiplier') {
                    obj.draw();
                }
            });
            
            // Draw multipliers last so they appear on top
            gameObjects.forEach(obj => {
                if (obj.type === 'multiplier') {
                    obj.draw();
                }
            });
        } else {
            celebrationSymbols.forEach((symbol, index) => {
                symbol.x += symbol.vx;
                symbol.y += symbol.vy;
                symbol.vy += 0.1;
                symbol.rotation += symbol.rotationSpeed;
                symbol.pulse += symbol.pulseSpeed;
                symbol.alpha -= 0.01;
                
                if (symbol.alpha > 0) {
                    ctx.save();
                    ctx.translate(symbol.x, symbol.y);
                    ctx.rotate(symbol.rotation);
                    const scale = symbol.scale * (1 + Math.sin(symbol.pulse) * 0.2);
                    ctx.scale(scale, scale);
                    ctx.fillStyle = symbol.color;
                    ctx.globalAlpha = symbol.alpha;
                    ctx.font = 'bold 36px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('∞', 0, 0);
                    ctx.restore();
                }
            });
        }
    }
    if (infinityCelebration) {
        celebrateInfinity();
        infinityCelebration = false; // Reset after celebration
    }
    requestAnimationFrame(gameLoop);
}

// Initialize game when page loads
window.addEventListener('load', init);
