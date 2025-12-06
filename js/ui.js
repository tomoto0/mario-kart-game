// UI Manager - handles all HUD elements and screens

class UIManager {
    constructor() {
        // Get UI elements
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingBar = document.getElementById('loading-bar');
        this.loadingText = document.getElementById('loading-text');
        
        this.mainMenu = document.getElementById('main-menu');
        this.hud = document.getElementById('hud');
        this.countdown = document.getElementById('countdown');
        this.wrongWay = document.getElementById('wrong-way');
        this.resultsScreen = document.getElementById('results-screen');
        this.pauseMenu = document.getElementById('pause-menu');
        
        // HUD elements
        this.positionDisplay = document.getElementById('position-display');
        this.lapDisplay = document.getElementById('lap-display');
        this.timerDisplay = document.getElementById('timer-display');
        this.itemDisplay = document.getElementById('item-display');
        this.speedDisplay = document.getElementById('speed-display');
        this.boostFill = document.getElementById('boost-fill');
        
        // Minimap
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
        
        // Setup minimap canvas
        if (this.minimapCanvas) {
            this.minimapCanvas.width = 180;
            this.minimapCanvas.height = 180;
        }
        
        // Difficulty selection
        this.selectedDifficulty = 'normal';
        this.setupDifficultyButtons();
        
        // Button handlers
        this.setupButtons();
    }
    
    setupDifficultyButtons() {
        const diffButtons = document.querySelectorAll('.diff-btn');
        diffButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                diffButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.selectedDifficulty = btn.dataset.difficulty;
            });
        });
    }
    
    setupButtons() {
        // Start button
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (window.game) {
                    window.game.startRace(this.selectedDifficulty);
                }
            });
        }
        
        // Restart button
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                if (window.game) {
                    window.game.restartRace();
                }
            });
        }
        
        // Menu button
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                if (window.game) {
                    window.game.returnToMenu();
                }
            });
        }
        
        // Resume button
        const resumeBtn = document.getElementById('resume-btn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                if (window.game) {
                    window.game.resumeRace();
                }
            });
        }
        
        // Quit button
        const quitBtn = document.getElementById('quit-btn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => {
                if (window.game) {
                    window.game.returnToMenu();
                }
            });
        }
    }
    
    // Loading screen
    updateLoading(progress, text) {
        if (this.loadingBar) {
            this.loadingBar.style.width = `${progress}%`;
        }
        if (this.loadingText) {
            this.loadingText.textContent = text;
        }
    }
    
    hideLoading() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
    }
    
    // Screen transitions
    showMainMenu() {
        this.hideAllScreens();
        if (this.mainMenu) {
            this.mainMenu.style.display = 'flex';
        }
    }
    
    showHUD() {
        this.hideAllScreens();
        if (this.hud) {
            this.hud.style.display = 'block';
        }
    }
    
    showResults(results) {
        if (this.hud) {
            this.hud.style.display = 'none';
        }
        if (this.resultsScreen) {
            this.resultsScreen.style.display = 'flex';
            this.buildResultsTable(results);
        }
    }
    
    showPauseMenu() {
        if (this.pauseMenu) {
            this.pauseMenu.style.display = 'flex';
        }
    }
    
    hidePauseMenu() {
        if (this.pauseMenu) {
            this.pauseMenu.style.display = 'none';
        }
    }
    
    hideAllScreens() {
        if (this.mainMenu) this.mainMenu.style.display = 'none';
        if (this.hud) this.hud.style.display = 'none';
        if (this.resultsScreen) this.resultsScreen.style.display = 'none';
        if (this.pauseMenu) this.pauseMenu.style.display = 'none';
        if (this.countdown) this.countdown.style.display = 'none';
        if (this.wrongWay) this.wrongWay.style.display = 'none';
    }
    
    // Countdown
    async showCountdown() {
        return new Promise(resolve => {
            if (!this.countdown) {
                resolve();
                return;
            }
            
            const sequence = ['3', '2', '1', 'GO!'];
            let index = 0;
            
            const showNext = () => {
                if (index >= sequence.length) {
                    this.countdown.style.display = 'none';
                    resolve();
                    return;
                }
                
                this.countdown.textContent = sequence[index];
                this.countdown.style.display = 'block';
                this.countdown.style.animation = 'none';
                void this.countdown.offsetWidth; // Trigger reflow
                this.countdown.style.animation = 'countPulse 0.5s ease-out';
                
                // Play sound
                if (window.audioManager) {
                    window.audioManager.playSound(index < 3 ? 'countdown' : 'countdown_go');
                }
                
                index++;
                setTimeout(showNext, 1000);
            };
            
            showNext();
        });
    }
    
    // HUD updates
    updatePosition(position) {
        if (!this.positionDisplay) return;
        
        const suffix = Utils.getOrdinalSuffix(position);
        this.positionDisplay.innerHTML = `${position}<span>${suffix}</span>`;
        
        // Color based on position
        const colors = ['#ffd700', '#c0c0c0', '#cd7f32', '#ffffff'];
        this.positionDisplay.style.color = colors[Math.min(position - 1, 3)];
    }
    
    updateLap(current, total) {
        if (!this.lapDisplay) return;
        this.lapDisplay.textContent = `Lap ${current}/${total}`;
        
        // Flash on new lap
        if (current > 1) {
            this.lapDisplay.style.transform = 'scale(1.3)';
            this.lapDisplay.style.color = '#00ff00';
            setTimeout(() => {
                this.lapDisplay.style.transform = 'scale(1)';
                this.lapDisplay.style.color = '#ffd93d';
            }, 500);
        }
    }
    
    updateTimer(timeMs) {
        if (!this.timerDisplay) return;
        this.timerDisplay.textContent = Utils.formatTime(timeMs);
    }
    
    updateItem(item) {
        if (!this.itemDisplay) return;
        
        if (item) {
            this.itemDisplay.textContent = item.emoji;
            this.itemDisplay.style.animation = 'pulse 0.5s ease-in-out';
        } else {
            this.itemDisplay.textContent = '-';
            this.itemDisplay.style.animation = '';
        }
    }
    
    updateSpeed(speed, maxSpeed) {
        if (!this.speedDisplay) return;
        const displaySpeed = Math.floor(speed * 2.5); // Convert to km/h-like display
        this.speedDisplay.textContent = `${displaySpeed} km/h`;
    }
    
    updateBoostMeter(driftLevel, driftTime, boostTime) {
        if (!this.boostFill) return;
        
        let fillPercent = 0;
        let levelClass = '';
        
        if (boostTime > 0) {
            fillPercent = 100;
            levelClass = 'level3';
        } else if (driftTime > 0) {
            // Drift charging
            if (driftTime < 0.5) {
                fillPercent = (driftTime / 0.5) * 33;
                levelClass = '';
            } else if (driftTime < 1.2) {
                fillPercent = 33 + ((driftTime - 0.5) / 0.7) * 33;
                levelClass = 'level1';
            } else if (driftTime < 2.0) {
                fillPercent = 66 + ((driftTime - 1.2) / 0.8) * 34;
                levelClass = 'level2';
            } else {
                fillPercent = 100;
                levelClass = 'level3';
            }
        }
        
        this.boostFill.style.width = `${fillPercent}%`;
        this.boostFill.className = levelClass;
    }
    
    showWrongWay(show) {
        if (!this.wrongWay) return;
        this.wrongWay.style.display = show ? 'block' : 'none';
    }
    
    // Minimap
    updateMinimap(karts, track) {
        if (!this.minimapCtx || !track) return;
        
        const ctx = this.minimapCtx;
        const width = this.minimapCanvas.width;
        const height = this.minimapCanvas.height;
        
        // Clear
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, width, height);
        
        // Calculate bounds
        const padding = 10;
        const scale = this.calculateMinimapScale(track, width - padding * 2, height - padding * 2);
        const offset = this.calculateMinimapOffset(track, width, height, scale);
        
        // Draw track
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        const points = track.trackPoints;
        for (let i = 0; i < points.length; i += 3) {
            const x = (points[i].x * scale) + offset.x;
            const y = (points[i].z * scale) + offset.y;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();
        
        // Draw finish line
        ctx.fillStyle = '#fff';
        const finishX = (0 * scale) + offset.x;
        const finishY = (0 * scale) + offset.y;
        ctx.fillRect(finishX - 2, finishY - 8, 4, 16);
        
        // Draw karts
        karts.forEach((kart, index) => {
            const x = (kart.position.x * scale) + offset.x;
            const y = (kart.position.z * scale) + offset.y;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(-kart.rotation);
            
            // Kart marker
            if (kart.isPlayer) {
                ctx.fillStyle = '#00ff00';
                ctx.beginPath();
                ctx.moveTo(0, -6);
                ctx.lineTo(-4, 4);
                ctx.lineTo(4, 4);
                ctx.closePath();
                ctx.fill();
                
                // Outline
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
            } else {
                ctx.fillStyle = `#${kart.colorData.primary.toString(16).padStart(6, '0')}`;
                ctx.beginPath();
                ctx.arc(0, 0, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        });
    }
    
    calculateMinimapScale(track, maxWidth, maxHeight) {
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        
        track.trackPoints.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minZ = Math.min(minZ, point.z);
            maxZ = Math.max(maxZ, point.z);
        });
        
        const trackWidth = maxX - minX;
        const trackHeight = maxZ - minZ;
        
        return Math.min(maxWidth / trackWidth, maxHeight / trackHeight) * 0.85;
    }
    
    calculateMinimapOffset(track, canvasWidth, canvasHeight, scale) {
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        
        track.trackPoints.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minZ = Math.min(minZ, point.z);
            maxZ = Math.max(maxZ, point.z);
        });
        
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;
        
        return {
            x: canvasWidth / 2 - centerX * scale,
            y: canvasHeight / 2 - centerZ * scale
        };
    }
    
    // Results screen
    buildResultsTable(results) {
        const table = document.getElementById('results-table');
        if (!table) return;
        
        table.innerHTML = '';
        
        results.forEach((racer, index) => {
            const row = document.createElement('div');
            row.className = 'results-row' + (racer.isPlayer ? ' player' : '');
            
            const posColors = ['🥇', '🥈', '🥉', ''];
            const posIcon = posColors[Math.min(index, 3)];
            
            row.innerHTML = `
                <span class="results-position">${posIcon || (index + 1)}</span>
                <span class="results-name">${racer.name}</span>
                <span class="results-time">${Utils.formatTime(racer.time)}</span>
            `;
            
            table.appendChild(row);
        });
    }
    
    // Final lap notification
    showFinalLap() {
        // Create temporary overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 72px;
            font-weight: bold;
            color: #ff0000;
            text-shadow: 0 0 20px #ff0000, 4px 4px 0 #000;
            z-index: 200;
            animation: countPulse 0.5s ease-out;
        `;
        overlay.textContent = 'FINAL LAP!';
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.remove();
        }, 2000);
    }
}

window.UIManager = UIManager;
