// Track generation and management

class Track {
    constructor(scene) {
        this.scene = scene;
        this.trackGroup = new THREE.Group();
        this.scene.add(this.trackGroup);
        
        // Track properties
        this.trackWidth = 25;
        this.wallHeight = 3;
        
        // Track path waypoints (tropical island theme)
        this.waypoints = this.generateWaypoints();
        this.trackLength = 0;
        
        // Collision boundaries
        this.innerBoundary = [];
        this.outerBoundary = [];
        
        // Track features
        this.boostPads = [];
        this.itemBoxes = [];
        this.hazards = [];
        
        // Checkpoints for lap counting
        this.checkpoints = [];
        this.finishLine = null;
        
        // 敵キャラクター（ドッスン、ノコノコ）
        this.enemies = [];
        
        // Build the track
        this.buildTrack();
        this.addEnvironment();
        // this.addBoostPads();  // ブーストパッドは無効化
        this.addItemBoxes();
        this.addEnemies();  // 敵キャラクターを追加
    }
    
    generateWaypoints() {
        // 交差しない周回コース - 様々なカーブと直線
        const waypoints = [
            // === スタート/フィニッシュ直線（南側、東向き）===
            { x: -120, y: 0, z: -200, width: 30 },
            { x: -60, y: 0, z: -200, width: 30 },
            { x: 0, y: 0, z: -200, width: 30 },
            { x: 60, y: 0, z: -200, width: 30 },
            { x: 120, y: 0, z: -200, width: 30 },
            
            // === 第1コーナー（緩やかな右カーブ）===
            { x: 180, y: 0, z: -180, width: 28 },
            { x: 220, y: 0, z: -140, width: 28 },
            { x: 240, y: 0, z: -80, width: 28 },
            
            // === 東側ストレート ===
            { x: 240, y: 0, z: 0, width: 28 },
            { x: 230, y: 0, z: 80, width: 28 },
            
            // === 第2コーナー（左ヘアピン）===
            { x: 200, y: 0, z: 140, width: 26 },
            { x: 150, y: 0, z: 180, width: 26 },
            { x: 90, y: 0, z: 190, width: 26 },
            
            // === 北側S字カーブ ===
            { x: 20, y: 0, z: 170, width: 26 },
            { x: -40, y: 0, z: 200, width: 26 },
            { x: -100, y: 0, z: 220, width: 26 },
            { x: -160, y: 0, z: 200, width: 26 },
            
            // === 第3コーナー（右カーブ）===
            { x: -200, y: 0, z: 150, width: 26 },
            { x: -220, y: 0, z: 80, width: 26 },
            
            // === 西側ストレート ===
            { x: -220, y: 0, z: 0, width: 28 },
            { x: -210, y: 0, z: -60, width: 28 },
            
            // === 最終コーナー（緩やかな左カーブ）===
            { x: -180, y: 0, z: -120, width: 28 },
            { x: -140, y: 0, z: -160, width: 28 },
            { x: -100, y: 0, z: -185, width: 28 },
        ];
        
        return waypoints;
    }
    
    buildTrack() {
        // Generate smooth track path using splines
        const trackPoints = [];
        const resolution = 20; // Points between each waypoint
        
        for (let i = 0; i < this.waypoints.length; i++) {
            for (let t = 0; t < resolution; t++) {
                const point = Utils.getSplinePoint(this.waypoints, (i + t / resolution) / this.waypoints.length);
                trackPoints.push(point);
            }
        }
        
        // Store track points for AI and minimap
        this.trackPoints = trackPoints;
        
        // Calculate track length
        for (let i = 1; i < trackPoints.length; i++) {
            this.trackLength += Utils.distance2D(
                trackPoints[i-1].x, trackPoints[i-1].z,
                trackPoints[i].x, trackPoints[i].z
            );
        }
        
        // Create track surface
        this.createTrackSurface(trackPoints);
        
        // Create boundaries
        this.createBoundaries(trackPoints);
        
        // Create checkpoints
        this.createCheckpoints(trackPoints);
        
        // Create finish line
        this.createFinishLine();
    }
    
    createTrackSurface(points) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const uvs = [];
        
        let totalDist = 0;
        
        for (let i = 0; i < points.length; i++) {
            const curr = points[i];
            const next = points[(i + 1) % points.length];
            
            // Calculate direction
            const dx = next.x - curr.x;
            const dz = next.z - curr.z;
            const len = Math.sqrt(dx * dx + dz * dz);
            
            // Perpendicular direction for width
            const perpX = -dz / len;
            const perpZ = dx / len;
            
            const width = this.trackWidth / 2;
            
            // Inner and outer points
            const innerX = curr.x + perpX * width;
            const innerZ = curr.z + perpZ * width;
            const outerX = curr.x - perpX * width;
            const outerZ = curr.z - perpZ * width;
            
            // Store boundaries
            this.innerBoundary.push({ x: innerX, z: innerZ, y: curr.y || 0 });
            this.outerBoundary.push({ x: outerX, z: outerZ, y: curr.y || 0 });
            
            if (i < points.length - 1) {
                const nextInnerX = next.x + perpX * width;
                const nextInnerZ = next.z + perpZ * width;
                const nextOuterX = next.x - perpX * width;
                const nextOuterZ = next.z - perpZ * width;
                
                // Triangle 1 - コースを芝より上に
                const trackHeight = 0.1;  // 低くしてカートと同じ高さに
                vertices.push(innerX, (curr.y || 0) + trackHeight, innerZ);
                vertices.push(outerX, (curr.y || 0) + trackHeight, outerZ);
                vertices.push(nextInnerX, (next.y || 0) + trackHeight, nextInnerZ);
                
                // Triangle 2
                vertices.push(outerX, (curr.y || 0) + trackHeight, outerZ);
                vertices.push(nextOuterX, (next.y || 0) + trackHeight, nextOuterZ);
                vertices.push(nextInnerX, (next.y || 0) + trackHeight, nextInnerZ);
                
                // UVs for road texture pattern
                const u = totalDist / 20;
                uvs.push(0, u, 1, u, 0, u + len/20);
                uvs.push(1, u, 1, u + len/20, 0, u + len/20);
                
                totalDist += len;
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.computeVertexNormals();
        
        // アスファルト色のコースマテリアル - 濃いグレー
        const roadTexture = window.textureManager ? window.textureManager.getTexture('road') : null;
        const material = new THREE.MeshStandardMaterial({
            map: roadTexture,
            color: 0x3a3a3a,  // アスファルトグレー
            roughness: 0.9,
            metalness: 0.0
        });
        
        const trackMesh = new THREE.Mesh(geometry, material);
        trackMesh.receiveShadow = true;
        trackMesh.renderOrder = 1;  // 芝より後に描画
        this.trackGroup.add(trackMesh);
        
        // Add road markings
        this.addRoadMarkings(points);
    }
    
    addRoadMarkings(points) {
        // Center dashed line
        const dashGeometry = new THREE.PlaneGeometry(0.5, 3);
        const dashMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        for (let i = 0; i < points.length; i += 8) {
            const curr = points[i];
            const next = points[(i + 1) % points.length];
            
            const angle = Math.atan2(next.z - curr.z, next.x - curr.x);
            
            const dash = new THREE.Mesh(dashGeometry, dashMaterial);
            dash.rotation.x = -Math.PI / 2;
            dash.rotation.z = -angle;
            dash.position.set(curr.x, (curr.y || 0) + 0.15, curr.z);
            this.trackGroup.add(dash);
        }
        
        // Edge stripes (red and white)
        this.addEdgeStripes(points);
    }
    
    addEdgeStripes(points) {
        // コース端の縁石を太くして視認性向上
        const stripeWidth = 2.5;  // 1 → 2.5に拡大
        
        for (let i = 0; i < points.length; i += 3) {  // 4 → 3に変更（より密に）
            const inner = this.innerBoundary[i];
            const outer = this.outerBoundary[i];
            
            if (!inner || !outer) continue;
            
            const isRed = Math.floor(i / 3) % 2 === 0;
            const color = isRed ? 0xff2200 : 0xffffff;  // より鮮やかな赤
            
            // Inner stripe（縁石）
            const innerGeom = new THREE.PlaneGeometry(stripeWidth, 3);
            const innerMat = new THREE.MeshBasicMaterial({ color });
            const innerStripe = new THREE.Mesh(innerGeom, innerMat);
            innerStripe.rotation.x = -Math.PI / 2;
            innerStripe.position.set(inner.x, (inner.y || 0) + 0.13, inner.z);
            this.trackGroup.add(innerStripe);
            
            // Outer stripe（縁石）
            const outerStripe = new THREE.Mesh(innerGeom.clone(), innerMat.clone());
            outerStripe.rotation.x = -Math.PI / 2;
            outerStripe.position.set(outer.x, (outer.y || 0) + 0.13, outer.z);
            this.trackGroup.add(outerStripe);
        }
        
        // コースの白いライン（連続した白線で境界を強調）
        this.addContinuousEdgeLine();
    }
    
    addContinuousEdgeLine() {
        // 内側と外側に連続した白線を追加
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
        
        // Inner line
        const innerPoints = [];
        for (let i = 0; i < this.innerBoundary.length; i += 2) {
            const p = this.innerBoundary[i];
            innerPoints.push(new THREE.Vector3(p.x, (p.y || 0) + 0.14, p.z));
        }
        const innerGeom = new THREE.BufferGeometry().setFromPoints(innerPoints);
        const innerLine = new THREE.Line(innerGeom, lineMaterial);
        this.trackGroup.add(innerLine);
        
        // Outer line
        const outerPoints = [];
        for (let i = 0; i < this.outerBoundary.length; i += 2) {
            const p = this.outerBoundary[i];
            outerPoints.push(new THREE.Vector3(p.x, (p.y || 0) + 0.14, p.z));
        }
        const outerGeom = new THREE.BufferGeometry().setFromPoints(outerPoints);
        const outerLine = new THREE.Line(outerGeom, lineMaterial);
        this.trackGroup.add(outerLine);
    }
    
    createBoundaries(points) {
        // Create invisible walls for collision
        const wallMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0,
            side: THREE.DoubleSide
        });
        
        // Create barrier meshes along track edges
        for (let i = 0; i < this.innerBoundary.length - 1; i++) {
            const curr = this.innerBoundary[i];
            const next = this.innerBoundary[i + 1];
            
            // Calculate wall segment
            const dx = next.x - curr.x;
            const dz = next.z - curr.z;
            const length = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dz, dx);
            
            // Inner wall
            const innerWallGeom = new THREE.BoxGeometry(length, this.wallHeight, 0.5);
            const innerWall = new THREE.Mesh(innerWallGeom, wallMaterial);
            innerWall.position.set(
                (curr.x + next.x) / 2,
                (curr.y + next.y) / 2 + this.wallHeight / 2,
                (curr.z + next.z) / 2
            );
            innerWall.rotation.y = -angle;
            innerWall.userData.isWall = true;
            innerWall.userData.wallType = 'inner';
            this.trackGroup.add(innerWall);
        }
        
        for (let i = 0; i < this.outerBoundary.length - 1; i++) {
            const curr = this.outerBoundary[i];
            const next = this.outerBoundary[i + 1];
            
            const dx = next.x - curr.x;
            const dz = next.z - curr.z;
            const length = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dz, dx);
            
            // Outer wall
            const outerWallGeom = new THREE.BoxGeometry(length, this.wallHeight, 0.5);
            const outerWall = new THREE.Mesh(outerWallGeom, wallMaterial);
            outerWall.position.set(
                (curr.x + next.x) / 2,
                (curr.y + next.y) / 2 + this.wallHeight / 2,
                (curr.z + next.z) / 2
            );
            outerWall.rotation.y = -angle;
            outerWall.userData.isWall = true;
            outerWall.userData.wallType = 'outer';
            this.trackGroup.add(outerWall);
        }
        
        // Add visible barriers (tire walls)
        this.addTireBarriers();
    }
    
    addTireBarriers() {
        const tireGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.6, 8);
        const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const redMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        
        // Place tire barriers at sharp corners
        const cornerIndices = [15, 30, 45, 75, 100, 130, 160, 200, 240, 280];
        
        cornerIndices.forEach((idx, ci) => {
            if (idx >= this.outerBoundary.length) return;
            
            for (let j = -3; j <= 3; j++) {
                const i = (idx + j + this.outerBoundary.length) % this.outerBoundary.length;
                const point = this.outerBoundary[i];
                if (!point) continue;
                
                const tire = new THREE.Mesh(tireGeometry, j % 3 === 0 ? redMaterial : tireMaterial);
                tire.rotation.x = Math.PI / 2;
                tire.position.set(point.x, (point.y || 0) + 0.3, point.z);
                tire.castShadow = true;
                this.trackGroup.add(tire);
            }
        });
    }
    
    createCheckpoints(points) {
        // Create checkpoints at regular intervals
        const numCheckpoints = 8;
        const interval = Math.floor(points.length / numCheckpoints);
        
        for (let i = 0; i < numCheckpoints; i++) {
            const idx = i * interval;
            const point = points[idx];
            const nextPoint = points[(idx + 1) % points.length];
            
            const angle = Math.atan2(nextPoint.z - point.z, nextPoint.x - point.x);
            
            this.checkpoints.push({
                index: i,
                position: { x: point.x, y: point.y || 0, z: point.z },
                angle: angle,
                width: this.trackWidth
            });
        }
    }
    
    createFinishLine() {
        // フィニッシュライン - コースを横断するように配置（Z軸方向に長く）
        // コースはX軸方向（東向き）に進むので、ラインはZ軸方向に伸びる
        const finishGeometry = new THREE.PlaneGeometry(8, this.trackWidth + 4);
        
        // チェッカーパターン
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        const squareSize = 16;
        for (let x = 0; x < canvas.width; x += squareSize) {
            for (let y = 0; y < canvas.height; y += squareSize) {
                ctx.fillStyle = ((x + y) / squareSize) % 2 === 0 ? '#ffffff' : '#000000';
                ctx.fillRect(x, y, squareSize, squareSize);
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        const finishMaterial = new THREE.MeshBasicMaterial({ map: texture });
        
        const finishLine = new THREE.Mesh(finishGeometry, finishMaterial);
        finishLine.rotation.x = -Math.PI / 2;
        // スタート地点（直線部分）に配置 - ゴールゲートの真下
        finishLine.position.set(0, 0.55, -200);
        this.trackGroup.add(finishLine);
        
        // ゴールゲート
        this.createFinishGate();
        
        this.finishLine = {
            position: { x: 0, y: 0, z: -200 },
            width: this.trackWidth,
            direction: 'x'  // X軸方向に走行
        };
    }
    
    createFinishGate() {
        // ゴールゲート - コースをまたぐアーチ型
        const pillarGeometry = new THREE.BoxGeometry(1.5, 12, 1.5);
        const pillarMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
        
        const gateWidth = this.trackWidth / 2 + 3;
        const gateZ = -200;  // フィニッシュラインと同じZ位置
        
        // 南側の柱（コース外側）
        const southPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        southPillar.position.set(0, 6, gateZ - gateWidth);
        southPillar.castShadow = true;
        this.trackGroup.add(southPillar);
        
        // 北側の柱（コース内側）
        const northPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        northPillar.position.set(0, 6, gateZ + gateWidth);
        northPillar.castShadow = true;
        this.trackGroup.add(northPillar);
        
        // 上部バナー（コースをまたぐ）
        const bannerGeometry = new THREE.BoxGeometry(1.2, 2.5, gateWidth * 2 + 2);
        const bannerMaterial = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
        const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
        banner.position.set(0, 11.5, gateZ);
        banner.castShadow = true;
        this.trackGroup.add(banner);
        
        // FINISH text - コース進行方向を向く
        const textGeometry = new THREE.PlaneGeometry(12, 2);
        const textCanvas = document.createElement('canvas');
        textCanvas.width = 256;
        textCanvas.height = 64;
        const textCtx = textCanvas.getContext('2d');
        textCtx.fillStyle = '#ffffff';
        textCtx.font = 'bold 48px Arial';
        textCtx.textAlign = 'center';
        textCtx.fillText('FINISH', 128, 48);
        
        const textTexture = new THREE.CanvasTexture(textCanvas);
        const textMaterial = new THREE.MeshBasicMaterial({ map: textTexture, transparent: true, side: THREE.DoubleSide });
        
        // 西向き（スタートから見える）
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(-1, 13, gateZ);
        textMesh.rotation.y = Math.PI / 2;
        this.trackGroup.add(textMesh);
        
        // 東向き（ゴール後に見える）
        const textMesh2 = new THREE.Mesh(textGeometry, textMaterial);
        textMesh2.position.set(1, 13, gateZ);
        textMesh2.rotation.y = -Math.PI / 2;
        this.trackGroup.add(textMesh2);
    }
    
    addBoostPads() {
        // 新コースに合わせたブーストパッド位置
        const boostLocations = [
            { x: 0, y: 0, z: 50, angle: 0 },             // ホームストレート
            { x: -80, y: 0, z: 185, angle: Math.PI },   // 第1コーナー後
            { x: -165, y: 2, z: 90, angle: -Math.PI/2 }, // バックストレート
            { x: -80, y: 0, z: -15, angle: 0 }           // 第2コーナー後
        ];
        
        boostLocations.forEach(loc => {
            this.createBoostPad(loc.x, loc.y, loc.z, loc.angle);
        });
    }
    
    createBoostPad(x, y, z, angle) {
        const geometry = new THREE.PlaneGeometry(8, 4);
        
        // Create boost pad texture
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Arrows
        ctx.fillStyle = '#ffff00';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(20 + i * 35, 52);
            ctx.lineTo(40 + i * 35, 32);
            ctx.lineTo(20 + i * 35, 12);
            ctx.lineTo(30 + i * 35, 32);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.9
        });
        
        const boostPad = new THREE.Mesh(geometry, material);
        boostPad.rotation.x = -Math.PI / 2;
        boostPad.rotation.z = -angle;
        boostPad.position.set(x, y + 0.15, z);
        
        boostPad.userData.isBoostPad = true;
        boostPad.userData.boostStrength = 1.5;
        
        this.trackGroup.add(boostPad);
        this.boostPads.push({
            mesh: boostPad,
            position: { x, y, z },
            radius: 4,
            strength: 1.5
        });
    }
    
    addItemBoxes() {
        // コース上にアイテムボックスを配置
        const itemLocations = [
            // スタート/フィニッシュ直線
            { x: 60, y: 2, z: -200 },
            // 第1コーナー後
            { x: 220, y: 2, z: -100 },
            // 東側ストレート
            { x: 235, y: 2, z: 40 },
            // 第2コーナー（ヘアピン）
            { x: 150, y: 2, z: 170 },
            // 北側S字カーブ入口
            { x: 50, y: 2, z: 175 },
            // 北側S字カーブ中央
            { x: -70, y: 2, z: 210 },
            // 第3コーナー
            { x: -200, y: 2, z: 120 },
            // 西側ストレート
            { x: -215, y: 2, z: -30 },
            // 最終コーナー
            { x: -160, y: 2, z: -140 },
            // ホームストレート手前
            { x: -60, y: 2, z: -200 },
        ];
        
        itemLocations.forEach((loc, index) => {
            this.createItemBox(loc.x, loc.y, loc.z, index);
        });
    }
    
    createItemBox(x, y, z, index) {
        const group = new THREE.Group();
        
        // Main box
        const boxGeometry = new THREE.BoxGeometry(3, 3, 3);
        const boxMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0x444400,
            transparent: true,
            opacity: 0.8
        });
        
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        group.add(box);
        
        // Question mark
        const questionCanvas = document.createElement('canvas');
        questionCanvas.width = 64;
        questionCanvas.height = 64;
        const ctx = questionCanvas.getContext('2d');
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('?', 32, 50);
        
        const questionTexture = new THREE.CanvasTexture(questionCanvas);
        const questionMaterial = new THREE.SpriteMaterial({ map: questionTexture });
        const questionSprite = new THREE.Sprite(questionMaterial);
        questionSprite.scale.set(2, 2, 1);
        questionSprite.position.y = 0.1;
        group.add(questionSprite);
        
        group.position.set(x, y, z);
        group.userData.isItemBox = true;
        group.userData.active = true;
        group.userData.respawnTime = 0;
        group.userData.index = index;
        
        this.trackGroup.add(group);
        this.itemBoxes.push({
            mesh: group,
            position: { x, y, z },
            radius: 2.5,
            active: true,
            respawnTime: 0
        });
    }
    
    addEnvironment() {
        // Ground plane (textured grass)
        this.createDetailedGround();
        
        // Ocean/water around the track with waves
        this.createOcean();
        
        // Beach sand areas
        this.createBeachAreas();
        
        // Palm trees (reduced for performance)
        this.addPalmTrees();
        
        // Grandstands and buildings
        this.addGrandstands();
        
        // Mountains in background
        this.addBackgroundMountains();
        
        // コース外側の装飾（山・岩）
        this.addSceneryMountains();
        
        // カーブ部分の柵（ショートカット防止）
        this.addCornerFences();
        
        // コース境界のバリア
        this.addTrackBarriers();
        
        // Clouds (reduced)
        this.addClouds();
        
        // Skybox effect (gradient sky)
        this.createSky();
    }
    
    // ドッスンとノコノコを追加
    addEnemies() {
        // 敵キャラクター配列を初期化
        this.enemies = [];
        
        // ドッスン（Thwomp）の配置場所 - コース中央に配置
        const thwompLocations = [
            { x: 0, z: -200 },     // スタート直線中央
            { x: 235, z: -40 },    // 東側ストレート中央
            { x: -215, z: 40 },    // 西側ストレート中央
            { x: -50, z: 195 },    // 北側S字カーブ中央
        ];
        
        thwompLocations.forEach((loc, index) => {
            this.createThwomp(loc.x, loc.z, index);
        });
        
        // ノコノコ（Koopa）の配置場所（コース上を歩く）- より目立つ位置
        const koopaLocations = [
            { x: -30, z: -200, patrolAxis: 'x', patrolRange: 25 },   // スタート直線
            { x: 230, z: 120, patrolAxis: 'z', patrolRange: 25 },    // 東側カーブ
            { x: -100, z: -180, patrolAxis: 'x', patrolRange: 20 },  // 最終コーナー
            { x: -180, z: 180, patrolAxis: 'z', patrolRange: 30 },   // 北西側（スタートから遠い）
        ];
        
        koopaLocations.forEach((loc, index) => {
            this.createKoopa(loc.x, loc.z, loc.patrolAxis, loc.patrolRange, index);
        });
        
        // 植木鉢を追加（障害物として）
        const plantLocations = [
            { x: 100, z: -150 },   // スタート直線からカーブ手前
        ];
        
        plantLocations.forEach((loc, index) => {
            this.createPottedPlant(loc.x, loc.z, index);
        });

        console.log('=== 敵キャラクター追加完了 ===');
        console.log('ドッスン:', thwompLocations.length, '体');
        console.log('ノコノコ:', koopaLocations.length, '体');
        console.log('植木鉢:', plantLocations.length, '個');
        console.log('合計:', this.enemies.length, '体');
        this.enemies.forEach((e, i) => {
            console.log(`敵${i}: type=${e.type}, x=${e.mesh.position.x}, y=${e.mesh.position.y}, z=${e.mesh.position.z}`);
        });
    }
    
    // ドッスン作成（上下に動く巨大な石）
    createThwomp(x, z, index) {
        const group = new THREE.Group();
        
        // メインボディ（グレーの直方体）
        const bodyGeo = new THREE.BoxGeometry(8, 10, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.9,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);
        
        // 棘（上部）
        const spikeGeo = new THREE.ConeGeometry(1.5, 3, 4);
        const spikeMat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.8
        });
        const spikePositions = [
            { x: 2.5, z: 2.5 }, { x: -2.5, z: 2.5 },
            { x: 2.5, z: -2.5 }, { x: -2.5, z: -2.5 }
        ];
        spikePositions.forEach(pos => {
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            spike.position.set(pos.x, 6.5, pos.z);
            group.add(spike);
        });
        
        // 底面の棘
        spikePositions.forEach(pos => {
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            spike.position.set(pos.x, -6.5, pos.z);
            spike.rotation.x = Math.PI;
            group.add(spike);
        });
        
        // 顔（怒った表情）
        // 目
        const eyeGeo = new THREE.SphereGeometry(0.8, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-1.5, 1, 4.1);
        group.add(leftEye);
        const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
        leftPupil.position.set(-1.5, 0.8, 4.5);
        group.add(leftPupil);
        
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(1.5, 1, 4.1);
        group.add(rightEye);
        const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
        rightPupil.position.set(1.5, 0.8, 4.5);
        group.add(rightPupil);
        
        // 眉毛（怒り）
        const browGeo = new THREE.BoxGeometry(2, 0.4, 0.2);
        const browMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const leftBrow = new THREE.Mesh(browGeo, browMat);
        leftBrow.position.set(-1.5, 2.2, 4.2);
        leftBrow.rotation.z = 0.3;
        group.add(leftBrow);
        const rightBrow = new THREE.Mesh(browGeo, browMat);
        rightBrow.position.set(1.5, 2.2, 4.2);
        rightBrow.rotation.z = -0.3;
        group.add(rightBrow);
        
        // 口
        const mouthGeo = new THREE.BoxGeometry(3, 1, 0.3);
        const mouthMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
        const mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, -1.5, 4.1);
        group.add(mouth);
        
        // 初期位置を設定
        const startY = 30;  // 高い位置から開始
        group.position.set(x, startY, z);
        this.trackGroup.add(group);
        
        // 各ドッスンは異なるタイミングで開始
        // index 0: すぐに落下、index 1: 1秒後、index 2: 2秒後
        const initialTimer = index * 1.0;
        
        this.enemies.push({
            type: 'thwomp',
            mesh: group,
            baseX: x,
            baseZ: z,
            baseY: startY,
            lowY: 3,  // 地面近く（カートの高さ）
            state: 'waiting',  // 全員待機状態から開始
            timer: initialTimer,  // 時間差で落下開始
            radius: 6,
            index: index,
            debugLogged: false
        });
        
        console.log(`ドッスン${index}作成: x=${x}, z=${z}, y=${startY}, timer=${initialTimer}`);
    }
    
    // ノコノコ作成（歩く亀）
    createKoopa(x, z, patrolAxis, patrolRange, index) {
        const group = new THREE.Group();
        
        // 甲羅（緑）
        const shellGeo = new THREE.SphereGeometry(1.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const shellMat = new THREE.MeshStandardMaterial({
            color: 0x228822,
            roughness: 0.4
        });
        const shell = new THREE.Mesh(shellGeo, shellMat);
        shell.rotation.x = Math.PI;
        shell.position.y = 1.5;
        group.add(shell);
        
        // 甲羅の模様
        const patternMat = new THREE.MeshStandardMaterial({ color: 0x115511 });
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const hexGeo = new THREE.CircleGeometry(0.3, 6);
            const hex = new THREE.Mesh(hexGeo, patternMat);
            hex.position.set(Math.cos(angle) * 0.8, 0.9, Math.sin(angle) * 0.8);
            hex.rotation.x = -Math.PI / 2;
            group.add(hex);
        }
        
        // 甲羅の縁（白）
        const rimGeo = new THREE.TorusGeometry(1.4, 0.2, 8, 16);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xffffee });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 1.55;
        group.add(rim);
        
        // 頭（黄色）
        const headGeo = new THREE.SphereGeometry(0.7, 12, 12);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffdd44 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 1.8, 1.5);
        group.add(head);
        
        // 目
        const eyeGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.25, 1.95, 2.05);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.25, 1.95, 2.05);
        group.add(rightEye);
        
        // 足（オレンジ）
        const footGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const footMat = new THREE.MeshStandardMaterial({ color: 0xff8800 });
        const leftFoot = new THREE.Mesh(footGeo, footMat);
        leftFoot.position.set(-0.8, 0.4, 0.5);
        leftFoot.scale.set(1, 0.6, 1.3);
        group.add(leftFoot);
        const rightFoot = new THREE.Mesh(footGeo, footMat);
        rightFoot.position.set(0.8, 0.4, 0.5);
        rightFoot.scale.set(1, 0.6, 1.3);
        group.add(rightFoot);
        
        // 地面の高さに配置（Y=2で少し浮かせる）
        group.position.set(x, 2, z);
        group.scale.set(2, 2, 2);  // 大きくして見やすく
        this.trackGroup.add(group);
        
        this.enemies.push({
            type: 'koopa',
            mesh: group,
            baseX: x,
            baseZ: z,
            patrolAxis: patrolAxis,
            patrolRange: patrolRange,
            direction: 1,
            speed: 15,  // 速くして動きをわかりやすく
            radius: 4,
            index: index,
            debugLogged: false
        });
        
        console.log(`ノコノコ${index}作成: x=${x}, z=${z}, patrol=${patrolAxis}`);
    }
    
    // 植木鉢作成（コース上の静的障害物）
    createPottedPlant(x, z, index) {
        const group = new THREE.Group();
        
        // === 植木鉢（茶色の素焼き鉢） ===
        // 鉢本体（円錐台形）
        const potGeo = new THREE.CylinderGeometry(3, 2.2, 5, 16);
        const potMat = new THREE.MeshStandardMaterial({
            color: 0xcc6633,  // テラコッタ色
            roughness: 0.8,
            metalness: 0.1
        });
        const pot = new THREE.Mesh(potGeo, potMat);
        pot.position.y = 2.5;
        group.add(pot);
        
        // 鉢の縁（リム）
        const rimGeo = new THREE.TorusGeometry(3.1, 0.4, 8, 24);
        const rim = new THREE.Mesh(rimGeo, potMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 5;
        group.add(rim);
        
        // 土の部分
        const soilGeo = new THREE.CylinderGeometry(2.7, 2.7, 0.5, 16);
        const soilMat = new THREE.MeshStandardMaterial({
            color: 0x3d2817,  // 濃い茶色
            roughness: 1.0
        });
        const soil = new THREE.Mesh(soilGeo, soilMat);
        soil.position.y = 4.7;
        group.add(soil);
        
        // === 植物（緑の観葉植物） ===
        // 茎
        const stemGeo = new THREE.CylinderGeometry(0.3, 0.4, 4, 8);
        const stemMat = new THREE.MeshStandardMaterial({
            color: 0x2d5a27,
            roughness: 0.7
        });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 7;
        group.add(stem);
        
        // 葉っぱ（複数枚を扇状に配置）
        const leafMat = new THREE.MeshStandardMaterial({
            color: 0x228b22,  // フォレストグリーン
            roughness: 0.6,
            side: THREE.DoubleSide
        });
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const leafHeight = 7 + Math.random() * 3;
            
            // 葉の形状（楕円形）
            const leafShape = new THREE.Shape();
            leafShape.moveTo(0, 0);
            leafShape.quadraticCurveTo(0.8, 1.5, 0, 4);
            leafShape.quadraticCurveTo(-0.8, 1.5, 0, 0);
            
            const leafGeo = new THREE.ShapeGeometry(leafShape);
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            
            leaf.position.set(
                Math.cos(angle) * 1.5,
                leafHeight,
                Math.sin(angle) * 1.5
            );
            leaf.rotation.x = -Math.PI / 4 - Math.random() * 0.3;
            leaf.rotation.y = angle;
            leaf.scale.set(1.5, 1.5, 1.5);
            group.add(leaf);
        }
        
        // 中央の大きな葉
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + Math.PI / 10;
            
            const bigLeafShape = new THREE.Shape();
            bigLeafShape.moveTo(0, 0);
            bigLeafShape.quadraticCurveTo(1.2, 2, 0, 5);
            bigLeafShape.quadraticCurveTo(-1.2, 2, 0, 0);
            
            const bigLeafGeo = new THREE.ShapeGeometry(bigLeafShape);
            const bigLeaf = new THREE.Mesh(bigLeafGeo, leafMat);
            
            bigLeaf.position.set(
                Math.cos(angle) * 0.5,
                9,
                Math.sin(angle) * 0.5
            );
            bigLeaf.rotation.x = -Math.PI / 6;
            bigLeaf.rotation.y = angle;
            bigLeaf.scale.set(2, 2, 2);
            group.add(bigLeaf);
        }
        
        // 花（赤いアクセント）- オプション
        const flowerMat = new THREE.MeshStandardMaterial({
            color: 0xff4444,
            roughness: 0.5
        });
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const flowerGeo = new THREE.SphereGeometry(0.5, 8, 8);
            const flower = new THREE.Mesh(flowerGeo, flowerMat);
            flower.position.set(
                Math.cos(angle) * 2,
                10 + Math.random() * 2,
                Math.sin(angle) * 2
            );
            group.add(flower);
        }
        
        // 配置
        group.position.set(x, 0, z);
        this.trackGroup.add(group);
        
        // enemiesリストに追加（衝突判定用）
        this.enemies.push({
            type: 'plant',
            mesh: group,
            radius: 4,  // 当たり判定半径
            isStatic: true,  // 静的オブジェクト
            index: index
        });
        
        console.log(`植木鉢${index}作成: x=${x}, z=${z}`);
    }
    
    // 敵キャラクターの更新
    updateEnemies(deltaTime) {
        if (!this.enemies || this.enemies.length === 0) {
            return;
        }
        
        this.enemies.forEach((enemy, idx) => {
            if (enemy.type === 'thwomp') {
                this.updateThwomp(enemy, deltaTime);
            } else if (enemy.type === 'koopa') {
                this.updateKoopa(enemy, deltaTime);
            }
        });
    }
    
    updateThwomp(thwomp, deltaTime) {
        const mesh = thwomp.mesh;
        
        // デバッグ用（最初の1回だけログ出力）
        if (!thwomp.debugLogged) {
            console.log(`ドッスン${thwomp.index}更新開始: state=${thwomp.state}, y=${mesh.position.y}`);
            thwomp.debugLogged = true;
        }
        
        switch (thwomp.state) {
            case 'waiting':
                thwomp.timer -= deltaTime;
                // 少し揺れる（待機中のアニメーション）
                mesh.position.y = thwomp.baseY + Math.sin(Date.now() * 0.008) * 1;
                if (thwomp.timer <= 0) {
                    thwomp.state = 'falling';
                    console.log(`ドッスン${thwomp.index}: 落下開始！`);
                }
                break;
                
            case 'falling':
                mesh.position.y -= 60 * deltaTime;  // 高速落下
                if (mesh.position.y <= thwomp.lowY) {
                    mesh.position.y = thwomp.lowY;
                    thwomp.state = 'grounded';
                    thwomp.timer = 1.0;  // 地面で待機
                    console.log(`ドッスン${thwomp.index}: 着地！`);
                }
                break;
                
            case 'grounded':
                thwomp.timer -= deltaTime;
                // 地面で少し振動
                mesh.position.y = thwomp.lowY + Math.sin(Date.now() * 0.02) * 0.2;
                if (thwomp.timer <= 0) {
                    thwomp.state = 'rising';
                    console.log(`ドッスン${thwomp.index}: 上昇開始`);
                }
                break;
                
            case 'rising':
                mesh.position.y += 20 * deltaTime;  // ゆっくり上昇
                if (mesh.position.y >= thwomp.baseY) {
                    mesh.position.y = thwomp.baseY;
                    thwomp.state = 'waiting';
                    thwomp.timer = 1.5 + Math.random() * 1.5;  // 1.5〜3秒のランダムな待機時間
                }
                break;
        }
    }
    
    updateKoopa(koopa, deltaTime) {
        const mesh = koopa.mesh;
        const speed = koopa.speed * deltaTime;
        
        // デバッグ用（最初の1回だけログ出力）
        if (!koopa.debugLogged) {
            console.log(`ノコノコ${koopa.index}更新開始: x=${mesh.position.x}, z=${mesh.position.z}`);
            koopa.debugLogged = true;
        }
        
        if (koopa.patrolAxis === 'x') {
            mesh.position.x += koopa.direction * speed;
            if (Math.abs(mesh.position.x - koopa.baseX) > koopa.patrolRange) {
                koopa.direction *= -1;
                mesh.rotation.y = koopa.direction > 0 ? 0 : Math.PI;
            }
        } else {
            mesh.position.z += koopa.direction * speed;
            if (Math.abs(mesh.position.z - koopa.baseZ) > koopa.patrolRange) {
                koopa.direction *= -1;
                mesh.rotation.y = koopa.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
            }
        }
        
        // 歩行アニメーション（上下に揺れる）
        mesh.position.y = 1 + Math.sin(Date.now() * 0.01) * 0.1;
    }
    
    // 敵との衝突判定
    checkEnemyCollision(kartPosition) {
        for (const enemy of this.enemies) {
            const enemyPos = enemy.mesh.position;
            const dx = kartPosition.x - enemyPos.x;
            const dz = kartPosition.z - enemyPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            // ドッスンは落下中・地面にいる時のみ当たり判定
            if (enemy.type === 'thwomp') {
                if ((enemy.state === 'falling' || enemy.state === 'grounded') && 
                    dist < enemy.radius && Math.abs(kartPosition.y - enemyPos.y) < 8) {
                    return enemy;
                }
            } else if (enemy.type === 'koopa') {
                if (dist < enemy.radius) {
                    return enemy;
                }
            }
        }
        return null;
    }

    addSceneryMountains() {
        // コース外側に装飾用の山を配置（コースを塞がない位置）
        const mountainGroup = new THREE.Group();
        
        // 山脈 - コースの外側に配置
        const mountains = [
            // 南西エリア（コース外側）
            { x: -300, z: -280, radius: 60, height: 90 },
            { x: -350, z: -200, radius: 45, height: 65 },
            
            // 北西エリア（コース外側）
            { x: -300, z: 280, radius: 55, height: 80 },
            { x: -280, z: 350, radius: 40, height: 55 },
            
            // 北東エリア（コース外側）
            { x: 300, z: 280, radius: 50, height: 70 },
            { x: 350, z: 200, radius: 35, height: 50 },
            
            // 南東エリア（コース外側）
            { x: 320, z: -280, radius: 55, height: 75 },
        ];
        
        mountains.forEach((m, idx) => {
            const mountainGeo = new THREE.ConeGeometry(m.radius, m.height, 8);
            const mountainMat = new THREE.MeshStandardMaterial({
                color: idx === 0 ? 0x4a7a4a : 0x5a8a5a,
                roughness: 0.9
            });
            const mountain = new THREE.Mesh(mountainGeo, mountainMat);
            mountain.position.set(m.x, m.height / 2, m.z);
            mountain.castShadow = true;
            mountainGroup.add(mountain);
            
            // 雪をかぶった頂上（高い山のみ）
            if (m.height > 60) {
                const snowGeo = new THREE.ConeGeometry(m.radius * 0.3, m.height * 0.25, 8);
                const snowMat = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    roughness: 0.8
                });
                const snow = new THREE.Mesh(snowGeo, snowMat);
                snow.position.set(m.x, m.height * 0.9, m.z);
                mountainGroup.add(snow);
            }
        });
        
        this.trackGroup.add(mountainGroup);
        
        // 装飾用の岩（コース外側）
        this.addSceneryRocks();
    }
    
    addSceneryRocks() {
        // コース外側に装飾用の岩を配置
        const rocks = [
            // コース外周の装飾岩
            { x: -280, z: -100, size: 12, type: 'large' },
            { x: 300, z: 50, size: 14, type: 'large' },
            { x: -250, z: 150, size: 10, type: 'large' },
            { x: 280, z: -150, size: 11, type: 'large' },
            
            { x: -260, z: 50, size: 7, type: 'medium' },
            { x: 280, z: 150, size: 8, type: 'medium' },
            { x: -240, z: -180, size: 7, type: 'medium' },
            { x: 260, z: -50, size: 6, type: 'medium' },
            
            { x: -270, z: 0, size: 4, type: 'small' },
            { x: 290, z: 100, size: 5, type: 'small' },
            { x: -250, z: 250, size: 4, type: 'small' },
            { x: 270, z: -100, size: 5, type: 'small' },
        ];
        
        rocks.forEach(rock => {
            const rockGeo = new THREE.DodecahedronGeometry(rock.size, 1);
            const rockMat = new THREE.MeshStandardMaterial({
                color: rock.type === 'large' ? 0x555555 : 
                       rock.type === 'medium' ? 0x666666 : 0x777777,
                roughness: 1.0
            });
            const rockMesh = new THREE.Mesh(rockGeo, rockMat);
            rockMesh.position.set(rock.x, rock.size * 0.6, rock.z);
            rockMesh.rotation.set(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.5);
            rockMesh.castShadow = true;
            this.trackGroup.add(rockMesh);
        });
    }
    
    addCornerFences() {
        // カーブ部分にフェンスを設置してショートカット防止
        const fenceMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const postMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
        
        // フェンスの配置場所（カーブの内側）- ショートカット防止強化
        const fenceLines = [
            // 第1コーナー内側（強化）
            { points: [{x: 140, z: -180}, {x: 160, z: -160}, {x: 190, z: -120}, {x: 200, z: -60}, {x: 200, z: 0}], height: 3 },
            
            // 第1〜第2コーナー間の内側
            { points: [{x: 195, z: 40}, {x: 185, z: 80}, {x: 170, z: 120}], height: 3 },
            
            // 第2コーナー（ヘアピン）内側（強化）
            { points: [{x: 170, z: 120}, {x: 130, z: 150}, {x: 80, z: 160}, {x: 30, z: 155}], height: 3 },
            
            // S字カーブ内側（強化）
            { points: [{x: 40, z: 140}, {x: -20, z: 170}, {x: -80, z: 190}, {x: -130, z: 195}], height: 3 },
            
            // 第3コーナー内側（強化）
            { points: [{x: -155, z: 190}, {x: -180, z: 160}, {x: -195, z: 120}, {x: -195, z: 60}, {x: -190, z: 0}], height: 3 },
            
            // 第3〜最終コーナー間の内側
            { points: [{x: -185, z: -40}, {x: -175, z: -80}, {x: -155, z: -110}], height: 3 },
            
            // 最終コーナー内側（強化）
            { points: [{x: -155, z: -110}, {x: -130, z: -145}, {x: -90, z: -170}, {x: -50, z: -180}], height: 3 },
            
            // スタート付近の内側ガードレール
            { points: [{x: 40, z: -185}, {x: 90, z: -180}, {x: 130, z: -175}], height: 3 },
        ];
        
        fenceLines.forEach(fence => {
            for (let i = 0; i < fence.points.length - 1; i++) {
                const p1 = fence.points[i];
                const p2 = fence.points[i + 1];
                
                const dx = p2.x - p1.x;
                const dz = p2.z - p1.z;
                const length = Math.sqrt(dx * dx + dz * dz);
                const angle = Math.atan2(dz, dx);
                
                // 横木
                const railGeo = new THREE.BoxGeometry(length, 0.3, 0.2);
                const rail1 = new THREE.Mesh(railGeo, fenceMaterial);
                rail1.position.set((p1.x + p2.x) / 2, 1.5, (p1.z + p2.z) / 2);
                rail1.rotation.y = -angle;
                this.trackGroup.add(rail1);
                
                const rail2 = new THREE.Mesh(railGeo, fenceMaterial);
                rail2.position.set((p1.x + p2.x) / 2, 2.5, (p1.z + p2.z) / 2);
                rail2.rotation.y = -angle;
                this.trackGroup.add(rail2);
                
                // 支柱
                const postGeo = new THREE.CylinderGeometry(0.15, 0.15, fence.height, 8);
                const post1 = new THREE.Mesh(postGeo, postMaterial);
                post1.position.set(p1.x, fence.height / 2, p1.z);
                this.trackGroup.add(post1);
            }
            
            // 最後の支柱
            const lastPoint = fence.points[fence.points.length - 1];
            const postGeo = new THREE.CylinderGeometry(0.15, 0.15, fence.height, 8);
            const lastPost = new THREE.Mesh(postGeo, postMaterial);
            lastPost.position.set(lastPoint.x, fence.height / 2, lastPoint.z);
            this.trackGroup.add(lastPost);
        });
        
        // フェンスとの衝突判定用データを保存
        this.fenceColliders = fenceLines.map(fence => ({
            points: fence.points,
            radius: 3
        }));
    }
    
    addTrackBarriers() {
        // コースの両側にバリアを配置
        const spacing = 15; // バリア間隔
        
        // 外側バリア
        for (let i = 0; i < this.outerBoundary.length; i += spacing) {
            const outer = this.outerBoundary[i];
            if (!outer) continue;
            this.createTireBarrier(outer.x, outer.z, i);
        }
        
        // ショートカット防止用の内側壁とフェンス
        this.addShortcutBlockers();
    }
    
    createTireBarrier(x, z, index) {
        const isRed = Math.floor(index / 15) % 2 === 0;
        const color = isRed ? 0xdd0000 : 0xffffff;
        
        const barrierMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.8
        });
        
        // タイヤ風のバリア
        const barrierGeo = new THREE.CylinderGeometry(1.5, 1.5, 2, 8);
        const barrier = new THREE.Mesh(barrierGeo, barrierMat);
        barrier.position.set(x, 1, z);
        this.trackGroup.add(barrier);
        
        // 衝突判定用にバリアリストに追加
        if (!this.barriers) this.barriers = [];
        this.barriers.push({ x, z, radius: 2 });
    }
    
    addShortcutBlockers() {
        // ショートカット防止用の障害物をコース中央エリアに配置
        // 注意: コース上ではなく、コースで囲まれた内側の芝生エリアに配置
        if (!this.barriers) this.barriers = [];
        
        // コース中央の芝生エリアに木を配置してショートカット防止
        this.addTreesInCenter();
    }
    
    addTreesInCenter() {
        // コース外側（芝生）に木を配置（装飾用）
        const treePositions = [
            // コースの外周に散らばる木（コース外側の装飾）
            { x: -300, z: -150, scale: 1.2 },
            { x: -280, z: 50, scale: 1.0 },
            { x: -270, z: 200, scale: 1.1 },
            { x: 300, z: -150, scale: 1.0 },
            { x: 290, z: 50, scale: 1.2 },
            { x: 250, z: 280, scale: 1.0 },
            { x: -200, z: 300, scale: 1.1 },
            { x: 100, z: 300, scale: 0.9 },
            { x: -100, z: -280, scale: 1.0 },
            { x: 150, z: -280, scale: 1.1 },
            // コース中央（囲まれた芝生エリア）に木
            { x: 0, z: 0, scale: 1.3 },
            { x: 50, z: 50, scale: 1.0 },
            { x: -50, z: -50, scale: 1.0 },
            { x: 80, z: -30, scale: 0.9 },
            { x: -80, z: 30, scale: 0.9 },
        ];
        
        treePositions.forEach(pos => {
            this.createTree(pos.x, pos.z, pos.scale);
        });
    }
    
    createTree(x, z, scale = 1) {
        const treeGroup = new THREE.Group();
        
        // 幹
        const trunkGeo = new THREE.CylinderGeometry(1.5 * scale, 2 * scale, 8 * scale, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 4 * scale;
        trunk.castShadow = true;
        treeGroup.add(trunk);
        
        // 葉（複数の球体で構成）
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        
        const leafPositions = [
            { y: 10, r: 6 },
            { y: 14, r: 5 },
            { y: 17, r: 3.5 },
        ];
        
        leafPositions.forEach(lp => {
            const leafGeo = new THREE.SphereGeometry(lp.r * scale, 8, 6);
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.y = lp.y * scale;
            leaf.castShadow = true;
            treeGroup.add(leaf);
        });
        
        treeGroup.position.set(x, 0, z);
        this.trackGroup.add(treeGroup);
    }
    
    createDetailedGround() {
        // 平坦な芝生地（拡大）
        const groundGeometry = new THREE.PlaneGeometry(1200, 1200, 10, 10);
        
        // 芝のテクスチャ
        const grassTexture = window.textureManager ? window.textureManager.getTexture('grass') : null;
        
        // 芝の色を明るい緑に
        const groundMaterial = new THREE.MeshBasicMaterial({ 
            map: grassTexture,
            color: 0x4cb84c,
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;  // トラック(0.1)のすぐ下に
        ground.receiveShadow = true;
        ground.renderOrder = 0;  // 最初に描画
        this.trackGroup.add(ground);
    }
    
    addGrassTufts() {
        const grassMat = new THREE.MeshBasicMaterial({ 
            color: 0x3da83d,
            side: THREE.DoubleSide
        });
        
        for (let i = 0; i < 500; i++) {
            const x = (Math.random() - 0.5) * 600;
            const z = (Math.random() - 0.5) * 600;
            
            // Skip if on track
            if (this.isOnTrack(x, z)) continue;
            
            const grassGroup = new THREE.Group();
            
            for (let j = 0; j < 5; j++) {
                const bladeGeo = new THREE.PlaneGeometry(0.3, 1 + Math.random() * 0.5);
                const blade = new THREE.Mesh(bladeGeo, grassMat);
                blade.position.set((Math.random() - 0.5) * 0.5, 0.5, (Math.random() - 0.5) * 0.5);
                blade.rotation.y = Math.random() * Math.PI;
                blade.rotation.x = Math.random() * 0.2;
                grassGroup.add(blade);
            }
            
            grassGroup.position.set(x, 0, z);
            this.trackGroup.add(grassGroup);
        }
    }
    
    createOcean() {
        // Animated water plane with better texture
        const waterGeometry = new THREE.PlaneGeometry(3000, 3000, 100, 100);
        
        // Use texture manager for water
        const waterTexture = window.textureManager ? window.textureManager.getTexture('water') : null;
        const waterNormal = window.textureManager ? window.textureManager.getTexture('waterNormal') : null;
        
        if (waterTexture) {
            waterTexture.wrapS = THREE.RepeatWrapping;
            waterTexture.wrapT = THREE.RepeatWrapping;
            waterTexture.repeat.set(20, 20);
        }
        if (waterNormal) {
            waterNormal.wrapS = THREE.RepeatWrapping;
            waterNormal.wrapT = THREE.RepeatWrapping;
            waterNormal.repeat.set(30, 30);
        }
        
        const waterMaterial = new THREE.MeshStandardMaterial({
            map: waterTexture,
            normalMap: waterNormal,
            normalScale: new THREE.Vector2(0.8, 0.8),
            color: 0x0088cc,
            transparent: true,
            opacity: 0.9,
            roughness: 0.05,
            metalness: 0.4,
            envMapIntensity: 1.0
        });
        
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.rotation.x = -Math.PI / 2;
        water.position.y = -4;
        water.receiveShadow = true;
        this.trackGroup.add(water);
        this.waterMesh = water;
        this.waterMaterial = waterMaterial;
        
        // Add foam/waves at shore
        this.addWaveFoam();
    }
    
    addWaveFoam() {
        const foamMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.6 
        });
        
        // Create foam rings around the island
        const foamGeo = new THREE.RingGeometry(280, 290, 64);
        const foam = new THREE.Mesh(foamGeo, foamMat);
        foam.rotation.x = -Math.PI / 2;
        foam.position.y = -3.8;
        this.trackGroup.add(foam);
    }
    
    createBeachAreas() {
        // Sand beaches around edges with texture
        const sandTexture = window.textureManager ? window.textureManager.getTexture('sand') : null;
        
        const sandMat = new THREE.MeshStandardMaterial({
            map: sandTexture,
            color: 0xf4d090,
            roughness: 1.0,
            metalness: 0
        });
        
        const beachPositions = [
            { x: -200, z: 100, r: 80 },
            { x: 200, z: 150, r: 60 },
            { x: 0, z: -200, r: 100 },
            { x: 150, z: -150, r: 70 }
        ];
        
        beachPositions.forEach(beach => {
            const sandGeo = new THREE.CircleGeometry(beach.r, 32);
            const sand = new THREE.Mesh(sandGeo, sandMat.clone());
            sand.rotation.x = -Math.PI / 2;
            sand.position.set(beach.x, -2, beach.z);
            sand.receiveShadow = true;
            this.trackGroup.add(sand);
        });
    }
    
    addPalmTrees() {
        // パフォーマンス改善のためツリー数を減らす
        const treePositions = [];
        
        // 少数のツリーをコース周辺に配置
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 80 + Math.random() * 150;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist + 50;
            
            if (!this.isOnTrack(x, z)) {
                treePositions.push({ x, z, scale: 0.8 + Math.random() * 0.4 });
            }
        }
        
        treePositions.forEach(pos => {
            this.createPalmTree(pos.x, pos.z, pos.scale || 1);
        });
    }
    
    createPalmTree(x, z, scale = 1) {
        const group = new THREE.Group();
        
        // Curved trunk segments
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b5a2b,
            roughness: 0.9
        });
        
        const trunkHeight = 10 * scale;
        const segments = 5;
        
        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const radius = (0.6 - t * 0.3) * scale;
            const segHeight = trunkHeight / segments;
            
            const segGeo = new THREE.CylinderGeometry(radius * 0.9, radius, segHeight, 8);
            const seg = new THREE.Mesh(segGeo, trunkMaterial);
            seg.position.y = segHeight * i + segHeight / 2;
            seg.rotation.z = Math.sin(t * Math.PI) * 0.1;
            seg.castShadow = true;
            group.add(seg);
        }
        
        // Palm leaves (fronds)
        const leafMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228b22,
            side: THREE.DoubleSide,
            roughness: 0.8
        });
        
        const numLeaves = 8;
        for (let i = 0; i < numLeaves; i++) {
            const leafGroup = new THREE.Group();
            
            // Create elongated leaf shape
            const leafShape = new THREE.Shape();
            leafShape.moveTo(0, 0);
            leafShape.quadraticCurveTo(2, 0.5, 5, 0);
            leafShape.quadraticCurveTo(2, -0.5, 0, 0);
            
            const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.05, bevelEnabled: false });
            const leaf = new THREE.Mesh(leafGeo, leafMaterial);
            leaf.scale.set(scale, scale, scale);
            leaf.castShadow = true;
            leafGroup.add(leaf);
            
            leafGroup.rotation.y = (i / numLeaves) * Math.PI * 2;
            leafGroup.rotation.x = 0.3 + Math.random() * 0.3;
            leafGroup.position.y = trunkHeight;
            group.add(leafGroup);
        }
        
        // Coconuts
        const coconutGeo = new THREE.SphereGeometry(0.3 * scale, 8, 8);
        const coconutMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
        
        for (let i = 0; i < 3; i++) {
            const coconut = new THREE.Mesh(coconutGeo, coconutMat);
            coconut.position.set(
                Math.cos(i * 2.1) * 0.5 * scale,
                trunkHeight - 0.5,
                Math.sin(i * 2.1) * 0.5 * scale
            );
            coconut.castShadow = true;
            group.add(coconut);
        }
        
        group.position.set(x, 0, z);
        group.rotation.y = Math.random() * Math.PI * 2;
        this.trackGroup.add(group);
    }
    
    addVegetation() {
        // Tropical flowers
        const flowerColors = [0xff69b4, 0xff4500, 0xffff00, 0xff1493, 0xffa500];
        
        for (let i = 0; i < 200; i++) {
            const x = (Math.random() - 0.5) * 500;
            const z = (Math.random() - 0.5) * 500;
            
            if (this.isOnTrack(x, z)) continue;
            
            const flowerGroup = new THREE.Group();
            
            // Stem
            const stemGeo = new THREE.CylinderGeometry(0.05, 0.08, 1, 6);
            const stemMat = new THREE.MeshBasicMaterial({ color: 0x228b22 });
            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.y = 0.5;
            flowerGroup.add(stem);
            
            // Petals
            const petalColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
            const petalMat = new THREE.MeshBasicMaterial({ color: petalColor });
            
            for (let p = 0; p < 5; p++) {
                const petalGeo = new THREE.SphereGeometry(0.15, 8, 8);
                const petal = new THREE.Mesh(petalGeo, petalMat);
                petal.scale.set(1, 0.3, 1);
                petal.position.set(
                    Math.cos(p * Math.PI * 2 / 5) * 0.2,
                    1.1,
                    Math.sin(p * Math.PI * 2 / 5) * 0.2
                );
                flowerGroup.add(petal);
            }
            
            // Center
            const centerGeo = new THREE.SphereGeometry(0.1, 8, 8);
            const centerMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const center = new THREE.Mesh(centerGeo, centerMat);
            center.position.y = 1.1;
            flowerGroup.add(center);
            
            flowerGroup.position.set(x, 0, z);
            flowerGroup.scale.setScalar(0.5 + Math.random() * 0.5);
            this.trackGroup.add(flowerGroup);
        }
        
        // Bushes
        this.addBushes();
    }
    
    addBushes() {
        const bushMat = new THREE.MeshStandardMaterial({ 
            color: 0x2e8b2e,
            roughness: 0.9
        });
        
        for (let i = 0; i < 100; i++) {
            const x = (Math.random() - 0.5) * 500;
            const z = (Math.random() - 0.5) * 500;
            
            if (this.isOnTrack(x, z)) continue;
            
            const bushGroup = new THREE.Group();
            
            // Multiple spheres for bush shape
            for (let j = 0; j < 5; j++) {
                const size = 1 + Math.random();
                const bushGeo = new THREE.SphereGeometry(size, 8, 8);
                const bush = new THREE.Mesh(bushGeo, bushMat);
                bush.position.set(
                    (Math.random() - 0.5) * 2,
                    size * 0.8,
                    (Math.random() - 0.5) * 2
                );
                bush.castShadow = true;
                bushGroup.add(bush);
            }
            
            bushGroup.position.set(x, 0, z);
            this.trackGroup.add(bushGroup);
        }
    }
    
    addRocksAndDecorations() {
        // Various rock formations
        const rockMat = new THREE.MeshStandardMaterial({ 
            color: 0x696969,
            roughness: 0.95
        });
        
        for (let i = 0; i < 50; i++) {
            const x = (Math.random() - 0.5) * 600;
            const z = (Math.random() - 0.5) * 600;
            
            if (this.isOnTrack(x, z)) continue;
            
            const rockGroup = new THREE.Group();
            const numRocks = 1 + Math.floor(Math.random() * 3);
            
            for (let j = 0; j < numRocks; j++) {
                const size = 0.5 + Math.random() * 2;
                const rockGeo = new THREE.DodecahedronGeometry(size, 0);
                const rock = new THREE.Mesh(rockGeo, rockMat);
                rock.position.set(
                    (Math.random() - 0.5) * 2,
                    size * 0.6,
                    (Math.random() - 0.5) * 2
                );
                rock.rotation.set(Math.random(), Math.random(), Math.random());
                rock.castShadow = true;
                rockGroup.add(rock);
            }
            
            rockGroup.position.set(x, 0, z);
            this.trackGroup.add(rockGroup);
        }
    }
    
    addGrandstands() {
        // コースの外側に客席配置
        const standPositions = [
            { x: 0, z: -270, rotation: 0 },                // スタート/ゴール後方（南側）
            { x: 290, z: -80, rotation: -Math.PI / 2 },    // 第1コーナー外（東側）
            { x: 200, z: 260, rotation: Math.PI },         // 北側（第2コーナー付近）
            { x: -270, z: 100, rotation: Math.PI / 2 },    // 西側
        ];
        
        standPositions.forEach(pos => {
            const stand = this.createGrandstand();
            stand.position.set(pos.x, 0, pos.z);
            stand.rotation.y = pos.rotation;
            this.trackGroup.add(stand);
        });
    }
    
    createGrandstand() {
        const group = new THREE.Group();
        
        // Base structure
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const baseGeo = new THREE.BoxGeometry(60, 8, 15);
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(0, 4, 0);
        base.castShadow = true;
        group.add(base);
        
        // Stepped seating
        const seatColors = [0xff0000, 0x0000ff, 0xffff00, 0x00ff00];
        for (let i = 0; i < 4; i++) {
            const seatMat = new THREE.MeshStandardMaterial({ color: seatColors[i] });
            const seatGeo = new THREE.BoxGeometry(58, 1.5, 3);
            const seat = new THREE.Mesh(seatGeo, seatMat);
            seat.position.set(0, 8.5 + i * 1.8, -5 + i * 3);
            seat.castShadow = true;
            group.add(seat);
        }
        
        // Roof
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
        const roofGeo = new THREE.BoxGeometry(65, 0.5, 20);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, 18, 2);
        roof.castShadow = true;
        group.add(roof);
        
        // Support pillars
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x404040 });
        [-28, 28].forEach(x => {
            const pillarGeo = new THREE.CylinderGeometry(0.5, 0.5, 18, 8);
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(x, 9, 10);
            pillar.castShadow = true;
            group.add(pillar);
        });
        
        // Crowd (simple colored dots)
        const crowdColors = [0xffcccc, 0xccffcc, 0xccccff, 0xffffcc, 0xffccff];
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 20; col++) {
                const personMat = new THREE.MeshBasicMaterial({ 
                    color: crowdColors[Math.floor(Math.random() * crowdColors.length)] 
                });
                const personGeo = new THREE.SphereGeometry(0.5, 6, 6);
                const person = new THREE.Mesh(personGeo, personMat);
                person.position.set(
                    -25 + col * 2.6 + Math.random() * 0.5,
                    9.5 + row * 1.8,
                    -5 + row * 3
                );
                group.add(person);
            }
        }
        
        return group;
    }
    
    addBillboards() {
        // 新しい楕円コースに合わせたビルボード配置（コース外側のみ）
        const billboardTexts = [
            'SPEED!', 'TURBO', 'NITRO', 'GO GO!', 'DRIFT!', 'BOOST', 'WIN!', 'RACE'
        ];
        const billboardColors = [0xff0000, 0x0066ff, 0x00cc00, 0xff9900, 0xff00ff, 0x00ffff, 0xffff00, 0xff0066];
        
        const billboardPositions = [
            { x: -50, z: -230, rot: Math.PI },            // スタート手前
            { x: 200, z: 20, rot: -Math.PI / 3 },         // 第1コーナー外
            { x: 220, z: 280, rot: -Math.PI / 2 },        // 北側ストレート外
            { x: 30, z: 420, rot: 0 },                    // 北端
            { x: -220, z: 320, rot: Math.PI / 2 },        // 西側上部
            { x: -220, z: 100, rot: Math.PI / 2 },        // 西側中央
            { x: -200, z: -50, rot: Math.PI * 0.7 },      // S字カーブ外
            { x: -100, z: -230, rot: Math.PI * 0.9 }      // 最終コーナー外
        ];
        
        billboardPositions.forEach((pos, i) => {
            const billboard = this.createBillboard(
                billboardTexts[i % billboardTexts.length],
                billboardColors[i % billboardColors.length]
            );
            billboard.position.set(pos.x, 0, pos.z);
            billboard.rotation.y = pos.rot;
            this.trackGroup.add(billboard);
        });
    }
    
    createBillboard(text, bgColor) {
        const group = new THREE.Group();
        
        // Pole
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x404040 });
        const poleGeo = new THREE.CylinderGeometry(0.3, 0.4, 12, 8);
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 6;
        pole.castShadow = true;
        group.add(pole);
        
        // Board
        const boardGeo = new THREE.BoxGeometry(10, 4, 0.3);
        const boardMat = new THREE.MeshStandardMaterial({ color: bgColor });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.y = 14;
        board.castShadow = true;
        group.add(board);
        
        // Text
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 128);
        
        const textTexture = new THREE.CanvasTexture(canvas);
        const textMat = new THREE.MeshBasicMaterial({ map: textTexture, transparent: true });
        const textGeo = new THREE.PlaneGeometry(9, 3.5);
        
        const textMeshFront = new THREE.Mesh(textGeo, textMat);
        textMeshFront.position.set(0, 14, 0.2);
        group.add(textMeshFront);
        
        const textMeshBack = new THREE.Mesh(textGeo, textMat);
        textMeshBack.position.set(0, 14, -0.2);
        textMeshBack.rotation.y = Math.PI;
        group.add(textMeshBack);
        
        return group;
    }
    
    addFloatingCoins() {
        // Decorative floating coins along the track
        const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
        const coinMat = new THREE.MeshStandardMaterial({ 
            color: 0xffd700,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x664400
        });
        
        this.coins = [];
        
        // Place coins along track
        for (let i = 0; i < this.trackPoints.length; i += 15) {
            const point = this.trackPoints[i];
            
            const coin = new THREE.Mesh(coinGeo, coinMat);
            coin.position.set(point.x, (point.y || 0) + 3, point.z);
            coin.rotation.x = Math.PI / 2;
            coin.castShadow = true;
            this.trackGroup.add(coin);
            this.coins.push(coin);
        }
    }
    
    addBackgroundMountains() {
        const mountainMat = new THREE.MeshStandardMaterial({ 
            color: 0x4a6741,
            roughness: 0.9
        });
        const snowMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.5
        });
        
        const mountainPositions = [
            { x: -400, z: 300, scale: 80 },
            { x: -200, z: 400, scale: 60 },
            { x: 100, z: 450, scale: 100 },
            { x: 350, z: 350, scale: 70 },
            { x: 450, z: 150, scale: 90 }
        ];
        
        mountainPositions.forEach(pos => {
            const mountainGroup = new THREE.Group();
            
            // Main mountain cone
            const mountainGeo = new THREE.ConeGeometry(pos.scale, pos.scale * 1.5, 6);
            const mountain = new THREE.Mesh(mountainGeo, mountainMat);
            mountain.position.y = pos.scale * 0.5;
            mountainGroup.add(mountain);
            
            // Snow cap
            const snowGeo = new THREE.ConeGeometry(pos.scale * 0.3, pos.scale * 0.4, 6);
            const snow = new THREE.Mesh(snowGeo, snowMat);
            snow.position.y = pos.scale * 1.1;
            mountainGroup.add(snow);
            
            mountainGroup.position.set(pos.x, 0, pos.z);
            this.trackGroup.add(mountainGroup);
        });
    }
    
    addClouds() {
        // Fluffy stylized clouds - reduced for performance
        this.clouds = [];
        
        for (let i = 0; i < 8; i++) {
            const cloudGroup = new THREE.Group();
            
            // Create gradient cloud material
            const cloudCanvas = document.createElement('canvas');
            cloudCanvas.width = 64;
            cloudCanvas.height = 64;
            const ctx = cloudCanvas.getContext('2d');
            
            const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 64, 64);
            
            const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
            const cloudMat = new THREE.SpriteMaterial({ 
                map: cloudTexture,
                transparent: true,
                opacity: 0.85,
                depthWrite: false
            });
            
            // Multiple sprites per cloud for fluffy look - reduced
            const numPuffs = 3;
            for (let j = 0; j < numPuffs; j++) {
                const puff = new THREE.Sprite(cloudMat.clone());
                const size = 40 + Math.random() * 30;
                puff.scale.set(size, size * 0.6, 1);
                puff.position.set(
                    (Math.random() - 0.5) * 40,
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 20
                );
                cloudGroup.add(puff);
            }
            
            cloudGroup.position.set(
                (Math.random() - 0.5) * 800,
                70 + Math.random() * 50,
                (Math.random() - 0.5) * 800
            );
            
            this.trackGroup.add(cloudGroup);
            this.clouds.push(cloudGroup);
        }
    }
    
    createSky() {
        // Beautiful gradient sky dome（拡大）
        const skyGeometry = new THREE.SphereGeometry(1000, 64, 64);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x1e90ff) },      // Dodger blue
                horizonColor: { value: new THREE.Color(0x87ceeb) },  // Sky blue
                bottomColor: { value: new THREE.Color(0xffd4a6) },   // Warm horizon
                sunColor: { value: new THREE.Color(0xffffcc) },      // Sun glow
                sunPosition: { value: new THREE.Vector3(0.5, 0.3, 0.8) },
                offset: { value: 30 },
                exponent: { value: 0.5 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                varying vec3 vNormal;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 horizonColor;
                uniform vec3 bottomColor;
                uniform vec3 sunColor;
                uniform vec3 sunPosition;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                varying vec3 vNormal;
                
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    
                    // Sky gradient
                    vec3 skyColor;
                    if (h > 0.0) {
                        skyColor = mix(horizonColor, topColor, pow(h, exponent));
                    } else {
                        skyColor = mix(horizonColor, bottomColor, pow(-h, 0.5));
                    }
                    
                    // Sun glow
                    vec3 sunDir = normalize(sunPosition);
                    vec3 viewDir = normalize(vWorldPosition);
                    float sunDot = max(dot(viewDir, sunDir), 0.0);
                    float sunGlow = pow(sunDot, 32.0) * 0.5 + pow(sunDot, 8.0) * 0.3;
                    skyColor = mix(skyColor, sunColor, sunGlow);
                    
                    gl_FragColor = vec4(skyColor, 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.trackGroup.add(sky);
        
        // Add sun
        this.createSun();
    }
    
    createSun() {
        // Glowing sun
        const sunGeo = new THREE.SphereGeometry(30, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({
            color: 0xffff99,
            transparent: true,
            opacity: 0.9
        });
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.set(300, 180, 480);
        this.trackGroup.add(sun);
        
        // Sun glow sprite
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = 256;
        glowCanvas.height = 256;
        const ctx = glowCanvas.getContext('2d');
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 150, 0.4)');
        gradient.addColorStop(0.6, 'rgba(255, 200, 100, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        const glowTexture = new THREE.CanvasTexture(glowCanvas);
        const glowMat = new THREE.SpriteMaterial({
            map: glowTexture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const glowSprite = new THREE.Sprite(glowMat);
        glowSprite.scale.set(200, 200, 1);
        glowSprite.position.copy(sun.position);
        this.trackGroup.add(glowSprite);
    }
    
    // Get height at position
    getHeightAt(x, z) {
        // コース上ならコースの高さを返す
        if (this.isOnTrack(x, z)) {
            // コース上
            let minDist = Infinity;
            let height = 1.0;  // コースの基本高さ (trackHeightに合わせる)
            
            for (const point of this.trackPoints) {
                const dist = Utils.distance2D(x, z, point.x, point.z);
                if (dist < minDist) {
                    minDist = dist;
                    height = (point.y || 0) + 1.0;
                }
            }
            return height;
        } else {
            // 芝の上
            return -1.0;
        }
    }
    
    // Check if position is on track
    isOnTrack(x, z) {
        // Check distance to track center line
        let minDist = Infinity;
        
        for (const point of this.trackPoints) {
            const dist = Utils.distance2D(x, z, point.x, point.z);
            if (dist < minDist) {
                minDist = dist;
            }
        }
        
        return minDist < this.trackWidth / 2 + 2;
    }
    
    // Check if on grass (for slowdown)
    isOnGrass(x, z) {
        return !this.isOnTrack(x, z);
    }
    
    // 最も近いトラックポイントを取得（甲羅の跳ね返り用）
    getClosestTrackPoint(x, z) {
        let minDist = Infinity;
        let closestPoint = null;
        
        for (const point of this.trackPoints) {
            const dist = Utils.distance2D(x, z, point.x, point.z);
            if (dist < minDist) {
                minDist = dist;
                closestPoint = point;
            }
        }
        
        return closestPoint;
    }
    
    // Get track direction at position
    getTrackDirection(x, z) {
        let minDist = Infinity;
        let bestIdx = 0;
        
        for (let i = 0; i < this.trackPoints.length; i++) {
            const point = this.trackPoints[i];
            const dist = Utils.distance2D(x, z, point.x, point.z);
            if (dist < minDist) {
                minDist = dist;
                bestIdx = i;
            }
        }
        
        const curr = this.trackPoints[bestIdx];
        const next = this.trackPoints[(bestIdx + 1) % this.trackPoints.length];
        
        // カートのrotationは Math.atan2(x, z) 形式なので合わせる
        return Math.atan2(next.x - curr.x, next.z - curr.z);
    }
    
    // Get progress along track (0-1)
    getTrackProgress(x, z) {
        let minDist = Infinity;
        let bestIdx = 0;
        
        for (let i = 0; i < this.trackPoints.length; i++) {
            const point = this.trackPoints[i];
            const dist = Utils.distance2D(x, z, point.x, point.z);
            if (dist < minDist) {
                minDist = dist;
                bestIdx = i;
            }
        }
        
        return bestIdx / this.trackPoints.length;
    }
    
    // Update item boxes (respawn logic)
    update(deltaTime) {
        // Rotate item boxes
        this.itemBoxes.forEach(itemBox => {
            if (itemBox.active) {
                itemBox.mesh.rotation.y += deltaTime * 2;
                itemBox.mesh.position.y = itemBox.position.y + Math.sin(Date.now() * 0.003) * 0.3;
            } else {
                itemBox.respawnTime -= deltaTime;
                if (itemBox.respawnTime <= 0) {
                    itemBox.active = true;
                    itemBox.mesh.visible = true;
                }
            }
        });
        
        // Animate boost pads
        this.boostPads.forEach(pad => {
            pad.mesh.material.opacity = 0.7 + Math.sin(Date.now() * 0.005) * 0.2;
        });
        
        // Animate floating coins
        if (this.coins) {
            this.coins.forEach((coin, i) => {
                coin.rotation.z += deltaTime * 3;
                coin.position.y += Math.sin(Date.now() * 0.003 + i) * 0.01;
            });
        }
        
        // Move clouds slowly
        if (this.clouds) {
            this.clouds.forEach((cloud, i) => {
                cloud.position.x += deltaTime * (5 + i * 0.5);
                if (cloud.position.x > 600) {
                    cloud.position.x = -600;
                }
            });
        }
        
        // Animate water (gentle waves)
        if (this.waterMesh) {
            const positions = this.waterMesh.geometry.attributes.position;
            const time = Date.now() * 0.001;
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                const wave = Math.sin(x * 0.02 + time) * Math.cos(y * 0.02 + time) * 0.5;
                positions.setZ(i, wave);
            }
            positions.needsUpdate = true;
        }
    }
    
    // Get start positions for racers
    getStartPositions(numRacers) {
        const positions = [];
        const startX = -30;   // フィニッシュライン(X=0)の後方（西側）
        const startZ = -200;  // フィニッシュラインのZ位置
        const rowSpacing = 12;    // 前後の間隔
        const laneOffset = 6; // 左右の間隔
        const startRotation = Math.PI / 2;  // 東を向く（+X方向）
        
        // AI Kartsを前方に配置（先頭から）
        for (let i = 0; i < numRacers - 1; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            
            positions.push({
                x: startX - row * rowSpacing,  // 西側に並ぶ（スタートライン後方）
                y: 1.5,
                z: startZ + (col === 0 ? -laneOffset : laneOffset),
                rotation: startRotation  // 東を向く（+X方向）
            });
        }
        
        // プレイヤーKartは最後列（最も後方）に配置
        const playerRow = Math.floor((numRacers - 1) / 2);
        positions.push({
            x: startX - playerRow * rowSpacing - rowSpacing,  // 最後列
            y: 1.5,
            z: startZ,  // 中央レーン
            rotation: startRotation  // 東を向く（+X方向）
        });
        
        return positions;
    }
}

window.Track = Track;
