// Main Game Controller

class Game {
    constructor() {
        // Three.js setup
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Game objects
        this.track = null;
        this.karts = [];
        this.playerKart = null;
        this.aiControllers = [];
        
        // Managers
        this.itemManager = null;
        this.particleSystem = null;
        this.uiManager = null;
        
        // Game state
        this.gameState = 'loading'; // loading, menu, countdown, racing, paused, finished
        this.difficulty = 'normal';
        this.totalLaps = 3;
        this.numRacers = 8;
        
        // Race state
        this.raceTime = 0;
        this.raceStartTime = 0;
        
        // Input state
        this.keys = {};
        
        // Camera settings
        this.cameraDistance = 15;
        this.cameraHeight = 6;
        this.cameraLookAhead = 8;
        
        // Performance
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 60;
        this.fpsUpdateTimer = 0;
        
        // Initialize
        this.init();
    }
    
    async init() {
        // Create UI manager
        this.uiManager = new UIManager();
        this.uiManager.updateLoading(10, 'Initializing...');
        
        // Setup Three.js
        this.setupRenderer();
        this.uiManager.updateLoading(20, 'Setting up renderer...');
        
        this.setupScene();
        this.uiManager.updateLoading(30, 'Creating scene...');
        
        this.setupCamera();
        this.uiManager.updateLoading(40, 'Setting up camera...');
        
        this.setupLights();
        this.uiManager.updateLoading(50, 'Adding lights...');
        
        // Create track
        this.track = new Track(this.scene);
        this.uiManager.updateLoading(70, 'Building track...');
        
        // Create particle system
        this.particleSystem = new ParticleSystem(this.scene);
        this.uiManager.updateLoading(80, 'Setting up effects...');
        
        // Create item manager
        this.itemManager = new ItemManager(this.scene, this.track);
        this.uiManager.updateLoading(85, 'Loading items...');
        
        // Setup input
        this.setupInput();
        this.uiManager.updateLoading(90, 'Configuring controls...');
        
        // Initialize audio
        await window.audioManager.init();
        this.uiManager.updateLoading(95, 'Loading audio...');
        
        // Setup resize handler
        window.addEventListener('resize', () => this.onResize());
        
        // Done loading
        this.uiManager.updateLoading(100, 'Ready!');
        
        setTimeout(() => {
            this.uiManager.hideLoading();
            this.uiManager.showMainMenu();
            this.gameState = 'menu';
            
            // Start background music
            window.audioManager.playMusic('menu');
        }, 500);
        
        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: false,  // アンチエイリアスを完全に無効化（パフォーマンス向上）
            powerPreference: 'high-performance',
            stencil: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1);  // 常に1（パフォーマンス最優先）
        this.renderer.shadowMap.enabled = false;  // シャドウを無効化（大幅なパフォーマンス向上）
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
        // Optimization: frustum culling is on by default
        this.renderer.sortObjects = true;
        
        document.getElementById('game-container').appendChild(this.renderer.domElement);
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 300, 800);  // 拡大したコース用にフォグ距離を伸ばす
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.1,
            1500  // 遠くまで見えるように
        );
        this.camera.position.set(0, 10, -20);
    }
    
    setupLights() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);
        
        // Directional light (sun)
        const sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(100, 100, 50);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 10;
        sun.shadow.camera.far = 400;
        sun.shadow.camera.left = -150;
        sun.shadow.camera.right = 150;
        sun.shadow.camera.top = 150;
        sun.shadow.camera.bottom = -150;
        this.scene.add(sun);
        
        // Hemisphere light for sky color
        const hemi = new THREE.HemisphereLight(0x87CEEB, 0x228B22, 0.3);
        this.scene.add(hemi);
    }
    
    setupInput() {
        // Keyboard input
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Pause toggle
            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (this.gameState === 'racing') {
                    this.pauseRace();
                } else if (this.gameState === 'paused') {
                    this.resumeRace();
                }
            }
            
            // Resume audio context on first input
            window.audioManager.resume();
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    updatePlayerInput() {
        if (!this.playerKart) return;
        
        const input = this.playerKart.input;
        
        input.forward = this.keys['ArrowUp'] || this.keys['KeyW'];
        input.backward = this.keys['ArrowDown'] || this.keys['KeyS'];
        input.left = this.keys['ArrowLeft'] || this.keys['KeyA'];
        input.right = this.keys['ArrowRight'] || this.keys['KeyD'];
        input.drift = this.keys['Space'];
        
        // Item use (Space when not drifting, or Shift)
        if ((this.keys['Space'] && !input.forward) || this.keys['ShiftLeft']) {
            if (this.playerKart.currentItem && !this.playerKart.isDrifting) {
                this.playerKart.useItem(this);
            }
        }
    }
    
    async startRace(difficulty = 'normal') {
        this.difficulty = difficulty;
        this.gameState = 'countdown';
        
        // Clear any existing karts
        this.clearRace();
        
        // Create karts
        this.createKarts();
        
        // Position karts at start
        this.positionKartsAtStart();
        
        // Show HUD
        this.uiManager.showHUD();
        
        // Start race music
        window.audioManager.stopMusic();
        window.audioManager.playMusic('race');
        
        // Start engine sounds
        window.audioManager.startEngine();
        
        // Show countdown
        await this.uiManager.showCountdown();
        
        // Start race
        this.gameState = 'racing';
        this.raceStartTime = performance.now();
        this.raceTime = 0;
    }
    
    createKarts() {
        // Create player kart
        this.playerKart = new Kart(this.scene, 0, true, 'Player');
        this.karts.push(this.playerKart);
        
        // Create AI karts
        for (let i = 1; i < this.numRacers; i++) {
            const aiKart = new Kart(this.scene, i, false, RacerNames[i]);
            this.karts.push(aiKart);
            
            const aiController = new AIController(aiKart, this.track, this.difficulty);
            this.aiControllers.push(aiController);
        }
    }
    
    positionKartsAtStart() {
        const startPositions = this.track.getStartPositions(this.numRacers);
        
        // Shuffle positions for AI variety (player always in back)
        this.karts.forEach((kart, index) => {
            const pos = startPositions[index];
            kart.setPosition(pos.x, pos.y, pos.z, pos.rotation);
            kart.lap = 0;
            kart.checkpoint = 0;
            kart.lastCheckpoint = -1;
            kart.finished = false;
            kart.finishTime = 0;
            kart.totalProgress = 0;
            kart.speed = 0;
            kart.currentItem = null;
            kart.hasShield = false;
            kart.isShrunken = false;
            kart.isFrozen = false;
            kart.isSpunOut = false;
            kart.isDrifting = false;
            kart.driftLevel = 0;
            kart.driftTime = 0;
            kart.boostTime = 0;
            kart.finalLapShown = false;
        });
    }
    
    clearRace() {
        // Remove all karts
        this.karts.forEach(kart => {
            this.scene.remove(kart.mesh);
        });
        this.karts = [];
        this.aiControllers = [];
        this.playerKart = null;
        
        // Clear items
        if (this.itemManager) {
            this.itemManager.clear();
        }
        
        // Clear particles
        if (this.particleSystem) {
            this.particleSystem.clear();
        }
        
        // Reset item boxes
        if (this.track) {
            this.track.itemBoxes.forEach(box => {
                box.active = true;
                box.mesh.visible = true;
                box.respawnTime = 0;
            });
        }
    }
    
    pauseRace() {
        if (this.gameState !== 'racing') return;
        
        this.gameState = 'paused';
        this.uiManager.showPauseMenu();
        window.audioManager.stopEngine();
    }
    
    resumeRace() {
        if (this.gameState !== 'paused') return;
        
        this.gameState = 'racing';
        this.uiManager.hidePauseMenu();
        window.audioManager.startEngine();
    }
    
    restartRace() {
        this.gameState = 'menu';
        this.uiManager.hideAllScreens();
        this.clearRace();
        
        // Start new race
        this.startRace(this.difficulty);
    }
    
    returnToMenu() {
        this.gameState = 'menu';
        this.clearRace();
        this.uiManager.showMainMenu();
        
        window.audioManager.stopEngine();
        window.audioManager.stopMusic();
        window.audioManager.playMusic('menu');
    }
    
    finishRace() {
        this.gameState = 'finished';
        
        window.audioManager.stopEngine();
        window.audioManager.stopMusic();
        window.audioManager.playVictoryFanfare();
        
        // Build results
        const results = this.karts
            .sort((a, b) => {
                if (a.finished && b.finished) {
                    return a.finishTime - b.finishTime;
                }
                if (a.finished) return -1;
                if (b.finished) return 1;
                return b.totalProgress - a.totalProgress;
            })
            .map((kart, index) => ({
                name: kart.name,
                time: kart.finishTime || this.raceTime,
                isPlayer: kart.isPlayer,
                position: index + 1
            }));
        
        this.uiManager.showResults(results);
    }
    
    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());
        
        const currentTime = performance.now();
        this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;
        
        // Update FPS counter
        this.fpsUpdateTimer += this.deltaTime;
        if (this.fpsUpdateTimer >= 0.5) {
            this.fps = Math.round(1 / this.deltaTime);
            this.fpsUpdateTimer = 0;
        }
        
        // Update based on game state
        if (this.gameState === 'racing') {
            this.updateRace();
        } else if (this.gameState === 'countdown') {
            this.updateCountdown();
        }
        
        // Always render
        this.render();
    }
    
    updateRace() {
        try {
            // Update race time
            this.raceTime = performance.now() - this.raceStartTime;
            
            // Update player input FIRST
            this.updatePlayerInput();
            
            // Update AI inputs BEFORE updating karts (critical fix!)
            this.aiControllers.forEach(ai => {
                ai.update(this.deltaTime, this.karts);
            });
            
            // Now update all karts with their inputs set
            this.karts.forEach(kart => {
                kart.update(this.deltaTime, this.track);
            });
            
            // Handle kart collisions
            this.handleKartCollisions();
            
            // 敵キャラクター（ドッスン、ノコノコ）の更新と衝突判定
            this.track.updateEnemies(this.deltaTime);
            this.checkEnemyCollisions();
            
            // Update items
            this.itemManager.update(this.deltaTime, this.karts);
            
            // Update track (item box respawns, etc.)
            this.track.update(this.deltaTime);
            
            // Update particles
            this.updateParticles();
            this.particleSystem.update(this.deltaTime);
            
            // Update positions
            this.updateRacePositions();
            
            // Check for lap completion and race finish
            this.checkLapCompletion();
            
            // Update camera
            this.updateCamera();
            
            // Update audio
            this.updateAudio();
            
            // Update UI
            this.updateUI();
        } catch (e) {
            console.error('Error in updateRace:', e);
        }
    }
    
    updateCountdown() {
        // Camera orbits around track during countdown
        const time = performance.now() * 0.0005;
        this.camera.position.x = Math.sin(time) * 100;
        this.camera.position.z = Math.cos(time) * 100;
        this.camera.position.y = 50;
        this.camera.lookAt(0, 0, 50);
    }
    
    handleKartCollisions() {
        for (let i = 0; i < this.karts.length; i++) {
            for (let j = i + 1; j < this.karts.length; j++) {
                if (this.karts[i].checkCollision(this.karts[j])) {
                    this.karts[i].handleCollision(this.karts[j]);
                }
            }
        }
    }
    
    // 敵キャラクター（ドッスン、ノコノコ）との衝突判定
    checkEnemyCollisions() {
        this.karts.forEach(kart => {
            // 無敵状態やスピンアウト中はスキップ
            if (kart.invincibilityTimer > 0 || kart.isSpunOut || kart.starActive) return;
            
            const enemy = this.track.checkEnemyCollision(kart.position);
            if (enemy) {
                // シールドがあれば防ぐ
                if (kart.hasShield) {
                    kart.hasShield = false;
                    if (window.audioManager) {
                        window.audioManager.playSound('shield_break');
                    }
                } else {
                    // クラッシュ
                    kart.spinOut();
                    if (window.audioManager) {
                        window.audioManager.playSound('crash');
                    }
                }
            }
        });
    }
    
    updateRacePositions() {
        // Sort by progress
        const sorted = [...this.karts].sort((a, b) => b.totalProgress - a.totalProgress);
        
        sorted.forEach((kart, index) => {
            kart.racePosition = index + 1;
        });
    }
    
    checkLapCompletion() {
        this.karts.forEach(kart => {
            if (kart.finished) return;
            
            // Check if crossed finish line (lap 3 completed)
            if (kart.lap >= this.totalLaps) {
                kart.finished = true;
                kart.finishTime = this.raceTime;
                
                if (kart.isPlayer) {
                    // Player finished!
                    window.audioManager.playSound('race_finish');
                    setTimeout(() => this.finishRace(), 2000);
                }
            }
            
            // Final lap notification
            if (kart.isPlayer && kart.lap === this.totalLaps - 1 && !kart.finalLapShown) {
                kart.finalLapShown = true;
                this.uiManager.showFinalLap();
            }
        });
        
        // Check if all karts finished
        const allFinished = this.karts.every(k => k.finished);
        if (allFinished && this.gameState === 'racing') {
            this.finishRace();
        }
    }
    
    updateParticles() {
        if (!this.playerKart) return;
        
        // Drift sparks
        if (this.playerKart.isDrifting && this.playerKart.driftLevel >= 1) {
            this.particleSystem.createDriftSparks(this.playerKart);
        }
        
        // Boost flames
        if (this.playerKart.boostTime > 0) {
            this.particleSystem.createBoostFlame(this.playerKart);
        }
        
        // Grass dust
        if (this.playerKart.onGrass && this.playerKart.speed > 20) {
            if (Math.random() < 0.3) {
                this.particleSystem.createDust(this.playerKart.position, this.playerKart.speed / 50);
            }
        }
        
        // Speed lines at high speed
        const speedRatio = this.playerKart.speed / this.playerKart.maxSpeed;
        if (speedRatio > 0.8) {
            this.particleSystem.createSpeedLines(this.playerKart, speedRatio);
        }
        
        // AI particles (less frequent for performance)
        this.karts.forEach(kart => {
            if (kart.isPlayer) return;
            
            if (kart.isDrifting && kart.driftLevel >= 2 && Math.random() < 0.3) {
                this.particleSystem.createDriftSparks(kart);
            }
        });
    }
    
    updateCamera() {
        if (!this.playerKart) return;
        
        const kart = this.playerKart;
        
        // NaN チェック - カートの位置が不正な場合はカメラを更新しない
        if (isNaN(kart.position.x) || isNaN(kart.position.y) || isNaN(kart.position.z)) {
            console.error('Kart position is NaN, skipping camera update');
            // カートの位置はkart.js側で復元されるので、ここではカメラ更新をスキップ
            return;
        }
        
        // Calculate camera target position
        const cameraOffset = new THREE.Vector3(
            -Math.sin(kart.rotation) * this.cameraDistance,
            this.cameraHeight,
            -Math.cos(kart.rotation) * this.cameraDistance
        );
        
        // Add some dynamic movement based on speed
        const speedFactor = Math.abs(kart.speed) / kart.maxSpeed;
        cameraOffset.y += speedFactor * 2;
        
        // Wider view at high speed
        this.camera.fov = 70 + speedFactor * 15;
        this.camera.updateProjectionMatrix();
        
        // Smooth camera follow
        const targetPos = kart.position.clone().add(cameraOffset);
        this.camera.position.lerp(targetPos, 0.1);
        
        // Look ahead based on speed
        const lookAhead = this.cameraLookAhead * (0.5 + speedFactor * 0.5);
        const lookTarget = kart.position.clone();
        lookTarget.x += Math.sin(kart.rotation) * lookAhead;
        lookTarget.z += Math.cos(kart.rotation) * lookAhead;
        lookTarget.y += 1.5;
        
        this.camera.lookAt(lookTarget);
        
        // Camera effects
        // Shake on boost
        if (kart.boostTime > 0) {
            this.camera.position.x += (Math.random() - 0.5) * 0.15;
            this.camera.position.y += (Math.random() - 0.5) * 0.1;
        }
        
        // Shake on drift at high level
        if (kart.isDrifting && kart.driftLevel >= 2) {
            this.camera.position.x += (Math.random() - 0.5) * 0.05 * kart.driftLevel;
        }
        
        // Tilt on drift
        if (kart.isDrifting) {
            this.camera.rotation.z = Utils.lerp(
                this.camera.rotation.z,
                kart.driftDirection * -0.05,
                0.1
            );
        } else {
            this.camera.rotation.z = Utils.lerp(this.camera.rotation.z, 0, 0.1);
        }
    }
    
    updateAudio() {
        if (!this.playerKart) return;
        
        window.audioManager.updateEngine(
            Math.abs(this.playerKart.speed),
            this.playerKart.maxSpeed,
            this.playerKart.isDrifting
        );
    }
    
    updateUI() {
        if (!this.playerKart) return;
        
        try {
            const kart = this.playerKart;
            
            this.uiManager.updatePosition(kart.racePosition);
            this.uiManager.updateLap(Math.min(kart.lap + 1, this.totalLaps), this.totalLaps);
            this.uiManager.updateTimer(this.raceTime);
            this.uiManager.updateItem(kart.currentItem);
            this.uiManager.updateSpeed(kart.speed, kart.maxSpeed);
            this.uiManager.updateBoostMeter(kart.driftLevel, kart.driftTime, kart.boostTime);
            this.uiManager.showWrongWay(kart.wrongWay);
            this.uiManager.updateMinimap(this.karts, this.track);
        } catch (e) {
            console.error('Error in updateUI:', e);
        }
    }
    
    render() {
        try {
            // カメラ位置がNaNの場合はリセット
            if (isNaN(this.camera.position.x) || isNaN(this.camera.position.y) || isNaN(this.camera.position.z)) {
                console.error('Camera position is NaN, resetting');
                this.camera.position.set(0, 10, -20);
                if (this.playerKart) {
                    this.camera.lookAt(this.playerKart.position);
                }
            }
            this.renderer.render(this.scene, this.camera);
        } catch (e) {
            console.error('Error in render:', e);
        }
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
