// ==================== متغيرات اللعبة الرئيسية ====================
let gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    highScore: localStorage.getItem('highScore') || 0,
    currentLevel: 1,
    enemiesDefeated: 0,
    levelsCompleted: 0,
    totalPlayTime: 0,
    playStartTime: 0
};

let player = {
    x: 100,
    y: 0,
    width: 40,
    height: 60,
    velocityX: 0,
    velocityY: 0,
    health: 100,
    maxHealth: 100,
    armor: 0,
    speed: 5,
    jumpPower: 15,
    isJumping: false,
    direction: 1, // 1 = يمين, -1 = يسار
    isAttacking: false,
    attackCooldown: 0
};

let gameObjects = {
    enemies: [],
    items: [],
    projectiles: [],
    particles: []
};

const keys = {};
const GRAVITY = 0.6;
const GROUND_Y = window.innerHeight - 150;
let gameSpeed = 1;

// ==================== التهيئة ====================
window.addEventListener('DOMContentLoaded', () => {
    loadStats();
    setupEventListeners();
});

function setupEventListeners() {
    // لوحة المفاتيح
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        
        if (e.key === 'Escape') togglePause();
        if (e.key === ' ') {
            e.preventDefault();
            playerAttack();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    // التحكم باللمس
    document.querySelectorAll('.d-btn').forEach(btn => {
        btn.addEventListener('mousedown', () => {
            keys[btn.dataset.direction] = true;
        });
        btn.addEventListener('mouseup', () => {
            keys[btn.dataset.direction] = false;
        });
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys[btn.dataset.direction] = true;
        });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys[btn.dataset.direction] = false;
        });
    });

    document.getElementById('attackBtn').addEventListener('click', playerAttack);
    document.getElementById('attackBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        playerAttack();
    });

    window.addEventListener('resize', () => {
        player.y = GROUND_Y - player.height;
    });
}

// ==================== الدوال الرئيسية للقوائم ====================
function startGame() {
    hideAllMenus();
    document.getElementById('gameArea').classList.add('active');
    gameState.isRunning = true;
    gameState.isPaused = false;
    gameState.playStartTime = Date.now();
    
    // إعادة تعيين الحالة
    gameState.currentLevel = 1;
    player.health = player.maxHealth;
    player.armor = 0;
    player.x = 100;
    gameState.score = 0;
    gameObjects.enemies = [];
    gameObjects.items = [];
    gameObjects.projectiles = [];
    gameObjects.particles = [];
    
    spawnWaveEnemies();
    gameLoop();
}

function pauseGame() {
    gameState.isPaused = true;
    document.getElementById('pauseMenu').classList.add('active');
}

function resumeGame() {
    gameState.isPaused = false;
    document.getElementById('pauseMenu').classList.remove('active');
}

function restartGame() {
    hideAllMenus();
    startGame();
}

function togglePause() {
    if (gameState.isRunning) {
        gameState.isPaused ? resumeGame() : pauseGame();
    }
}

function backToMenu() {
    hideAllMenus();
    gameState.isRunning = false;
    gameState.isPaused = false;
    document.getElementById('mainMenu').classList.add('active');
    document.getElementById('gameArea').classList.remove('active');
    
    // حفظ الإحصائيات
    saveStats();
}

function hideAllMenus() {
    document.querySelectorAll('.menu').forEach(menu => {
        menu.classList.remove('active');
    });
}

function showInstructions() {
    hideAllMenus();
    document.getElementById('instructionsMenu').classList.add('active');
}

function showCredits() {
    hideAllMenus();
    document.getElementById('creditsMenu').classList.add('active');
    updateStatsDisplay();
}

function resetStats() {
    if (confirm('هل أنت متأكد من رغبتك في حذف جميع الإحصائيات؟')) {
        gameState.highScore = 0;
        gameState.enemiesDefeated = 0;
        gameState.levelsCompleted = 0;
        gameState.totalPlayTime = 0;
        localStorage.clear();
        updateStatsDisplay();
    }
}

function updateStatsDisplay() {
    document.getElementById('highScore').textContent = gameState.highScore;
    document.getElementById('enemiesDefeated').textContent = gameState.enemiesDefeated;
    document.getElementById('levelsCompleted').textContent = gameState.levelsCompleted;
    document.getElementById('totalPlayTime').textContent = Math.floor(gameState.totalPlayTime / 60);
}

// ==================== حفظ وتحميل الإحصائيات ====================
function saveStats() {
    gameState.totalPlayTime += (Date.now() - gameState.playStartTime) / 1000;
    
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('highScore', gameState.highScore);
    }
    
    localStorage.setItem('enemiesDefeated', gameState.enemiesDefeated);
    localStorage.setItem('levelsCompleted', gameState.levelsCompleted);
    localStorage.setItem('totalPlayTime', gameState.totalPlayTime);
}

function loadStats() {
    gameState.highScore = parseInt(localStorage.getItem('highScore')) || 0;
    gameState.enemiesDefeated = parseInt(localStorage.getItem('enemiesDefeated')) || 0;
    gameState.levelsCompleted = parseInt(localStorage.getItem('levelsCompleted')) || 0;
    gameState.totalPlayTime = parseInt(localStorage.getItem('totalPlayTime')) || 0;
}

// ==================== حركة اللاعب ====================
function updatePlayerMovement() {
    // الحركة الأفقية
    if (keys['arrowleft'] || keys['a']) {
        player.velocityX = -player.speed;
        player.direction = -1;
    } else if (keys['arrowright'] || keys['d']) {
        player.velocityX = player.speed;
        player.direction = 1;
    } else {
        player.velocityX = 0;
    }

    // القفز
    if ((keys['arrowup'] || keys['w'] || keys[' ']) && !player.isJumping) {
        player.velocityY = -player.jumpPower;
        player.isJumping = true;
    }

    // الجاذبية
    player.velocityY += GRAVITY;

    // تحديث الموضع
    player.x += player.velocityX;
    player.y += player.velocityY;

    // الحدود الأفقية
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > window.innerWidth) player.x = window.innerWidth - player.width;

    // الأرض
    if (player.y + player.height >= GROUND_Y) {
        player.y = GROUND_Y - player.height;
        player.isJumping = false;
        player.velocityY = 0;
    }

    // تحديث موضع اللاعب في DOM
    document.getElementById('player').style.left = player.x + 'px';
    document.getElementById('player').style.bottom = (window.innerHeight - player.y - player.height) + 'px';
    
    // قلب الاتجاه
    const playerEl = document.getElementById('player');
    if (player.direction === -1) {
        playerEl.style.transform = 'scaleX(-1)';
    } else {
        playerEl.style.transform = 'scaleX(1)';
    }
}

// ==================== الهجوم ====================
function playerAttack() {
    if (!gameState.isRunning || gameState.isPaused || player.attackCooldown > 0) return;
    
    player.isAttacking = true;
    player.attackCooldown = 20; // عدد الإطارات بين الهجمات

    // تفتيش الأعداء بالقرب من اللاعب
    const attackRange = 60;
    const attackDamage = 10 + player.armor * 2;

    gameObjects.enemies.forEach((enemy, index) => {
        const distance = Math.abs(enemy.x - player.x);
        const isInFrontOfPlayer = 
            (player.direction === 1 && enemy.x > player.x) ||
            (player.direction === -1 && enemy.x < player.x);

        if (distance < attackRange && isInFrontOfPlayer) {
            enemy.health -= attackDamage;
            createParticles(enemy.x, enemy.y, 'blood', 5);
            
            if (enemy.health <= 0) {
                gameObjects.enemies.splice(index, 1);
                gameState.score += 50 + (gameState.currentLevel * 10);
                gameState.enemiesDefeated++;
                
                // فرصة لإسقاط أغراض
                if (Math.random() < 0.3) {
                    spawnItem(enemy.x, enemy.y);
                }
            }
        }
    });

    // تأثير بصري
    document.getElementById('player').classList.add('shake');
    setTimeout(() => {
        document.getElementById('player').classList.remove('shake');
    }, 300);
}

// ==================== الأعداء ====================
function spawnWaveEnemies() {
    const enemyCount = 3 + gameState.currentLevel;
    
    for (let i = 0; i < enemyCount; i++) {
        const enemy = {
            x: window.innerWidth - 100 - (i * 80),
            y: GROUND_Y - 55,
            width: 35,
            height: 55,
            health: 20 + gameState.currentLevel * 5,
            maxHealth: 20 + gameState.currentLevel * 5,
            speed: 2 + gameState.currentLevel * 0.5,
            velocityY: 0,
            direction: -1,
            element: null
        };

        createEnemyElement(enemy);
        gameObjects.enemies.push(enemy);
    }
}

function createEnemyElement(enemy) {
    const enemyEl = document.createElement('div');
    enemyEl.className = 'enemy';
    enemyEl.style.left = enemy.x + 'px';
    enemyEl.style.bottom = (window.innerHeight - enemy.y - enemy.height) + 'px';
    
    enemyEl.innerHTML = `
        <div class="enemy-body">
            <div class="enemy-head"></div>
            <div class="enemy-torso"></div>
        </div>
    `;
    
    document.getElementById('enemies').appendChild(enemyEl);
    enemy.element = enemyEl;
}

function updateEnemies() {
    gameObjects.enemies.forEach((enemy, index) => {
        // الحركة نحو اللاعب
        if (enemy.x > player.x) {
            enemy.x -= enemy.speed;
            enemy.direction = -1;
        } else {
            enemy.x += enemy.speed;
            enemy.direction = 1;
        }

        // تحديث موضع العدو في DOM
        enemy.element.style.left = enemy.x + 'px';
        if (enemy.direction === -1) {
            enemy.element.style.transform = 'scaleX(-1)';
        } else {
            enemy.element.style.transform = 'scaleX(1)';
        }

        // تصادم مع اللاعب
        if (checkCollision(player, enemy)) {
            const damage = 5;
            player.health -= damage;
            createParticles(enemy.x, enemy.y, 'blood', 3);
            
            if (player.health <= 0) {
                gameOver();
            }
        }

        // حذف العدو إذا ذهب بعيداً
        if (enemy.x < -50 || enemy.x > window.innerWidth + 50) {
            enemy.element.remove();
            gameObjects.enemies.splice(index, 1);
        }
    });

    // عندما تنتهي الموجة
    if (gameObjects.enemies.length === 0 && gameState.isRunning) {
        nextLevel();
    }
}

// ==================== العناصر ====================
function spawnItem(x, y) {
    const itemType = Math.random() < 0.5 ? 'weapon' : 'armor';
    const item = {
        x: x,
        y: y,
        width: 20,
        height: 20,
        type: itemType,
        velocityY: 0,
        element: null
    };

    createItemElement(item);
    gameObjects.items.push(item);
}

function createItemElement(item) {
    const itemEl = document.createElement('div');
    itemEl.className = `item ${item.type}`;
    itemEl.style.left = item.x + 'px';
    itemEl.style.bottom = (window.innerHeight - item.y - item.height) + 'px';
    
    document.getElementById('items').appendChild(itemEl);
    item.element = itemEl;
}

function updateItems() {
    gameObjects.items.forEach((item, index) => {
        // الجاذبية
        item.velocityY += GRAVITY;
        item.y += item.velocityY;

        // تحديث موضع العنصر
        item.element.style.bottom = (window.innerHeight - item.y - item.height) + 'px';

        // حذف العنصر إذا سقط
        if (item.y > GROUND_Y) {
            item.element.remove();
            gameObjects.items.splice(index, 1);
            return;
        }

        // التقاط العنصر
        if (checkCollision(player, item)) {
            if (item.type === 'weapon') {
                gameState.score += 100;
                player.armor += 5;
            } else if (item.type === 'armor') {
                player.health = Math.min(player.health + 30, player.maxHealth);
            }
            
            createParticles(item.x, item.y, 'spark', 8);
            item.element.remove();
            gameObjects.items.splice(index, 1);
        }
    });
}

// ==================== الجسيمات ====================
function createParticles(x, y, type, count) {
    for (let i = 0; i < count; i++) {
        const particle = {
            x: x,
            y: y,
            velocityX: (Math.random() - 0.5) * 10,
            velocityY: (Math.random() - 0.5) * 10,
            life: 30,
            type: type,
            element: null
        };

        const particleEl = document.createElement('div');
        particleEl.className = `particle ${type}`;
        particleEl.style.left = x + 'px';
        particleEl.style.bottom = (window.innerHeight - y) + 'px';
        particleEl.style.width = '5px';
        particleEl.style.height = '5px';
        
        document.getElementById('particles').appendChild(particleEl);
        particle.element = particleEl;
        gameObjects.particles.push(particle);
    }
}

function updateParticles() {
    gameObjects.particles.forEach((particle, index) => {
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        particle.life--;

        particle.element.style.left = particle.x + 'px';
        particle.element.style.bottom = (window.innerHeight - particle.y) + 'px';
        particle.element.style.opacity = particle.life / 30;

        if (particle.life <= 0) {
            particle.element.remove();
            gameObjects.particles.splice(index, 1);
        }
    });
}

// ==================== التصادمات ====================
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// ==================== مستويات اللعبة ====================
function nextLevel() {
    gameState.currentLevel++;
    gameState.levelsCompleted++;
    gameSpeed += 0.1;
    player.health = player.maxHealth;
    player.armor = Math.max(player.armor - 5, 0);
    
    // إعادة تعيين موضع اللاعب
    player.x = 100;
    
    spawnWaveEnemies();
}

function gameOver() {
    gameState.isRunning = false;
    saveStats();
    
    // عرض شاشة نهاية اللعبة
    document.getElementById('gameOverTitle').textContent = 'لقد هزمت!';
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalEnemies').textContent = gameState.enemiesDefeated;
    document.getElementById('finalLevel').textContent = gameState.currentLevel;
    document.getElementById('gameOverMenu').classList.add('active');
}

// ==================== تحديث الواجهة ====================
function updateHUD() {
    document.getElementById('playerHealth').textContent = Math.max(player.health, 0);
    document.getElementById('playerArmor').textContent = player.armor;
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('currentLevel').textContent = gameState.currentLevel;
}

// ==================== حلقة اللعبة الرئيسية ====================
function gameLoop() {
    if (gameState.isRunning && !gameState.isPaused) {
        updatePlayerMovement();
        updateEnemies();
        updateItems();
        updateParticles();
        updateHUD();

        if (player.attackCooldown > 0) {
            player.attackCooldown--;
        }
    }

    if (gameState.isRunning) {
        requestAnimationFrame(gameLoop);
    }
}

// ==================== معالجة الخطأ ====================
window.addEventListener('error', (e) => {
    console.error('خطأ في اللعبة:', e);
});

// السماح باللعب حتى بدون أخطاء