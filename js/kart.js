// Kart class - handles player and AI karts

class Kart {
    constructor(scene, colorIndex, isPlayer = false, name = 'Racer') {
        this.scene = scene;
        this.isPlayer = isPlayer;
        this.name = name;
        this.colorData = KartColors[colorIndex % KartColors.length];
        
        // Physics properties - アップグレード版
        this.position = new THREE.Vector3(0, 0.5, 0);
        this.lastValidPosition = new THREE.Vector3(0, 0.5, 0);  // 最後の有効な位置を保存
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = 0; // Y-axis rotation (heading)
        this.angularVelocity = 0;
        
        // 改善された移動ステータス - アーケードスタイル
        this.maxSpeed = 100;          // 最高速度
        this.acceleration = 65;       // 加速力（大幅アップ）
        this.deceleration = 12;       // 自然減速（緩やか）
        this.brakeStrength = 80;      // ブレーキ強化
        this.turnSpeed = 3.5;         // 旋回速度アップ
        this.friction = 0.988;        // 摩擦（滑りやすく）
        this.grassFriction = 0.96;    // 芝でのペナルティ（適度に緩和）
        
        // アーケード物理プロパティ
        this.grip = 1.0;              // タイヤグリップ
        this.steeringResponse = 0.2;  // ステアリングのレスポンス（速く）
        this.targetRotation = 0;      // 目標方向（スムーズな旋回用）
        this.lateralVelocity = 0;     // 横方向の速度（ドリフト用）
        this.enginePower = 0;         // エンジン出力（スムーズな加速用）
        this.driftGrip = 0.7;         // ドリフト時のグリップ
        this.driftAngle = 0;          // ドリフト角度
        
        // Current state
        this.speed = 0;
        this.currentTurnAmount = 0;
        this.onGrass = false;
        this.isColliding = false;
        
        // Drift system
        this.isDrifting = false;
        this.driftDirection = 0; // -1 left, 1 right
        this.driftTime = 0;
        this.driftLevel = 0; // 0, 1, 2, 3 (blue, orange, purple)
        this.driftBoostReady = false;
        
        // Boost system
        this.boostTime = 0;
        this.boostMultiplier = 1;
        this.tripleBoostCharges = 0;
        
        // Item system
        this.currentItem = null;
        this.hasShield = false;
        this.shieldTimer = 0;  // シールドの残り時間
        this.isShrunken = false;
        this.shrinkTimer = 0;
        this.isFrozen = false;
        this.freezeTimer = 0;
        this.isSpunOut = false;
        this.spinOutTimer = 0;
        this.invincibilityTimer = 0;
        
        // Race state
        this.lap = 0;
        this.checkpoint = 0;
        this.lastCheckpoint = -1;
        this.racePosition = 1;
        this.finished = false;
        this.finishTime = 0;
        this.totalProgress = 0;
        this.wrongWay = false;
        
        // Input state (for player)
        this.input = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            drift: false,
            item: false
        };
        
        // Create 3D model
        this.mesh = this.createKartMesh();
        this.scene.add(this.mesh);
        
        // Collision box
        this.collisionRadius = 2;
        this.collisionBox = new THREE.Box3();
    }
    
    createKartMesh() {
        const group = new THREE.Group();
        
        // Get textures
        const carbonTexture = window.textureManager ? window.textureManager.getTexture('carbon') : null;
        const metalTexture = window.textureManager ? window.textureManager.getTexture('metal') : null;
        const tireTexture = window.textureManager ? window.textureManager.getTexture('tire') : null;
        
        // === KART BODY (Go-kart style like Mario Kart) ===
        
        // Main chassis - curved front
        const chassisShape = new THREE.Shape();
        chassisShape.moveTo(-1.2, -2);
        chassisShape.lineTo(1.2, -2);
        chassisShape.lineTo(1.4, -1);
        chassisShape.lineTo(1.3, 1.5);
        chassisShape.lineTo(0.8, 2.2);
        chassisShape.lineTo(-0.8, 2.2);
        chassisShape.lineTo(-1.3, 1.5);
        chassisShape.lineTo(-1.4, -1);
        chassisShape.closePath();
        
        const extrudeSettings = { depth: 0.6, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 };
        const chassisGeometry = new THREE.ExtrudeGeometry(chassisShape, extrudeSettings);
        chassisGeometry.rotateX(-Math.PI / 2);
        
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.colorData.primary,
            metalness: 0.7,
            roughness: 0.3,
            envMapIntensity: 1.5
        });
        const chassis = new THREE.Mesh(chassisGeometry, bodyMaterial);
        chassis.position.y = 0.3;
        chassis.castShadow = true;
        chassis.receiveShadow = true;
        group.add(chassis);
        
        // Engine block (back) with carbon fiber texture
        const engineGeometry = new THREE.BoxGeometry(1.8, 0.7, 1.2);
        const engineMaterial = new THREE.MeshStandardMaterial({
            map: carbonTexture,
            color: 0x333333,
            metalness: 0.6,
            roughness: 0.4
        });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.set(0, 0.8, -1.4);
        engine.castShadow = true;
        group.add(engine);
        
        // Engine details - cylinders with metallic look
        const chromeMaterial = new THREE.MeshStandardMaterial({ 
            map: metalTexture,
            color: 0x888888, 
            metalness: 0.95, 
            roughness: 0.1 
        });
        for (let i = -1; i <= 1; i += 2) {
            const cylinderGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 12);
            const cylinder = new THREE.Mesh(cylinderGeo, chromeMaterial);
            cylinder.position.set(i * 0.5, 1.15, -1.4);
            group.add(cylinder);
        }
        
        // Seat
        const seatGeometry = new THREE.BoxGeometry(1.4, 0.3, 1.2);
        const seatMaterial = new THREE.MeshStandardMaterial({
            color: this.colorData.secondary,
            roughness: 0.8
        });
        const seat = new THREE.Mesh(seatGeometry, seatMaterial);
        seat.position.set(0, 0.8, -0.3);
        seat.castShadow = true;
        group.add(seat);
        
        // Seat back
        const seatBackGeo = new THREE.BoxGeometry(1.4, 0.8, 0.2);
        const seatBack = new THREE.Mesh(seatBackGeo, seatMaterial);
        seatBack.position.set(0, 1.1, -0.85);
        seatBack.rotation.x = -0.2;
        group.add(seatBack);
        
        // === CHARACTER (Mario-style proportions) ===
        const characterGroup = new THREE.Group();
        characterGroup.position.set(0, 0, -0.2);
        
        // Body/torso
        const torsoGeo = new THREE.CylinderGeometry(0.45, 0.5, 0.9, 12);
        const shirtMaterial = new THREE.MeshStandardMaterial({ 
            color: this.colorData.accent,
            roughness: 0.8
        });
        const torso = new THREE.Mesh(torsoGeo, shirtMaterial);
        torso.position.y = 1.4;
        torso.castShadow = true;
        characterGroup.add(torso);
        
        // Head (large, cartoon style)
        const headGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const skinMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffe0bd,
            roughness: 0.8
        });
        const head = new THREE.Mesh(headGeo, skinMaterial);
        head.position.y = 2.2;
        head.scale.set(1, 1.1, 1);
        head.castShadow = true;
        characterGroup.add(head);
        
        // Cap/hat
        const capGeo = new THREE.SphereGeometry(0.52, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const capMaterial = new THREE.MeshStandardMaterial({ 
            color: this.colorData.primary,
            roughness: 0.6
        });
        const cap = new THREE.Mesh(capGeo, capMaterial);
        cap.position.y = 2.35;
        cap.castShadow = true;
        characterGroup.add(cap);
        
        // Cap brim
        const brimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.08, 16, 1, false, -Math.PI/3, Math.PI * 1.1);
        const brim = new THREE.Mesh(brimGeo, capMaterial);
        brim.position.set(0, 2.2, 0.25);
        brim.rotation.x = Math.PI / 10;
        characterGroup.add(brim);
        
        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
        
        [-0.18, 0.18].forEach(x => {
            const eye = new THREE.Mesh(eyeGeo, eyeWhite);
            eye.position.set(x, 2.25, 0.4);
            characterGroup.add(eye);
            
            const pupil = new THREE.Mesh(pupilGeo, pupilMat);
            pupil.position.set(x, 2.25, 0.5);
            characterGroup.add(pupil);
        });
        
        // Nose (big round nose like Mario)
        const noseGeo = new THREE.SphereGeometry(0.15, 12, 12);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.8 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, 2.1, 0.48);
        nose.scale.set(1.2, 0.9, 1);
        characterGroup.add(nose);
        
        // Mustache (if player or random)
        if (this.isPlayer || Math.random() > 0.5) {
            const mustacheGeo = new THREE.TorusGeometry(0.2, 0.06, 8, 12, Math.PI);
            const mustacheMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
            const mustache = new THREE.Mesh(mustacheGeo, mustacheMat);
            mustache.position.set(0, 2.0, 0.42);
            mustache.rotation.x = Math.PI / 2;
            mustache.rotation.z = Math.PI;
            mustache.scale.set(1.3, 1, 1);
            characterGroup.add(mustache);
        }
        
        // Arms
        const armGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.6, 8);
        const armMat = new THREE.MeshStandardMaterial({ color: this.colorData.accent, roughness: 0.8 });
        
        [-0.55, 0.55].forEach((x, i) => {
            const arm = new THREE.Mesh(armGeo, armMat);
            arm.position.set(x, 1.3, 0.2);
            arm.rotation.x = -Math.PI / 4;
            arm.rotation.z = x > 0 ? -0.3 : 0.3;
            arm.castShadow = true;
            characterGroup.add(arm);
            
            // Gloved hands
            const handGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const gloveMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
            const hand = new THREE.Mesh(handGeo, gloveMat);
            hand.position.set(x * 0.9, 1.05, 0.55);
            characterGroup.add(hand);
        });
        
        group.add(characterGroup);
        
        // === STEERING WHEEL ===
        const wheelRingGeo = new THREE.TorusGeometry(0.35, 0.04, 8, 24);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
        const steeringWheel = new THREE.Mesh(wheelRingGeo, wheelMat);
        steeringWheel.position.set(0, 1.1, 0.8);
        steeringWheel.rotation.x = Math.PI / 3;
        group.add(steeringWheel);
        
        // Steering column
        const columnGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
        const column = new THREE.Mesh(columnGeo, wheelMat);
        column.position.set(0, 0.85, 0.65);
        column.rotation.x = Math.PI / 6;
        group.add(column);
        
        // === WHEELS (Chunky kart wheels) ===
        this.wheels = [];
        
        const wheelPositions = [
            { x: -1.5, y: 0.4, z: 1.4, scale: 1 },
            { x: 1.5, y: 0.4, z: 1.4, scale: 1 },
            { x: -1.5, y: 0.5, z: -1.4, scale: 1.2 },
            { x: 1.5, y: 0.5, z: -1.4, scale: 1.2 }
        ];
        
        wheelPositions.forEach((pos, i) => {
            const wheelGroup = new THREE.Group();
            
            // Tire with texture
            const tireGeo = new THREE.CylinderGeometry(0.55 * pos.scale, 0.55 * pos.scale, 0.5, 24);
            const tireMat = new THREE.MeshStandardMaterial({ 
                map: tireTexture,
                color: 0x1a1a1a, 
                roughness: 0.95,
                metalness: 0
            });
            const tire = new THREE.Mesh(tireGeo, tireMat);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wheelGroup.add(tire);
            
            // Rim with metallic finish
            const rimGeo = new THREE.CylinderGeometry(0.35 * pos.scale, 0.35 * pos.scale, 0.52, 16);
            const rimMat = new THREE.MeshStandardMaterial({ 
                map: metalTexture,
                color: 0xdddddd, 
                metalness: 0.9, 
                roughness: 0.1 
            });
            const rim = new THREE.Mesh(rimGeo, rimMat);
            rim.rotation.z = Math.PI / 2;
            wheelGroup.add(rim);
            
            // Hubcap with team color
            const hubGeo = new THREE.CircleGeometry(0.25 * pos.scale, 8);
            const hubMat = new THREE.MeshStandardMaterial({ 
                color: this.colorData.primary, 
                metalness: 0.7,
                roughness: 0.2
            });
            const hubLeft = new THREE.Mesh(hubGeo, hubMat);
            hubLeft.position.x = -0.27;
            hubLeft.rotation.y = Math.PI / 2;
            wheelGroup.add(hubLeft);
            
            const hubRight = new THREE.Mesh(hubGeo, hubMat);
            hubRight.position.x = 0.27;
            hubRight.rotation.y = -Math.PI / 2;
            wheelGroup.add(hubRight);
            
            wheelGroup.position.set(pos.x, pos.y, pos.z);
            group.add(wheelGroup);
            this.wheels.push(wheelGroup);
        });
        
        // === EXHAUST PIPES (chrome style) ===
        const exhaustMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            metalness: 0.9,
            roughness: 0.1
        });
        
        [-0.5, 0.5].forEach(x => {
            const pipeGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.8, 12);
            const pipe = new THREE.Mesh(pipeGeo, exhaustMaterial);
            pipe.rotation.x = Math.PI / 2 + 0.3;
            pipe.position.set(x, 0.6, -2.2);
            group.add(pipe);
        });
        
        // === FRONT SPOILER ===
        const spoilerFrontGeo = new THREE.BoxGeometry(2.6, 0.15, 0.4);
        const spoilerMat = new THREE.MeshStandardMaterial({ 
            color: this.colorData.accent,
            roughness: 0.5 
        });
        const spoilerFront = new THREE.Mesh(spoilerFrontGeo, spoilerMat);
        spoilerFront.position.set(0, 0.25, 2.1);
        group.add(spoilerFront);
        
        // === REAR WING ===
        const wingGroup = new THREE.Group();
        
        // Wing supports
        [-0.8, 0.8].forEach(x => {
            const supportGeo = new THREE.BoxGeometry(0.08, 0.5, 0.08);
            const support = new THREE.Mesh(supportGeo, spoilerMat);
            support.position.set(x, 0.25, 0);
            wingGroup.add(support);
        });
        
        // Wing blade
        const wingGeo = new THREE.BoxGeometry(2, 0.1, 0.5);
        const wing = new THREE.Mesh(wingGeo, spoilerMat);
        wing.position.y = 0.55;
        wing.rotation.x = -0.2;
        wing.castShadow = true;
        wingGroup.add(wing);
        
        wingGroup.position.set(0, 1.0, -1.9);
        group.add(wingGroup);
        
        // === SHIELD EFFECT (invisible by default) ===
        const shieldGeometry = new THREE.SphereGeometry(2.8, 24, 24);
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            wireframe: true
        });
        this.shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
        this.shieldMesh.position.y = 1.2;
        group.add(this.shieldMesh);
        
        return group;
    }
    
    setPosition(x, y, z, rotation = 0) {
        this.position.set(x, y, z);
        this.lastValidPosition.copy(this.position);  // 有効な位置として保存
        this.rotation = rotation;
        this.updateMeshPosition();
    }
    
    updateMeshPosition() {
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
        
        // Apply shrink effect
        const scale = this.isShrunken ? 0.5 : 1;
        this.mesh.scale.set(scale, scale, scale);
    }
    
    update(deltaTime, track) {
        if (this.finished) {
            // Slow to stop after finishing
            this.speed *= 0.95;
            this.updatePhysics(deltaTime, track);
            return;
        }
        
        // Update timers
        this.updateTimers(deltaTime);
        
        if (this.isSpunOut) {
            this.handleSpinOut(deltaTime);
            this.updateMeshPosition();
            return;
        }
        
        if (this.isFrozen) {
            // Can't move while frozen
            this.speed *= 0.95;
            this.updateMeshPosition();
            return;
        }
        
        // Handle input for BOTH player and AI
        // (AI sets input via AIController before this is called)
        this.handleInput(deltaTime, track);
        
        // Update physics
        this.updatePhysics(deltaTime, track);
        
        // Update drift
        this.updateDrift(deltaTime);
        
        // Update boost
        this.updateBoost(deltaTime);
        
        // Rotate wheels
        this.updateWheels(deltaTime);
        
        // Update collision box
        this.updateCollisionBox();
        
        // Check for track features
        this.checkTrackFeatures(track);
        
        // Update race progress
        this.updateRaceProgress(track);
        
        // Update shield visual
        if (this.hasShield) {
            this.shieldMesh.rotation.y += deltaTime * 2;
            this.shieldMesh.material.opacity = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
        }
    }
    
    updateTimers(deltaTime) {
        if (this.shrinkTimer > 0) {
            this.shrinkTimer -= deltaTime;
            if (this.shrinkTimer <= 0) {
                this.isShrunken = false;
            }
        }
        
        if (this.freezeTimer > 0) {
            this.freezeTimer -= deltaTime;
            if (this.freezeTimer <= 0) {
                this.isFrozen = false;
            }
        }
        
        if (this.spinOutTimer > 0) {
            this.spinOutTimer -= deltaTime;
            if (this.spinOutTimer <= 0) {
                this.isSpunOut = false;
            }
        }
        
        if (this.invincibilityTimer > 0) {
            this.invincibilityTimer -= deltaTime;
        }
        
        // シールドのタイマー（スターと同じ8秒間）
        if (this.shieldTimer > 0) {
            this.shieldTimer -= deltaTime;
            if (this.shieldTimer <= 0) {
                this.hasShield = false;
                this.shieldMesh.material.opacity = 0;
            }
        }
    }
    
    handleInput(deltaTime, track) {
        const input = this.input;
        
        // === エンジンパワーシステム（アーケード風即応性） ===
        const maxSpd = this.getEffectiveMaxSpeed();
        
        if (input.forward) {
            // 素早いエンジンレスポンス
            this.enginePower = Utils.lerp(this.enginePower, 1.0, 0.15);
        } else if (input.backward) {
            if (this.speed > 5) {
                // 強力なブレーキ
                this.enginePower = Utils.lerp(this.enginePower, -1.0, 0.2);
            } else {
                // バック
                this.enginePower = Utils.lerp(this.enginePower, -0.5, 0.1);
            }
        } else {
            // 緩やかなエンジンブレーキ
            this.enginePower = Utils.lerp(this.enginePower, 0, 0.08);
        }
        
        // エンジンパワーを速度に変換
        if (this.enginePower > 0) {
            // 加速カーブ - 低速で強く、高速で緩やか
            const accelerationCurve = Math.pow(1 - (this.speed / maxSpd), 0.7);
            this.speed += this.acceleration * this.enginePower * accelerationCurve * deltaTime;
            this.speed = Math.min(this.speed, maxSpd);
        } else if (this.enginePower < 0) {
            if (this.speed > 0) {
                // ブレーキ
                this.speed += this.brakeStrength * this.enginePower * deltaTime;
                this.speed = Math.max(0, this.speed);
            } else {
                // バック
                this.speed += this.acceleration * 0.5 * this.enginePower * deltaTime;
                this.speed = Math.max(-maxSpd * 0.4, this.speed);
            }
        } else {
            // 自然減速
            if (this.speed > 0) {
                this.speed = Math.max(0, this.speed - this.deceleration * deltaTime);
            } else if (this.speed < 0) {
                this.speed = Math.min(0, this.speed + this.deceleration * deltaTime);
            }
        }
        
        // === ドリフトシステム（改良版） ===
        const speedRatio = Math.abs(this.speed) / maxSpd;
        const minDriftSpeed = 10;  // より低速でもドリフト可能
        
        // ドリフト開始判定
        if (input.drift && Math.abs(this.speed) > minDriftSpeed) {
            if (!this.isDrifting) {
                // ドリフト開始 - 左右のキーがなくても現在の旋回方向でドリフト
                if (input.left) {
                    this.startDrift(-1);
                } else if (input.right) {
                    this.startDrift(1);
                } else if (this.currentTurnAmount < -0.2) {
                    this.startDrift(-1);
                } else if (this.currentTurnAmount > 0.2) {
                    this.startDrift(1);
                }
            }
        } else if (this.isDrifting && !input.drift) {
            this.endDrift();
        }
        
        // === 旋回処理 ===
        // 速度に応じた旋回能力
        const turnAbility = 0.4 + speedRatio * 0.6;  // 低速でも十分曲がれる
        const highSpeedPenalty = speedRatio > 0.8 ? (1 - (speedRatio - 0.8) * 0.3) : 1;
        
        if (this.isDrifting) {
            // === ドリフト中の操作 ===
            const driftIntensity = 1.0 + this.driftLevel * 0.15;
            
            // ベースのドリフト旋回
            const baseDriftTurn = this.driftDirection * this.turnSpeed * 1.4 * driftIntensity;
            
            // ステアリング入力で微調整
            let steerAdjust = 0;
            if (input.left) {
                steerAdjust = this.turnSpeed * 0.6;  // 左に追加旋回
            } else if (input.right) {
                steerAdjust = -this.turnSpeed * 0.6; // 右に追加旋回
            }
            
            this.targetRotation = baseDriftTurn + steerAdjust;
            
            // ドリフト角度を更新（視覚用）
            this.driftAngle = Utils.lerp(this.driftAngle, this.driftDirection * 25, 0.1);
            
            // 横滑り（スピードに応じて）
            const driftSlide = this.driftDirection * this.speed * 0.25 * this.driftGrip;
            this.lateralVelocity = Utils.lerp(this.lateralVelocity, driftSlide, 0.12);
            
            // 旋回量を更新
            this.currentTurnAmount = Utils.lerp(this.currentTurnAmount, -this.driftDirection, 0.15);
            
        } else {
            // === 通常走行 ===
            this.driftAngle = Utils.lerp(this.driftAngle, 0, 0.15);
            this.lateralVelocity = Utils.lerp(this.lateralVelocity, 0, 0.2);  // 横滑りを素早く減衰
            
            if (input.left) {
                this.targetRotation = this.turnSpeed * turnAbility * highSpeedPenalty;
                this.currentTurnAmount = Utils.lerp(this.currentTurnAmount, -1, this.steeringResponse);
            } else if (input.right) {
                this.targetRotation = -this.turnSpeed * turnAbility * highSpeedPenalty;
                this.currentTurnAmount = Utils.lerp(this.currentTurnAmount, 1, this.steeringResponse);
            } else {
                this.targetRotation = 0;
                this.currentTurnAmount = Utils.lerp(this.currentTurnAmount, 0, this.steeringResponse * 2);
            }
        }
        
        // 旋回を適用
        this.rotation += this.targetRotation * deltaTime;
    }
    
    updatePhysics(deltaTime, track) {
        // === 地形判定 ===
        this.onGrass = track.isOnGrass(this.position.x, this.position.z);
        
        // 芝でのペナルティ（プレイヤーのみ適用、AIは無視）
        let terrainGrip = 1.0;
        if (this.onGrass && this.isPlayer) {
            this.speed *= Math.pow(this.grassFriction, deltaTime * 20);  // ペナルティ緩和
            terrainGrip = 0.75;  // グリップやや低下
            // 最高速度制限を緩和
            if (!this.isDrifting) {
                this.speed = Math.min(this.speed, this.maxSpeed * 0.75);
            }
        }
        
        // === 速度ベクトル計算 ===
        const forwardDir = new THREE.Vector3(
            Math.sin(this.rotation),
            0,
            Math.cos(this.rotation)
        );
        
        // 横方向（ドリフト・横滑り用）
        const lateralDir = new THREE.Vector3(
            Math.cos(this.rotation),
            0,
            -Math.sin(this.rotation)
        );
        
        // 前方速度
        this.velocity.copy(forwardDir).multiplyScalar(this.speed * deltaTime);
        
        // 横滑りを追加
        if (Math.abs(this.lateralVelocity) > 0.5) {
            const lateralMove = lateralDir.clone().multiplyScalar(this.lateralVelocity * deltaTime * terrainGrip);
            this.velocity.add(lateralMove);
        }
        
        // === 1フレームの移動距離を制限（暴走防止） ===
        const maxMovePerFrame = 8;  // 1フレームで最大8単位まで
        const moveDistance = this.velocity.length();
        if (moveDistance > maxMovePerFrame) {
            this.velocity.normalize().multiplyScalar(maxMovePerFrame);
            console.log('移動距離制限発動:', moveDistance.toFixed(2), '->', maxMovePerFrame);
        }
        
        // 位置更新
        this.position.add(this.velocity);
        
        // NaNチェック - 位置が不正になったら最後の有効な位置に戻す
        if (isNaN(this.position.x) || isNaN(this.position.z) || isNaN(this.position.y)) {
            console.error('Position became NaN, restoring to last valid position');
            this.position.copy(this.lastValidPosition);
            this.speed = 0;
            this.velocity.set(0, 0, 0);
            return;
        }
        
        // === 極端なコース外チェック（暴走防止） ===
        const maxDistance = 500;  // コース中心からの最大許容距離
        const distFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
        if (distFromCenter > maxDistance) {
            console.warn('コース外に大きく逸脱、最後の有効な位置に戻す:', distFromCenter.toFixed(2));
            this.position.copy(this.lastValidPosition);
            this.speed *= 0.5;  // 速度を半減
            this.velocity.set(0, 0, 0);
            // 方向をコース中心に向ける
            this.rotation = Math.atan2(-this.position.x, -this.position.z);
            return;
        }
        
        // === 地形高さ追従 ===
        const targetY = track.getHeightAt(this.position.x, this.position.z) + 1.0;
        if (!isNaN(targetY)) {
            this.position.y = Utils.lerp(this.position.y, targetY, 0.4);  // 素早く追従
        }
        
        // 位置が有効なら保存
        this.lastValidPosition.copy(this.position);
        
        // === 摩擦適用 ===
        // AIカートはコース外でもコース内と同じ摩擦係数を使用
        const currentFriction = (this.onGrass && this.isPlayer) ? this.grassFriction : this.friction;
        this.speed *= currentFriction;
        
        // === メッシュ更新 ===
        this.updateMeshPosition();
        
        // カートの傾き
        if (!this.isSpunOut) {
            // ロール（左右の傾き）
            const tiltAmount = this.isDrifting ? 0.22 : 0.12;
            const targetTilt = this.currentTurnAmount * tiltAmount;
            this.mesh.rotation.z = Utils.lerp(this.mesh.rotation.z, targetTilt, 0.2);
            
            // ピッチ（前後の傾き）- 加速/ブレーキで傾く
            const pitchAmount = -this.enginePower * 0.04;
            this.mesh.rotation.x = Utils.lerp(this.mesh.rotation.x || 0, pitchAmount, 0.15);
        }
    }
    
    startDrift(direction) {
        if (this.isDrifting) return;
        
        this.isDrifting = true;
        this.driftDirection = direction;
        this.driftTime = 0;
        this.driftLevel = 0;
        
        if (window.audioManager) {
            window.audioManager.startDriftSound();
        }
    }
    
    updateDrift(deltaTime) {
        if (!this.isDrifting) return;
        
        this.driftTime += deltaTime;
        
        // Drift levels: Blue (0.5s), Orange (1.2s), Purple (2s)
        if (this.driftTime >= 2.0 && this.driftLevel < 3) {
            this.driftLevel = 3;
        } else if (this.driftTime >= 1.2 && this.driftLevel < 2) {
            this.driftLevel = 2;
        } else if (this.driftTime >= 0.5 && this.driftLevel < 1) {
            this.driftLevel = 1;
        }
    }
    
    endDrift() {
        if (!this.isDrifting) return;
        
        if (window.audioManager) {
            window.audioManager.stopDriftSound();
        }
        
        // Apply boost based on drift level
        if (this.driftLevel >= 1) {
            const boostDurations = [0, 0.5, 1.0, 1.5];
            const boostMultipliers = [1, 1.3, 1.5, 1.8];
            
            this.applyBoost(boostDurations[this.driftLevel], boostMultipliers[this.driftLevel]);
            
            if (window.audioManager) {
                window.audioManager.playSound(this.driftLevel >= 2 ? 'boost_big' : 'boost');
            }
        }
        
        this.isDrifting = false;
        this.driftDirection = 0;
        this.driftTime = 0;
        this.driftLevel = 0;
    }
    
    applyBoost(duration, multiplier) {
        // ブースト倍率の上限を設定（制御不能防止）
        const cappedMultiplier = Math.min(multiplier, 1.5);
        this.boostTime = Math.max(this.boostTime, duration);
        this.boostMultiplier = Math.max(this.boostMultiplier, cappedMultiplier);
    }
    
    updateBoost(deltaTime) {
        if (this.boostTime > 0) {
            this.boostTime -= deltaTime;
            
            // Apply boost to speed - 微速度を制限して制御可能に
            const maxBoostedSpeed = this.maxSpeed * this.boostMultiplier;
            const speedCap = this.maxSpeed * 1.4;  // 最大で1.4倍まで
            const effectiveMax = Math.min(maxBoostedSpeed, speedCap);
            
            if (this.speed < effectiveMax && this.input.forward) {
                // 加速を緩やかにして急加速を防止
                this.speed = Math.min(this.speed + this.acceleration * 1.5 * deltaTime, effectiveMax);
            }
            
            if (this.boostTime <= 0) {
                this.boostMultiplier = 1;
            }
        }
    }
    
    getEffectiveMaxSpeed() {
        let max = this.maxSpeed;
        
        if (this.boostTime > 0) {
            max *= this.boostMultiplier;
        }
        
        if (this.isShrunken) {
            max *= 0.7;
        }
        
        // 絶対的な速度上限（制御不能防止）- より厳格に
        const absoluteMax = this.maxSpeed * 1.3;  // 1.5 -> 1.3 に削減
        return Math.min(max, absoluteMax);
    }
    
    updateWheels(deltaTime) {
        const wheelRotation = this.speed * deltaTime * 0.3;
        
        this.wheels.forEach((wheelGroup, i) => {
            // Rotate the tire inside the wheel group
            if (wheelGroup.children[0]) {
                wheelGroup.children[0].rotation.y += wheelRotation;
            }
            
            // Front wheels turn with steering
            if (i < 2) {
                wheelGroup.rotation.y = Utils.lerp(
                    wheelGroup.rotation.y,
                    this.currentTurnAmount * 0.4,
                    0.15
                );
            }
        });
    }
    
    updateCollisionBox() {
        const halfSize = new THREE.Vector3(1.5, 1, 2.5);
        this.collisionBox.setFromCenterAndSize(this.position, halfSize.multiplyScalar(2));
    }
    
    checkTrackFeatures(track) {
        // ブーストパッドは無効化済み
        
        // Check item boxes
        track.itemBoxes.forEach(itemBox => {
            if (!itemBox.active) return;
            
            const dist = Utils.distance2D(
                this.position.x, this.position.z,
                itemBox.position.x, itemBox.position.z
            );
            
            if (dist < itemBox.radius && !this.currentItem) {
                this.collectItem(itemBox);
            }
        });
        
        // Check barriers collision
        this.checkBarrierCollision(track);
    }
    
    checkBarrierCollision(track) {
        if (!track.barriers || track.barriers.length === 0) return;
        
        const kartRadius = 3;
        
        for (const barrier of track.barriers) {
            const dist = Utils.distance2D(
                this.position.x, this.position.z,
                barrier.x, barrier.z
            );
            
            const collisionDist = kartRadius + barrier.radius;
            
            if (dist < collisionDist) {
                // 衝突！押し戻す
                const pushDirection = {
                    x: this.position.x - barrier.x,
                    z: this.position.z - barrier.z
                };
                
                const len = Math.sqrt(pushDirection.x * pushDirection.x + pushDirection.z * pushDirection.z);
                if (len > 0.01) {
                    pushDirection.x /= len;
                    pushDirection.z /= len;
                    
                    // カートを押し戻す
                    const pushDist = collisionDist - dist + 0.5;
                    this.position.x += pushDirection.x * pushDist;
                    this.position.z += pushDirection.z * pushDist;
                    
                    // 速度を大幅に減速
                    this.speed *= 0.3;
                    
                    // バウンス効果
                    if (this.velocity) {
                        this.velocity.x = pushDirection.x * Math.abs(this.speed) * 0.3;
                        this.velocity.z = pushDirection.z * Math.abs(this.speed) * 0.3;
                    }
                }
            }
        }
        
        // フェンス（カーブのショートカット防止）との衝突判定
        const fenceLines = [
            // 第1コーナー内側
            [{x: 160, z: -160}, {x: 190, z: -120}, {x: 200, z: -60}],
            // 第2コーナー内側
            [{x: 170, z: 120}, {x: 130, z: 150}, {x: 80, z: 160}],
            // S字カーブ内側
            [{x: 40, z: 140}, {x: -20, z: 170}, {x: -80, z: 190}],
            // 第3コーナー内側
            [{x: -170, z: 170}, {x: -190, z: 120}, {x: -190, z: 60}],
            // 最終コーナー内側
            [{x: -150, z: -100}, {x: -120, z: -140}, {x: -80, z: -165}],
        ];
        
        const fenceRadius = 5;
        fenceLines.forEach(points => {
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];
                
                // 線分とカートの距離を計算
                const dist = this.pointToLineDistance(
                    this.position.x, this.position.z,
                    p1.x, p1.z, p2.x, p2.z
                );
                
                if (dist < fenceRadius) {
                    // フェンスに衝突 - 押し戻す
                    const midX = (p1.x + p2.x) / 2;
                    const midZ = (p1.z + p2.z) / 2;
                    const pushDirection = {
                        x: this.position.x - midX,
                        z: this.position.z - midZ
                    };
                    
                    const len = Math.sqrt(pushDirection.x * pushDirection.x + pushDirection.z * pushDirection.z);
                    if (len > 0.01) {
                        pushDirection.x /= len;
                        pushDirection.z /= len;
                        
                        const pushDist = fenceRadius - dist + 1;
                        this.position.x += pushDirection.x * pushDist;
                        this.position.z += pushDirection.z * pushDist;
                        
                        this.speed *= 0.5;
                    }
                }
            }
        });
    }
    
    // 点と線分の距離を計算
    pointToLineDistance(px, pz, x1, z1, x2, z2) {
        const A = px - x1;
        const B = pz - z1;
        const C = x2 - x1;
        const D = z2 - z1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, zz;
        if (param < 0) {
            xx = x1;
            zz = z1;
        } else if (param > 1) {
            xx = x2;
            zz = z2;
        } else {
            xx = x1 + param * C;
            zz = z1 + param * D;
        }
        
        const dx = px - xx;
        const dz = pz - zz;
        return Math.sqrt(dx * dx + dz * dz);
    }
    
    collectItem(itemBox) {
        try {
            itemBox.active = false;
            itemBox.mesh.visible = false;
            itemBox.respawnTime = 5; // Respawn after 5 seconds
            
            // Get random item based on position
            if (typeof getRandomItem === 'function') {
                this.currentItem = getRandomItem(this.racePosition);
            } else if (typeof window.getRandomItem === 'function') {
                this.currentItem = window.getRandomItem(this.racePosition);
            } else {
                console.error('getRandomItem function not found');
                return;
            }
            
            if (window.audioManager) {
                window.audioManager.playSound('item_get');
            }
        } catch (e) {
            console.error('Error in collectItem:', e);
        }
    }
    
    useItem(game) {
        if (!this.currentItem) return;

        const item = this.currentItem;
        console.log('[DEBUG] useItem called. currentItem.id:', item.id, 'emoji:', item.emoji);
        this.currentItem = null;
        if (window.audioManager) {
            window.audioManager.playSound('item_use');
        }
        // Item effects handled by game's item manager
        if (game && game.itemManager) {
            game.itemManager.useItem(this, item);
        }
    }
    
    updateRaceProgress(track) {
        // Calculate total progress (lap + checkpoint progress)
        const trackProgress = track.getTrackProgress(this.position.x, this.position.z);
        
        // Check for wrong way
        const trackDirection = track.getTrackDirection(this.position.x, this.position.z);
        const angleDiff = Utils.normalizeAngle(this.rotation - trackDirection);
        this.wrongWay = Math.abs(angleDiff) > Math.PI / 2 && this.speed > 10;
        
        // Update checkpoint
        const numCheckpoints = track.checkpoints.length;
        const newCheckpoint = Math.floor(trackProgress * numCheckpoints);
        
        // Lap detection - フィニッシュライン（X=0, Z=-200付近）を東向きに通過
        const finishZ = -200;
        const nearFinishLine = Math.abs(this.position.z - finishZ) < 25;
        
        // 前回位置と現在位置でフィニッシュラインを通過したか（X軸方向）
        if (nearFinishLine && !this.wrongWay) {
            // X座標が負から正に変わった = 東向きに通過
            if (this.lastX !== undefined && this.lastX < 0 && this.position.x >= 0) {
                // チェックポイントを十分通過しているか確認（ショートカット防止）
                if (this.lastCheckpoint >= numCheckpoints - 3 || this.lastCheckpoint <= 1) {
                    this.lap++;
                    this.lastCheckpoint = 0;
                    
                    if (window.audioManager) {
                        window.audioManager.playSound('lap_complete');
                    }
                }
            }
        }
        
        this.lastX = this.position.x;
        
        // Update last checkpoint (prevent going backwards)
        if (newCheckpoint > this.lastCheckpoint || 
            (this.lastCheckpoint > numCheckpoints - 2 && newCheckpoint <= 1)) {
            this.lastCheckpoint = newCheckpoint;
        }
        
        this.checkpoint = newCheckpoint;
        this.totalProgress = this.lap + trackProgress;
    }
    
    handleSpinOut(deltaTime) {
        // Spin the kart
        this.rotation += 15 * deltaTime;
        this.speed *= 0.95;
        
        this.updateMeshPosition();
        this.mesh.rotation.z = Math.sin(this.spinOutTimer * 10) * 0.3;
        
        // スピンアウト終了時に元の向きに戻す
        if (this.spinOutTimer <= 0.1) {
            this.rotation = this.preSpinRotation;
            this.mesh.rotation.z = 0;
            this.updateMeshPosition();
        }
    }
    
    spinOut() {
        console.log('spinOut呼び出し:', this.isPlayer ? 'プレイヤー' : 'AI', 
            'invincibility:', this.invincibilityTimer, 
            'shield:', this.hasShield,
            'alreadySpunOut:', this.isSpunOut);
        
        if (this.invincibilityTimer > 0 || this.hasShield) {
            if (this.hasShield) {
                this.hasShield = false;
                this.shieldMesh.material.opacity = 0;
                if (window.audioManager) {
                    window.audioManager.playSound('shield_hit');
                }
            }
            console.log('spinOut防御された');
            return;
        }
        
        console.log('spinOut実行！');
        this.isSpunOut = true;
        this.spinOutTimer = 1.5;
        // スピンアウト開始時の向きを保存
        this.preSpinRotation = this.rotation;
        this.speed *= 0.3;
        this.invincibilityTimer = 2;
        
        if (window.audioManager) {
            window.audioManager.playSound('spin_out');
        }
    }
    
    activateShield() {
        this.hasShield = true;
        this.shieldTimer = 8;  // スターと同じ8秒間
        this.shieldMesh.material.opacity = 0.4;
        
        if (window.audioManager) {
            window.audioManager.playSound('shield_up');
        }
    }
    
    shrink(duration = 5) {
        if (this.invincibilityTimer > 0) return;
        
        this.isShrunken = true;
        this.shrinkTimer = duration;
        this.maxSpeed *= 0.7;
    }
    
    freeze(duration = 3) {
        if (this.invincibilityTimer > 0 || this.hasShield) return;
        
        this.isFrozen = true;
        this.freezeTimer = duration;
    }
    
    // Check collision with another kart
    checkCollision(otherKart) {
        const dist = this.position.distanceTo(otherKart.position);
        const minDist = this.collisionRadius + otherKart.collisionRadius;
        
        return dist < minDist;
    }
    
    // Handle collision response
    handleCollision(otherKart) {
        const pushDirection = new THREE.Vector3()
            .subVectors(this.position, otherKart.position)
            .normalize();
        
        // Push both karts apart
        const pushStrength = 0.5;
        this.position.add(pushDirection.clone().multiplyScalar(pushStrength));
        otherKart.position.add(pushDirection.clone().multiplyScalar(-pushStrength));
        
        // Reduce speeds
        this.speed *= 0.9;
        otherKart.speed *= 0.9;
        
        if (window.audioManager && Math.random() < 0.3) {
            window.audioManager.playSound('collision');
        }
    }
    
    // Get data for minimap
    getMinimapData() {
        return {
            x: this.position.x,
            z: this.position.z,
            rotation: this.rotation,
            color: this.colorData.primary,
            isPlayer: this.isPlayer
        };
    }
}

window.Kart = Kart;
