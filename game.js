// --- การตั้งค่าเกม ---
const FPS = 60;
const WIDTH = 500;
const HEIGHT = 800;
const GRAVITY = 0.45;
const FLAP_STRENGTH = -9;
const PIPE_GAP = HEIGHT / 4;
const PIPE_WIDTH = 60;
const PIPE_INTERVAL = 1500; // milliseconds
const GROUND_HEIGHT = 100;
const INITIAL_PIPE_SPEED = 4.5; // ค่าคงที่ความเร็วเริ่มต้น
const CAT_SCALE_HEIGHT_RATIO = 0.08;

// --- เตรียม Canvas ---
const canvas = document.getElementById('gameCanvas');
canvas.width = WIDTH;
canvas.height = HEIGHT;
const ctx = canvas.getContext('2d');

// --- โหลดภาพ ---
const images = {};
let imagesLoaded = 0;
const totalImages = 5;

function loadImage(name, path, onLoad) {
    const img = new Image();
    img.src = path;
    img.onload = () => {
        images[name] = img;
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            onLoad();
        }
    };
    img.onerror = () => {
        console.error(`Failed to load image: ${path}`);
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            onLoad();
        }
    };
}

// ฟังก์ชันปรับขนาดภาพ (คำนวณขนาดที่ควรจะเป็น)
function scaleImage(img, name) {
    if (name === 'cat') {
        const targetHeight = HEIGHT * CAT_SCALE_HEIGHT_RATIO;
        const ratio = img.width / img.height;
        return {
            img: img,
            width: targetHeight * ratio,
            height: targetHeight
        };
    }
    if (name === 'pipe') {
        return {
            img: img,
            width: PIPE_WIDTH,
            height: 500
        };
    }
    if (name === 'BASE') {
        return { 
            img: img, 
            width: WIDTH,
            height: GROUND_HEIGHT 
        };
    }
    return { img: img, width: img.width, height: img.height };
}

function loadAllImages(callback) {
    loadImage("COVER", "cover.png", callback);
    loadImage("BG", "background.png", callback);
    loadImage("BASE", "base.png", callback);
    loadImage("PIPE_IMG", "pipe.png", callback);
    loadImage("CAT_IMG", "cat.png", callback);
}

// --- ฟังก์ชันวาดข้อความ (แทนที่ draw_text_auto) ---
function drawText(text, x, y, size, color, maxWidth) {
    ctx.fillStyle = color;
    let fontSize = size;
    ctx.font = `${fontSize}px Arial, sans-serif`;
    
    while (ctx.measureText(text).width > maxWidth && fontSize > 10) {
        fontSize -= 2;
        ctx.font = `${fontSize}px Arial, sans-serif`;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
}

// --- Class Bird (Cat) ---
class Bird {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vel = 0;
        this.angle = 0;
        this.rawImage = images.CAT_IMG;
        this.scaledData = scaleImage(this.rawImage, 'cat');
        this.width = this.scaledData.width;
        this.height = this.scaledData.height;
    }

    flap() {
        this.vel = FLAP_STRENGTH;
    }

    update() {
        this.vel += GRAVITY;
        this.y += this.vel;
        this.angle = Math.max(-30, Math.min(60, -this.vel * 3)); 
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle * Math.PI / 180);
        
        ctx.drawImage(
            this.rawImage, 
            -this.width / 2, 
            -this.height / 2,
            this.width,
            this.height
        );
        ctx.restore();
    }

    getRect() {
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height / 2,
            bottom: this.y + this.height / 2,
            width: this.width,
            height: this.height
        };
    }
}

// --- Class Pipe ---
class Pipe {
    constructor(x) {
        this.x = x;
        this.center = Math.floor(Math.random() * (HEIGHT - GROUND_HEIGHT - PIPE_GAP/2 - 20 - (PIPE_GAP/2 + 60) + 1)) + 
            (PIPE_GAP/2 + 60);
        this.passed = false;
        
        this.rawImage = images.PIPE_IMG;
        this.scaledData = scaleImage(this.rawImage, 'pipe');
        this.width = this.scaledData.width;
        this.height = this.scaledData.height; 
        
        this.top_y = this.center - PIPE_GAP / 2 - this.height;
        this.bottom_y = this.center + PIPE_GAP / 2;
    }

    update() {
        this.x -= pipeSpeed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.top_y + this.height / 2);
        ctx.scale(1, -1); 
        ctx.drawImage(
            this.rawImage, 
            -this.width / 2, 
            -this.height / 2, 
            this.width, 
            this.height
        );
        ctx.restore();

        ctx.drawImage(
            this.rawImage, 
            this.x, 
            this.bottom_y, 
            this.width, 
            this.height
        );
    }

    getRects() {
        const top_rect = {
            left: this.x,
            right: this.x + this.width,
            top: this.top_y,
            bottom: this.top_y + this.height,
            width: this.width,
            height: this.height
        };
        const bottom_rect = {
            left: this.x,
            right: this.x + this.width,
            top: this.bottom_y,
            bottom: this.bottom_y + this.height,
            width: this.width,
            height: this.height
        };
        return [top_rect, bottom_rect];
    }
}

// --- Collision Helper ---
function checkCollision(rect1, rect2) {
    return rect1.left < rect2.right &&
           rect1.right > rect2.left &&
           rect1.top < rect2.bottom &&
           rect1.bottom > rect2.top;
}

// --- วาดพื้น ---
let BASE_DATA = null;

function drawGround(offset) {
    if (!BASE_DATA) {
        BASE_DATA = scaleImage(images.BASE, 'BASE');
    }
    const baseWidth = BASE_DATA.width;
    const baseHeight = BASE_DATA.height;
    ctx.drawImage(images.BASE, offset, HEIGHT - GROUND_HEIGHT, baseWidth, baseHeight);
    ctx.drawImage(images.BASE, offset + baseWidth, HEIGHT - GROUND_HEIGHT, baseWidth, baseHeight);
}

// --- Game Loop ตัวแปรและ Logic ---
let bird;
let pipes = [];
let score = 0;
let ground_offset = 0;
let game_over = false;
let lastPipeTime = 0;
let lastFrameTime = 0;
let pipeSpeed = INITIAL_PIPE_SPEED; 

function resetGame() {
    bird = new Bird(WIDTH * 0.2, HEIGHT / 2);
    pipes = [];
    score = 0;
    ground_offset = 0;
    game_over = false;
    lastPipeTime = performance.now();
    lastFrameTime = performance.now();
    
    pipeSpeed = INITIAL_PIPE_SPEED; // รีเซ็ตความเร็วของท่อ
}

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastFrameTime; 
    lastFrameTime = timestamp;

    if (!game_over && timestamp - lastPipeTime > PIPE_INTERVAL) {
        pipes.push(new Pipe(WIDTH + 50));
        lastPipeTime = timestamp;
    }

    if (!game_over) {
        bird.update();
        
        pipes.forEach(p => p.update());
        pipes = pipes.filter(p => p.x + PIPE_WIDTH > -50);

        const birdRect = bird.getRect();

        // ตรวจชนท่อ
        for (const p of pipes) {
            const [topRect, bottomRect] = p.getRects();
            if (checkCollision(birdRect, topRect) || checkCollision(birdRect, bottomRect)) {
                game_over = true;
                break;
            }
        }

        // ตรวจชนพื้น/เพดาน
        if (birdRect.bottom >= HEIGHT - GROUND_HEIGHT || birdRect.top <= 0) {
            game_over = true;
        }

        // เพิ่มคะแนน
        pipes.forEach(p => {
            if (!p.passed && p.x + PIPE_WIDTH < bird.x) {
                p.passed = true;
                score += 1;
            }
        });

        // ขยับพื้น
        if (BASE_DATA) {
            ground_offset -= pipeSpeed;
            if (ground_offset <= -BASE_DATA.width) {
                ground_offset = 0;
            }
        }
    }
    
    // --- วาดหน้าจอ ---
    ctx.drawImage(images.BG, 0, 0, WIDTH, HEIGHT);
    pipes.forEach(p => p.draw());
    drawGround(ground_offset);
    bird.draw();
    
    // วาดคะแนน
    drawText(String(score), WIDTH / 2, HEIGHT / 6, 48, 'white', WIDTH - 20);

    if (game_over) {
        // วาดฉาก GAME OVER
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        drawText("GAME OVER", WIDTH / 2, HEIGHT / 2 - 50, 48, 'red', WIDTH - 20);
        drawText(`Score: ${score}`, WIDTH / 2, HEIGHT / 2 + 10, 38, 'white', WIDTH - 20);
        drawText("Press SPACE or Click to replay", WIDTH / 2, HEIGHT / 2 + 50, 28, 'white', WIDTH - 20);
    }
    
    window.requestAnimationFrame(gameLoop);
}

// --- Main Menu ---
let waitingForStart = true;
let isMenu = true;

function handleInput(e) {
    // 1. ป้องกันการทำงานซ้ำซ้อน (Prevent Double Event)
    // หากมีการแตะหน้าจอ (touchstart) เกิดขึ้น ให้ยกเลิกการทำงานของ mousedown/click/mouseup
    if (e.type === 'touchstart') {
        e.preventDefault(); 
        // เมื่อ touchstart ทำงาน, เราถือว่ามันเสร็จสิ้นแล้ว ไม่ต้องให้ mousedown/mouseup ตามมา
    }
    
    // 2. กำหนดเงื่อนไข Input
    const isKeyDown = e.type === 'keydown';
    // ใช้ mousedown และ touchstart เป็นตัวกระตุ้นการกระโดด
    const isClickOrTouch = (e.type === 'mousedown' || e.type === 'touchstart');

    // --- Logic สำหรับการกดปุ่ม (Keyboard) ---
    if (isKeyDown && (e.key === ' ' || e.key === 'ArrowUp')) {
        e.preventDefault(); 
        
        if (waitingForStart) {
            waitingForStart = false; 
        } else if (game_over) {
            resetGame(); 
        } else {
            bird.flap();
        }

    // --- Logic สำหรับการคลิก/แตะ (Mouse/Touch) ---
    } else if (isClickOrTouch) { 
        // 🚨 สำคัญ: หากมันถูกเรียกจาก mousedown และไม่ใช่ Touch Screen (สำหรับคอมพิวเตอร์ทั่วไป)
        // หรือเรียกจาก touchstart (สำหรับมือถือ) ให้ flap.
        
        if (waitingForStart) {
            waitingForStart = false; 
        } else if (game_over) {
            resetGame(); 
        } else {
            bird.flap();
        }
    }

    // สำหรับปุ่ม Escape
    if (isKeyDown && e.key === 'Escape') {
        console.log("Escape pressed.");
    }
}

function mainMenuLoop(timestamp) {
    if (isMenu) {
        // วาดภาพหน้าปก/พื้นหลัง
        if (images.COVER) {
            ctx.drawImage(images.COVER, 0, 0, WIDTH, HEIGHT);
            drawText("Press SPACE or Click to start", WIDTH / 2, HEIGHT / 2 + 170, 28, 'white', WIDTH - 20);
        } else {
            // สำรอง: หากภาพ COVER โหลดไม่สำเร็จ
            ctx.fillStyle = 'black'; 
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            drawText("LOADING...", WIDTH / 2, HEIGHT / 2, 48, 'white', WIDTH - 20);
        }
    }

    if (waitingForStart) {
        window.requestAnimationFrame(mainMenuLoop);
    } else {
        isMenu = false;
        resetGame();
        window.requestAnimationFrame(gameLoop);
    }
}


document.addEventListener('keydown', handleInput);
document.addEventListener('mousedown', handleInput);
document.addEventListener('touchstart', handleInput); // <--- อย่าลืมเพิ่ม touchstart ด้วยนะครับ

// --- เริ่มต้น ---
loadAllImages(() => {
    console.log("All images loaded. Starting Main Menu.");
    window.requestAnimationFrame(mainMenuLoop);
});
