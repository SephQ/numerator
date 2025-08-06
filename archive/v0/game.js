// Game state
let gameState = 'menu'; // 'menu', 'playing', 'gameOver'
let canvas, ctx;
let player;
let gameObjects = [];
let keys = {};
let gameSpeed = 1;
let maxSpeed = 3;
let score = 0;
let gameTime = 0;

// Initialize the game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('click', handleClick);
    
    // Initialize player
    resetPlayer();
    
    // Start game loop
    gameLoop();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function resetPlayer() {
    player = {
        x: canvas.width / 2,
        y: canvas.height - 150,
        width: 80,
        height: 80,
        number: 0,
        velocity: { x: 0, y: 0 },
        onGround: true,
        jumpPower: 15,
        gravity: 0.8,
        maxSpeed: 6
    };
}

// Game object classes
class GameObject {
    constructor(x, y, type, value) {
        this.x = x;
        this.y = y;
        this.type = type; // 'positive', 'negative', 'division'
        this.value = value;
        this.width = type === 'division' ? canvas.width : 60;
        this.height = type === 'division' ? 20 : 60;
        this.collected = false;
        this.attackTimer = 0;
        this.attacking = false;
    }
    
    update() {
        // Move objects down based on game speed
        this.y += gameSpeed;
        
        // Handle negative number behavior
        if (this.type === 'negative') {
            const distanceToPlayer = Math.sqrt(
                Math.pow(this.x - player.x, 2) + Math.pow(this.y - player.y, 2)
            );
            
            if (distanceToPlayer < 120 && !this.attacking) {
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
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`+${this.value}`, this.x, this.y);
            
        } else if (this.type === 'negative') {
            // Draw negative numbers in red with attack animation
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
            ctx.font = `bold ${24 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`-${this.value}`, this.x, this.y);
            
        } else if (this.type === 'division') {
            // Draw division line
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(0, this.y - this.height/2, canvas.width, this.height);
            
            ctx.fillStyle = '#92400e';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            const text = `/${this.value}`.repeat(Math.floor(canvas.width / 40));
            ctx.fillText(text, 10, this.y);
        }
        
        ctx.restore();
    }
    
    checkCollision(other) {
        return (
            other.x < this.x + this.width/2 &&
            other.x + other.width > this.x - this.width/2 &&
            other.y < this.y + this.height/2 &&
            other.y + other.height > this.y - this.height/2
        );
    }
}

// Input handling
function handleKeyDown(e) {
    keys[e.key.toLowerCase()] = true;
    
    if (gameState === 'playing') {
        if (e.key === 'Escape') {
            showMainMenu();
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
        player.velocity.y = -player.jumpPower;
        player.onGround = false;
    }
}

// Game logic
function updatePlayer() {
    // Handle horizontal movement
    let moveSpeed = 5;
    if (keys['a'] || keys['arrowleft']) {
        player.velocity.x = Math.max(player.velocity.x - 0.5, -moveSpeed);
    } else if (keys['d'] || keys['arrowright']) {
        player.velocity.x = Math.min(player.velocity.x + 0.5, moveSpeed);
    } else {
        player.velocity.x *= 0.8; // Friction
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
    if (Math.random() < 0.02) { // 2% chance per frame
        const x = Math.random() * (canvas.width - 100) + 50;
        const y = -50;
        
        const rand = Math.random();
        if (rand < 0.5) {
            // Spawn positive number
            const value = Math.floor(Math.random() * 10) + 1;
            gameObjects.push(new GameObject(x, y, 'positive', value));
        } else if (rand < 0.85) {
            // Spawn negative number
            const value = Math.floor(Math.random() * 8) + 1;
            gameObjects.push(new GameObject(x, y, 'negative', value));
        } else {
            // Spawn division line
            const value = Math.floor(Math.random() * 5) + 2;
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
                obj.collected = true;
                obj.remove = true;
            } else if (obj.type === 'negative') {
                player.number -= obj.value;
                obj.collected = true;
                obj.remove = true;
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
    
    // Check game over condition
    if (player.number < 0) {
        gameOver();
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
    ctx.font = 'bold 36px Arial';
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

// Game state management
function startGame() {
    gameState = 'playing';
    score = player.number = 0;
    gameTime = 0;
    gameObjects = [];
    resetPlayer();
    
    // Hide menus, show game UI
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('instructionsMenu').classList.add('hidden');
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('gameInstructions').classList.remove('hidden');
}

function showMainMenu() {
    gameState = 'menu';
    
    // Show main menu, hide others
    document.getElementById('mainMenu').classList.remove('hidden');
    document.getElementById('instructionsMenu').classList.add('hidden');
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('gameInstructions').classList.add('hidden');
}

function showInstructions() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('instructionsMenu').classList.remove('hidden');
}

function gameOver() {
    gameState = 'gameOver';
    
    // Show game over screen
    document.getElementById('gameOverMenu').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('gameInstructions').classList.add('hidden');
    document.getElementById('finalScore').textContent = `Final Score: ${player.number}`;
}

// Main game loop
function gameLoop() {
    if (gameState === 'playing') {
        gameTime++;
        updatePlayer();
        spawnGameObject();
        updateGameObjects();
        drawHUD();
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'playing') {
        drawBackground();
        drawPlayer();
        gameObjects.forEach(obj => obj.draw());
    }
    
    requestAnimationFrame(gameLoop);
}

// Initialize game when page loads
window.addEventListener('load', init);
