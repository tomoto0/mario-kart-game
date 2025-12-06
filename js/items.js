// Item system - handles all power-ups and projectiles

class ItemManager {
    constructor(scene, track) {
        this.scene = scene;
        this.track = track;
        
        // Active projectiles and hazards
        this.projectiles = [];
        this.hazards = [];
        
        // Projectile meshes container
        this.itemGroup = new THREE.Group();
        this.scene.add(this.itemGroup);
    }
    
    useItem(kart, itemType) {
        switch (itemType.id) {
            case 'rocket_boost':
                this.useRocketBoost(kart);
                break;
            case 'homing_missile':
                this.fireHomingMissile(kart);
                break;
            case 'banana':
                this.dropBanana(kart);
                break;
            case 'oil_slick':
                this.dropOilSlick(kart);
                break;
            case 'shield':
                this.activateShield(kart);
                break;
            case 'lightning':
                this.useLightning(kart);
                break;
            case 'teleport':
                this.useTeleport(kart);
                break;
            case 'time_freeze':
                this.useTimeFreeze(kart);
                break;
            case 'star':
                this.useStar(kart);
                break;
            case 'green_shell':
                this.fireGreenShell(kart);
                break;
            case 'red_shell':
                this.fireRedShell(kart);
                break;
        }
    }
    
    useRocketBoost(kart) {
        // ロケットブースト - 安全な範囲に調整（暴走防止）
        kart.applyBoost(1.2, 1.25);  // 1.4倍 -> 1.25倍、時間も短縮
        if (window.audioManager) {
            window.audioManager.playSound('boost_big');
        }
    }
    
    fireHomingMissile(kart) {
        const missile = this.createMissile(kart, true);
        this.projectiles.push(missile);
        
        if (window.audioManager) {
            window.audioManager.playSound('missile_fire');
        }
    }
    
    fireStraightMissile(kart) {
        const missile = this.createMissile(kart, false);
        this.projectiles.push(missile);
        
        if (window.audioManager) {
            window.audioManager.playSound('missile_fire');
        }
    }
    
    createMissile(kart, isHoming) {
        // Create missile mesh
        const geometry = new THREE.ConeGeometry(0.3, 1.5, 8);
        const material = new THREE.MeshStandardMaterial({
            color: isHoming ? 0xff0000 : 0x00ff00,
            emissive: isHoming ? 0x440000 : 0x004400
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2;
        
        // Position in front of kart
        const forward = new THREE.Vector3(
            Math.sin(kart.rotation),
            0,
            Math.cos(kart.rotation)
        );
        
        mesh.position.copy(kart.position);
        mesh.position.add(forward.multiplyScalar(3));
        mesh.position.y += 0.5;
        
        this.itemGroup.add(mesh);
        
        return {
            type: 'missile',
            mesh: mesh,
            owner: kart,
            isHoming: isHoming,
            position: mesh.position.clone(),
            direction: forward.clone(),
            speed: 120,
            target: null,
            lifetime: 5,
            active: true
        };
    }
    
    dropBanana(kart) {
        // マリオカート風のバナナを作成
        const bananaGroup = new THREE.Group();
        
        // バナナ本体（湾曲した形状）
        const bananaShape = new THREE.Shape();
        bananaShape.moveTo(0, 0);
        bananaShape.quadraticCurveTo(0.3, 0.8, 0, 1.6);
        bananaShape.quadraticCurveTo(-0.15, 0.8, 0, 0);
        
        const extrudeSettings = {
            steps: 1,
            depth: 0.25,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.08,
            bevelSegments: 3
        };
        
        const bananaGeo = new THREE.ExtrudeGeometry(bananaShape, extrudeSettings);
        const bananaMat = new THREE.MeshStandardMaterial({
            color: 0xffe135,  // 鮮やかな黄色
            emissive: 0x332200,
            emissiveIntensity: 0.2,
            roughness: 0.5
        });
        const banana = new THREE.Mesh(bananaGeo, bananaMat);
        banana.rotation.z = Math.PI / 2;  // 横向きに
        banana.rotation.y = Math.PI / 2;
        banana.scale.set(0.8, 0.8, 0.8);
        bananaGroup.add(banana);
        
        // バナナの両端（茶色の部分）
        const tipGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const tipMat = new THREE.MeshStandardMaterial({ color: 0x4a3000 });
        
        const tip1 = new THREE.Mesh(tipGeo, tipMat);
        tip1.position.set(0, 0.65, 0);
        bananaGroup.add(tip1);
        
        const tip2 = new THREE.Mesh(tipGeo, tipMat);
        tip2.position.set(0, -0.65, 0);
        tip2.scale.set(0.8, 1.2, 0.8);
        bananaGroup.add(tip2);
        
        // 茎の部分
        const stemGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.2, 6);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x2d1f00 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(0, 0.75, 0);
        bananaGroup.add(stem);
        
        // Drop behind kart
        const behind = new THREE.Vector3(
            -Math.sin(kart.rotation),
            0,
            -Math.cos(kart.rotation)
        );
        
        bananaGroup.position.copy(kart.position);
        bananaGroup.position.add(behind.multiplyScalar(3));
        bananaGroup.position.y = this.track.getHeightAt(bananaGroup.position.x, bananaGroup.position.z) + 0.5;
        bananaGroup.rotation.x = Math.PI / 2;  // 地面に寝かせる
        bananaGroup.rotation.z = Math.random() * Math.PI * 2;  // ランダムな向き
        
        this.itemGroup.add(bananaGroup);
        
        this.hazards.push({
            type: 'banana',
            mesh: bananaGroup,
            owner: kart,
            position: bananaGroup.position.clone(),
            radius: 1.5,
            active: true,
            lifetime: 30
        });
        
        if (window.audioManager) {
            window.audioManager.playSound('banana_drop');
        }
    }
    
    dropOilSlick(kart) {
        // リアルなオイル溜まりを作成
        const oilGroup = new THREE.Group();
        
        // メインのオイル溜まり（不規則な形状）
        const mainOilGeo = new THREE.CircleGeometry(2, 24);
        // 頂点を少し変形させて不規則な形に
        const positions = mainOilGeo.attributes.position;
        for (let i = 1; i < positions.count; i++) {
            const angle = Math.atan2(positions.getY(i), positions.getX(i));
            const dist = Math.sqrt(positions.getX(i) ** 2 + positions.getY(i) ** 2);
            const variation = 0.8 + Math.sin(angle * 5) * 0.2 + Math.random() * 0.1;
            positions.setX(i, positions.getX(i) * variation);
            positions.setY(i, positions.getY(i) * variation);
        }
        positions.needsUpdate = true;
        
        const oilMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,  // 深い紫がかった黒
            transparent: true,
            opacity: 0.85,
            roughness: 0.1,  // 光沢のある表面
            metalness: 0.3,
            side: THREE.DoubleSide
        });
        
        const mainOil = new THREE.Mesh(mainOilGeo, oilMat);
        mainOil.rotation.x = -Math.PI / 2;
        oilGroup.add(mainOil);
        
        // 虹色の光沢エフェクト（オイルの特徴的な模様）
        const sheenGeo = new THREE.CircleGeometry(1.8, 24);
        const sheenMat = new THREE.MeshStandardMaterial({
            color: 0x4444ff,
            transparent: true,
            opacity: 0.15,
            roughness: 0,
            metalness: 0.8,
            side: THREE.DoubleSide
        });
        const sheen = new THREE.Mesh(sheenGeo, sheenMat);
        sheen.rotation.x = -Math.PI / 2;
        sheen.position.y = 0.02;
        oilGroup.add(sheen);
        
        // 小さな油滴を周囲に追加
        for (let i = 0; i < 5; i++) {
            const dropGeo = new THREE.CircleGeometry(0.3 + Math.random() * 0.3, 12);
            const drop = new THREE.Mesh(dropGeo, oilMat);
            drop.rotation.x = -Math.PI / 2;
            const angle = Math.random() * Math.PI * 2;
            const dist = 2.2 + Math.random() * 0.5;
            drop.position.set(
                Math.cos(angle) * dist,
                0.01,
                Math.sin(angle) * dist
            );
            oilGroup.add(drop);
        }
        
        // Drop behind kart
        const behind = new THREE.Vector3(
            -Math.sin(kart.rotation),
            0,
            -Math.cos(kart.rotation)
        );
        
        oilGroup.position.copy(kart.position);
        oilGroup.position.add(behind.multiplyScalar(3));
        oilGroup.position.y = this.track.getHeightAt(oilGroup.position.x, oilGroup.position.z) + 0.05;
        
        this.itemGroup.add(oilGroup);
        
        this.hazards.push({
            type: 'oil',
            mesh: oilGroup,
            owner: kart,
            position: oilGroup.position.clone(),
            radius: 2.5,
            active: true,
            lifetime: 20
        });
    }
    
    activateShield(kart) {
        kart.activateShield();
    }
    
    useLightning(kart) {
        // 自分以外の全員をクラッシュさせる（無敵状態とシールド持ちを除く）
        // 注意：使用者には何の効果もない
        console.log('イナズマ発動！使用者:', kart.isPlayer ? 'プレイヤー' : 'AI');
        
        if (window.game && window.game.karts) {
            window.game.karts.forEach(otherKart => {
                // 自分自身は完全にスキップ
                if (otherKart === kart) {
                    console.log('自分自身はスキップ');
                    return;
                }
                
                // 無敵状態（スター）は除外
                if (otherKart.invincibilityTimer > 0 || otherKart.starActive) {
                    console.log('無敵状態のカートはスキップ');
                    return;
                }
                
                // シールド持ちは除外
                if (otherKart.hasShield) {
                    console.log('シールド持ちはスキップ');
                    return;
                }
                
                // クラッシュさせる
                console.log('クラッシュ:', otherKart.isPlayer ? 'プレイヤー' : 'AI');
                otherKart.spinOut();
            });
        }
        
        // Visual effect - 画面全体に稲妻エフェクト
        const effect = document.getElementById('item-effect');
        if (effect) {
            effect.className = 'lightning-effect';
            effect.style.display = 'block';
            effect.style.background = 'rgba(255, 255, 0, 0.6)';
            setTimeout(() => {
                effect.style.background = 'rgba(255, 255, 255, 0.8)';
            }, 100);
            setTimeout(() => {
                effect.style.display = 'none';
                effect.className = '';
                effect.style.background = '';
            }, 400);
        }
        
        if (window.audioManager) {
            window.audioManager.playSound('lightning');
        }
    }
    
    useTeleport(kart) {
        // Teleport forward along track
        const currentProgress = this.track.getTrackProgress(kart.position.x, kart.position.z);
        const teleportDistance = 0.05; // 5% of track
        const newProgress = (currentProgress + teleportDistance) % 1;
        
        // Find new position
        const targetPoint = Utils.getSplinePoint(this.track.waypoints, newProgress);
        
        // Animate teleport
        const startPos = kart.position.clone();
        const endPos = new THREE.Vector3(targetPoint.x, targetPoint.y || 0 + 0.5, targetPoint.z);
        
        // Flash effect
        kart.mesh.visible = false;
        setTimeout(() => {
            kart.position.copy(endPos);
            kart.mesh.visible = true;
        }, 200);
        
        if (window.audioManager) {
            window.audioManager.playSound('teleport');
        }
    }
    
    useTimeFreeze(kart) {
        // Freeze all other karts
        if (window.game && window.game.karts) {
            window.game.karts.forEach(otherKart => {
                if (otherKart !== kart) {
                    otherKart.freeze(3);
                }
            });
        }
        
        // Visual effect - blue tint
        const effect = document.getElementById('item-effect');
        if (effect) {
            effect.style.background = 'rgba(0, 100, 255, 0.2)';
            effect.style.display = 'block';
            setTimeout(() => {
                effect.style.display = 'none';
                effect.style.background = '';
            }, 3000);
        }
    }
    
    // スター - 無敵状態とスピードアップ
    useStar(kart) {
        const starDuration = 8; // 8秒間
        kart.invincibilityTimer = starDuration;
        kart.starActive = true;
        
        // スピードブースト（控えめに調整 - 1.15倍を8秒間）
        // 引数: applyBoost(duration, multiplier)
        kart.applyBoost(starDuration, 1.15);
        
        // 虹色エフェクト開始
        this.startStarEffect(kart);
        
        if (window.audioManager) {
            window.audioManager.playSound('star');
        }
        
        // スター終了時にエフェクトをクリア
        setTimeout(() => {
            kart.starActive = false;
            this.stopStarEffect(kart);
        }, starDuration * 1000);
    }
    
    startStarEffect(kart) {
        // カートを虹色に光らせる
        kart.starEffectInterval = setInterval(() => {
            if (!kart.starActive) {
                clearInterval(kart.starEffectInterval);
                return;
            }
            const hue = (Date.now() / 50) % 360;
            const color = new THREE.Color(`hsl(${hue}, 100%, 60%)`);
            if (kart.mesh && kart.mesh.children) {
                kart.mesh.children.forEach(child => {
                    if (child.material && child.material.emissive) {
                        child.material.emissive = color;
                        child.material.emissiveIntensity = 0.5;
                    }
                });
            }
        }, 50);
    }
    
    stopStarEffect(kart) {
        if (kart.starEffectInterval) {
            clearInterval(kart.starEffectInterval);
        }
        // エミッシブをリセット
        if (kart.mesh && kart.mesh.children) {
            kart.mesh.children.forEach(child => {
                if (child.material && child.material.emissive) {
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            });
        }
    }
    
    // 緑甲羅 - まっすぐ飛んで壁で跳ね返る
    fireGreenShell(kart) {
        const shell = this.createTurtleShell(kart, 0x00aa00, false); // 緑色
        this.projectiles.push(shell);
        
        if (window.audioManager) {
            window.audioManager.playSound('shell_fire');
        }
    }
    
    // 赤甲羅 - 近くのライバルを自動追尾
    fireRedShell(kart) {
        const shell = this.createTurtleShell(kart, 0xcc0000, true); // 赤色、ホーミング
        this.projectiles.push(shell);
        
        if (window.audioManager) {
            window.audioManager.playSound('shell_fire');
        }
    }
    
    // 亀の甲羅メッシュを作成（マリオカート風のデザイン）
    createTurtleShell(kart, color, isHoming) {
        const shellGroup = new THREE.Group();
        
        // === 甲羅のメインドーム（上部） ===
        const domeGeo = new THREE.SphereGeometry(1.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const mainColor = isHoming ? 0xee1111 : 0x22bb22;  // 鮮やかな赤 or 緑
        const shellMat = new THREE.MeshStandardMaterial({
            color: mainColor,
            roughness: 0.25,
            metalness: 0.15,
            emissive: mainColor,
            emissiveIntensity: isHoming ? 0.35 : 0.15  // 赤甲羅はより光る
        });
        const dome = new THREE.Mesh(domeGeo, shellMat);
        dome.rotation.x = Math.PI;  // ドームを上向きに
        dome.position.y = 0;
        shellGroup.add(dome);
        
        // === 甲羅の模様（六角形パターン） ===
        const darkColor = isHoming ? 0xaa0000 : 0x116611;  // 赤甲羅は濃い赤
        const patternMat = new THREE.MeshStandardMaterial({
            color: darkColor,
            roughness: 0.4,
            emissive: isHoming ? 0x330000 : 0x000000,
            emissiveIntensity: 0.3
        });
        
        // 中心の六角形
        const centerHexGeo = new THREE.CircleGeometry(0.35, 6);
        const centerHex = new THREE.Mesh(centerHexGeo, patternMat);
        centerHex.position.set(0, -0.6, 0);
        centerHex.rotation.x = -Math.PI / 2;
        shellGroup.add(centerHex);
        
        // 周囲の六角形
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const hexGeo = new THREE.CircleGeometry(0.25, 6);
            const hex = new THREE.Mesh(hexGeo, patternMat);
            const radius = 0.65;
            hex.position.set(
                Math.cos(angle) * radius,
                -0.45,
                Math.sin(angle) * radius
            );
            hex.rotation.x = -Math.PI / 2 + 0.3;  // 少し傾ける
            hex.rotation.z = angle;
            shellGroup.add(hex);
        }
        
        // === 甲羅の縁（白いリング） ===
        const rimGeo = new THREE.TorusGeometry(1.15, 0.15, 8, 24);
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0xffffee,
            roughness: 0.5
        });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.05;
        shellGroup.add(rim);
        
        // === 底面（クリーム色） ===
        const bottomGeo = new THREE.CircleGeometry(1.1, 24);
        const bottomMat = new THREE.MeshStandardMaterial({
            color: 0xffffd0,
            roughness: 0.6
        });
        const bottom = new THREE.Mesh(bottomGeo, bottomMat);
        bottom.rotation.x = Math.PI / 2;
        bottom.position.y = 0.1;
        shellGroup.add(bottom);
        
        // === 甲羅のハイライト ===
        const highlightGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const highlightMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6
        });
        const highlight = new THREE.Mesh(highlightGeo, highlightMat);
        highlight.position.set(0.3, -0.7, 0.3);
        shellGroup.add(highlight);
        
        // 位置設定
        const forward = new THREE.Vector3(
            Math.sin(kart.rotation),
            0,
            Math.cos(kart.rotation)
        );
        
        shellGroup.position.copy(kart.position);
        shellGroup.position.add(forward.clone().multiplyScalar(4));
        shellGroup.position.y = 1.0;
        
        // スケール調整
        shellGroup.scale.set(1.2, 0.8, 1.2);
        
        this.itemGroup.add(shellGroup);
        
        return {
            type: 'shell',
            mesh: shellGroup,
            owner: kart,
            isHoming: isHoming,
            position: shellGroup.position.clone(),
            direction: forward.clone(),
            speed: isHoming ? 80 : 100, // 赤はやや遅いがホーミング
            target: null,
            lifetime: 8,
            active: true,
            bounceCount: 0,
            maxBounces: isHoming ? 0 : 5 // 緑は5回まで跳ね返る
        };
    }
    
    update(deltaTime, karts) {
        // Update projectiles
        this.projectiles = this.projectiles.filter(proj => {
            if (!proj.active) {
                this.itemGroup.remove(proj.mesh);
                return false;
            }
            
            proj.lifetime -= deltaTime;
            if (proj.lifetime <= 0) {
                proj.active = false;
                return false;
            }
            
            // Move projectile
            if (proj.isHoming && !proj.target) {
                // Find target (closest kart ahead of owner)
                let closestDist = Infinity;
                karts.forEach(kart => {
                    if (kart !== proj.owner && kart.totalProgress > proj.owner.totalProgress) {
                        const dist = proj.position.distanceTo(kart.position);
                        if (dist < closestDist) {
                            closestDist = dist;
                            proj.target = kart;
                        }
                    }
                });
                
                // If no target ahead, find closest overall
                if (!proj.target) {
                    karts.forEach(kart => {
                        if (kart !== proj.owner) {
                            const dist = proj.position.distanceTo(kart.position);
                            if (dist < closestDist) {
                                closestDist = dist;
                                proj.target = kart;
                            }
                        }
                    });
                }
            }
            
            if (proj.isHoming && proj.target) {
                // Home towards target
                const toTarget = new THREE.Vector3()
                    .subVectors(proj.target.position, proj.position)
                    .normalize();
                
                proj.direction.lerp(toTarget, 0.1);
                proj.direction.normalize();
                
                // 赤甲羅の追尾エフェクト - 点滅して光る
                if (proj.mesh && proj.mesh.children) {
                    const glowIntensity = 0.35 + Math.sin(Date.now() * 0.015) * 0.2;
                    proj.mesh.children.forEach(child => {
                        if (child.material && child.material.emissive) {
                            child.material.emissiveIntensity = glowIntensity;
                        }
                    });
                }
            }
            
            // Update position
            const movement = proj.direction.clone().multiplyScalar(proj.speed * deltaTime);
            proj.position.add(movement);
            proj.mesh.position.copy(proj.position);
            
            // 甲羅の壁バウンス処理（緑甲羅のみ）
            if (proj.type === 'shell' && !proj.isHoming) {
                // コース外に出たら跳ね返る
                if (!this.track.isOnTrack(proj.position.x, proj.position.z)) {
                    if (proj.bounceCount < proj.maxBounces) {
                        // 跳ね返り - 方向を反転
                        const trackCenter = this.track.getClosestTrackPoint(proj.position.x, proj.position.z);
                        if (trackCenter) {
                            // コース中心への方向を計算
                            const toCenter = new THREE.Vector3(
                                trackCenter.x - proj.position.x,
                                0,
                                trackCenter.z - proj.position.z
                            ).normalize();
                            
                            // 反射ベクトルを計算
                            const dot = proj.direction.dot(toCenter);
                            proj.direction.sub(toCenter.multiplyScalar(2 * dot)).negate();
                            proj.direction.normalize();
                            
                            proj.bounceCount++;
                            
                            if (window.audioManager) {
                                window.audioManager.playSound('shell_bounce');
                            }
                        }
                    } else {
                        // 最大バウンス到達：地面に落ちた甲羅として残す
                        this.convertShellToHazard(proj);
                        proj.active = false;
                    }
                }
            }
            
            // Rotate to face direction
            proj.mesh.rotation.y = Math.atan2(proj.direction.x, proj.direction.z);
            
            // 甲羅は回転させる
            if (proj.type === 'shell') {
                proj.mesh.rotation.z += deltaTime * 15;
            }
            
            // Check collision with karts（プレイヤー含む全員）
            for (let i = 0; i < karts.length; i++) {
                const kart = karts[i];
                if (kart === proj.owner) continue;  // 発射した本人だけスキップ
                if (!proj.active) break;
                
                const dist = proj.position.distanceTo(kart.position);
                if (dist < 4) {  // 当たり判定を少し広く
                    // 無敵状態（スター）なら甲羅を破壊
                    if (kart.invincibilityTimer > 0 || kart.starActive) {
                        proj.active = false;
                        this.createExplosion(proj.position);
                        if (window.audioManager) {
                            window.audioManager.playSound('shell_break');
                        }
                        continue;
                    }
                    
                    // シールドがあれば防ぐ
                    if (kart.hasShield) {
                        kart.hasShield = false;
                        kart.shieldTimer = 0;
                        kart.shieldMesh.material.opacity = 0;
                        proj.active = false;
                        this.createExplosion(proj.position);
                        if (window.audioManager) {
                            window.audioManager.playSound('shield_break');
                        }
                        continue;
                    }
                    
                    // Hit! クラッシュ
                    console.log('甲羅ヒット:', kart.isPlayer ? 'プレイヤー' : 'AI');
                    kart.spinOut();
                    proj.active = false;
                    
                    if (window.audioManager) {
                        window.audioManager.playSound('missile_hit');
                    }
                    
                    // Create explosion effect
                    this.createExplosion(proj.position);
                    break;
                }
            }
            
            return proj.active;
        });
        
        // Update hazards
        this.hazards = this.hazards.filter(hazard => {
            if (!hazard.active) {
                this.itemGroup.remove(hazard.mesh);
                return false;
            }
            
            hazard.lifetime -= deltaTime;
            if (hazard.lifetime <= 0) {
                hazard.active = false;
                return false;
            }
            
            // Rotate banana
            if (hazard.type === 'banana') {
                hazard.mesh.rotation.y += deltaTime * 2;
            }
            
            // Check collision with karts（プレイヤー含む全員）
            for (let i = 0; i < karts.length; i++) {
                const kart = karts[i];
                if (!hazard.active) break;
                
                // 置いた直後の0.5秒間だけオーナーは免除（通過するため）
                const timeSinceDrop = (hazard.type === 'banana' ? 30 : 20) - hazard.lifetime;
                if (kart === hazard.owner && timeSinceDrop < 0.5) continue;
                
                // 無敵状態はスキップ
                if (kart.invincibilityTimer > 0 || kart.starActive) continue;
                
                // すでにスピンアウト中ならスキップ
                if (kart.isSpunOut) continue;
                
                const dist = Utils.distance2D(
                    kart.position.x, kart.position.z,
                    hazard.position.x, hazard.position.z
                );
                
                if (dist < hazard.radius + 1) {  // 当たり判定を少し広く
                    // シールドがあれば防ぐ
                    if (kart.hasShield) {
                        kart.hasShield = false;
                        kart.shieldTimer = 0;
                        if (kart.shieldMesh) kart.shieldMesh.material.opacity = 0;
                        hazard.active = false;
                        console.log('シールドでバナナ/オイル防御:', kart.isPlayer ? 'プレイヤー' : 'AI');
                        continue;
                    }
                    
                    if (hazard.type === 'banana') {
                        console.log('バナナヒット:', kart.isPlayer ? 'プレーヤー' : 'AI', kart === hazard.owner ? '(自分のバナナ)' : '');
                        kart.spinOut();
                        hazard.active = false;
                    } else if (hazard.type === 'oil') {
                        console.log('オイルヒット:', kart.isPlayer ? 'プレーヤー' : 'AI', kart === hazard.owner ? '(自分のオイル)' : '');
                        // スピンアウト（自分のオイルでも同様）
                        kart.spinOut();
                        hazard.active = false;  // オイルも踏んだら消える
                    } else if (hazard.type === 'dropped_shell') {
                        console.log('落ちた甲羅ヒット:', kart.isPlayer ? 'プレイヤー' : 'AI');
                        kart.spinOut();
                        hazard.active = false;  // 甲羅は消える
                        if (window.audioManager) {
                            window.audioManager.playSound('shell_break');
                        }
                    }
                }
            }
            
            return hazard.active;
        });
    }
    
    // 飛んでいる甲羅を地面の障害物として設置
    convertShellToHazard(proj) {
        console.log('甲羅が地面に落下！ハザードとして設置');
        
        // 新しい甲羅メッシュを作成（小さくして地面に置く）
        const shellGroup = new THREE.Group();
        
        // 甲羅の色を取得（赤か緑）
        const shellColor = proj.isHoming ? 0xff2222 : 0x22cc22;
        
        // === 甲羅の甲（上部） ===
        const shellGeo = new THREE.SphereGeometry(0.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const shellMat = new THREE.MeshStandardMaterial({
            color: shellColor,
            roughness: 0.3,
            metalness: 0.2
        });
        const shellTop = new THREE.Mesh(shellGeo, shellMat);
        shellTop.position.y = 0.2;
        shellTop.rotation.x = Math.PI;
        shellGroup.add(shellTop);
        
        // === 底面 ===
        const bottomGeo = new THREE.CircleGeometry(0.7, 16);
        const bottomMat = new THREE.MeshStandardMaterial({
            color: 0xffffd0,
            roughness: 0.6
        });
        const bottom = new THREE.Mesh(bottomGeo, bottomMat);
        bottom.rotation.x = -Math.PI / 2;
        bottom.position.y = 0.1;
        shellGroup.add(bottom);
        
        // 位置設定
        shellGroup.position.copy(proj.position);
        shellGroup.position.y = 0.5;
        
        this.itemGroup.add(shellGroup);
        
        // ハザードとして登録
        this.hazards.push({
            type: 'dropped_shell',
            mesh: shellGroup,
            owner: proj.owner,
            position: shellGroup.position.clone(),
            radius: 2.5,
            active: true,
            lifetime: 20  // 20秒間地面に残る
        });
    }
    
    createExplosion(position) {
        // Simple explosion effect using particles
        if (window.game && window.game.particleSystem) {
            window.game.particleSystem.createExplosion(position);
        }
    }
    
    // Clean up all items
    clear() {
        this.projectiles.forEach(proj => {
            this.itemGroup.remove(proj.mesh);
        });
        this.projectiles = [];
        
        this.hazards.forEach(hazard => {
            this.itemGroup.remove(hazard.mesh);
        });
        this.hazards = [];
    }
}

window.ItemManager = ItemManager;
