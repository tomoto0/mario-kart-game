// Particle system for visual effects

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleGroups = [];
        this.maxParticles = 200;  // 減らす
        this.activeParticles = 0;
    }
    
    // Create drift spark particles
    createDriftSparks(kart) {
        if (!kart.isDrifting) return null;
        
        // Determine spark color based on drift level
        let color;
        switch (kart.driftLevel) {
            case 1:
                color = 0x00d4ff; // Blue
                break;
            case 2:
                color = 0xffa500; // Orange
                break;
            case 3:
                color = 0x9b59b6; // Purple
                break;
            default:
                color = 0xaaaaaa; // Gray
        }
        
        const particles = [];
        const numParticles = 2;  // 3 → 2
        
        for (let i = 0; i < numParticles; i++) {
            const geometry = new THREE.SphereGeometry(0.1, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Position at wheel
            const wheelOffset = kart.driftDirection < 0 ? -1.3 : 1.3;
            particle.position.set(
                kart.position.x + wheelOffset + (Math.random() - 0.5) * 0.5,
                kart.position.y + 0.3 + Math.random() * 0.3,
                kart.position.z - 1.3 + (Math.random() - 0.5) * 0.5
            );
            
            this.scene.add(particle);
            
            particles.push({
                mesh: particle,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    Math.random() * 3 + 2,
                    (Math.random() - 0.5) * 5
                ),
                lifetime: 0.3 + Math.random() * 0.2,
                maxLifetime: 0.5,
                type: 'spark'
            });
        }
        
        const group = { particles, active: true };
        this.particleGroups.push(group);
        return group;
    }
    
    // Create boost flame effect
    createBoostFlame(kart) {
        const particles = [];
        const numParticles = 3;  // 5 → 3
        
        for (let i = 0; i < numParticles; i++) {
            const geometry = new THREE.ConeGeometry(0.2, 0.5, 4);
            const material = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xff6600 : 0xffff00,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.rotation.x = Math.PI;
            
            // Position behind kart
            const behind = new THREE.Vector3(
                -Math.sin(kart.rotation),
                0,
                -Math.cos(kart.rotation)
            );
            
            particle.position.copy(kart.position);
            particle.position.add(behind.multiplyScalar(2.5));
            particle.position.x += (i % 2 === 0 ? -0.6 : 0.6);
            particle.position.y += 0.5;
            
            this.scene.add(particle);
            
            particles.push({
                mesh: particle,
                velocity: behind.clone().multiplyScalar(-20),
                lifetime: 0.2,
                maxLifetime: 0.2,
                type: 'flame'
            });
        }
        
        const group = { particles, active: true };
        this.particleGroups.push(group);
        return group;
    }
    
    // Create dust/dirt particles
    createDust(position, intensity = 1) {
        const particles = [];
        const numParticles = Math.floor(5 * intensity);
        
        for (let i = 0; i < numParticles; i++) {
            const geometry = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: 0x8b7355,
                transparent: true,
                opacity: 0.6
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            particle.position.x += (Math.random() - 0.5) * 2;
            particle.position.z += (Math.random() - 0.5) * 2;
            particle.position.y += 0.2;
            
            this.scene.add(particle);
            
            particles.push({
                mesh: particle,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    Math.random() * 2 + 1,
                    (Math.random() - 0.5) * 3
                ),
                lifetime: 0.5 + Math.random() * 0.3,
                maxLifetime: 0.8,
                type: 'dust'
            });
        }
        
        const group = { particles, active: true };
        this.particleGroups.push(group);
        return group;
    }
    
    // Create explosion effect
    createExplosion(position) {
        const particles = [];
        const numParticles = 20;
        
        // Core explosion particles
        for (let i = 0; i < numParticles; i++) {
            const geometry = new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 6, 6);
            const colors = [0xff4400, 0xff6600, 0xffaa00, 0xffff00];
            const material = new THREE.MeshBasicMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 1
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            
            this.scene.add(particle);
            
            const angle = (i / numParticles) * Math.PI * 2;
            const speed = 5 + Math.random() * 10;
            
            particles.push({
                mesh: particle,
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed,
                    Math.random() * 8 + 2,
                    Math.sin(angle) * speed
                ),
                lifetime: 0.5 + Math.random() * 0.3,
                maxLifetime: 0.8,
                type: 'explosion'
            });
        }
        
        // Smoke particles
        for (let i = 0; i < 10; i++) {
            const geometry = new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 6, 6);
            const material = new THREE.MeshBasicMaterial({
                color: 0x333333,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            particle.position.y += 0.5;
            
            this.scene.add(particle);
            
            particles.push({
                mesh: particle,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    Math.random() * 5 + 3,
                    (Math.random() - 0.5) * 3
                ),
                lifetime: 1 + Math.random() * 0.5,
                maxLifetime: 1.5,
                type: 'smoke',
                scale: 1
            });
        }
        
        const group = { particles, active: true };
        this.particleGroups.push(group);
        return group;
    }
    
    // Create item pickup sparkle
    createItemSparkle(position) {
        const particles = [];
        const numParticles = 12;
        
        for (let i = 0; i < numParticles; i++) {
            const geometry = new THREE.OctahedronGeometry(0.15, 0);
            const material = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 1
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            
            this.scene.add(particle);
            
            const angle = (i / numParticles) * Math.PI * 2;
            const speed = 3 + Math.random() * 2;
            
            particles.push({
                mesh: particle,
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed,
                    Math.random() * 4 + 2,
                    Math.sin(angle) * speed
                ),
                lifetime: 0.4 + Math.random() * 0.2,
                maxLifetime: 0.6,
                type: 'sparkle',
                rotationSpeed: Math.random() * 10
            });
        }
        
        const group = { particles, active: true };
        this.particleGroups.push(group);
        return group;
    }
    
    // Create speed lines (motion blur effect)
    createSpeedLines(kart, intensity) {
        if (intensity < 0.7) return null;
        
        const particles = [];
        const numLines = Math.floor((intensity - 0.7) * 10);
        
        for (let i = 0; i < numLines; i++) {
            const geometry = new THREE.CylinderGeometry(0.02, 0.02, 3, 4);
            const material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.3
            });
            
            const line = new THREE.Mesh(geometry, material);
            line.rotation.x = Math.PI / 2;
            line.rotation.z = kart.rotation;
            
            // Position around kart
            line.position.copy(kart.position);
            line.position.x += (Math.random() - 0.5) * 6;
            line.position.y += Math.random() * 3 + 1;
            line.position.z += (Math.random() - 0.5) * 6 - 3;
            
            this.scene.add(line);
            
            particles.push({
                mesh: line,
                velocity: new THREE.Vector3(0, 0, -30),
                lifetime: 0.15,
                maxLifetime: 0.15,
                type: 'speedline'
            });
        }
        
        const group = { particles, active: true };
        this.particleGroups.push(group);
        return group;
    }
    
    // Create shield break effect
    createShieldBreak(position) {
        const particles = [];
        const numParticles = 15;
        
        for (let i = 0; i < numParticles; i++) {
            const geometry = new THREE.TetrahedronGeometry(0.3, 0);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            
            this.scene.add(particle);
            
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 5 + Math.random() * 5;
            
            particles.push({
                mesh: particle,
                velocity: new THREE.Vector3(
                    Math.sin(phi) * Math.cos(theta) * speed,
                    Math.cos(phi) * speed,
                    Math.sin(phi) * Math.sin(theta) * speed
                ),
                lifetime: 0.6 + Math.random() * 0.3,
                maxLifetime: 0.9,
                type: 'shard',
                rotationSpeed: new THREE.Vector3(
                    Math.random() * 10,
                    Math.random() * 10,
                    Math.random() * 10
                )
            });
        }
        
        const group = { particles, active: true };
        this.particleGroups.push(group);
        return group;
    }
    
    // Update all particles
    update(deltaTime) {
        this.particleGroups = this.particleGroups.filter(group => {
            if (!group.active) return false;
            
            let allDead = true;
            
            group.particles = group.particles.filter(particle => {
                particle.lifetime -= deltaTime;
                
                if (particle.lifetime <= 0) {
                    this.scene.remove(particle.mesh);
                    particle.mesh.geometry.dispose();
                    particle.mesh.material.dispose();
                    return false;
                }
                
                allDead = false;
                
                // Update position
                particle.mesh.position.add(
                    particle.velocity.clone().multiplyScalar(deltaTime)
                );
                
                // Apply gravity to some particle types
                if (['spark', 'dust', 'explosion', 'sparkle', 'shard'].includes(particle.type)) {
                    particle.velocity.y -= 15 * deltaTime;
                }
                
                // Fade out
                const lifeRatio = particle.lifetime / particle.maxLifetime;
                particle.mesh.material.opacity = lifeRatio;
                
                // Type-specific updates
                if (particle.type === 'smoke') {
                    // Smoke expands
                    particle.scale = (particle.scale || 1) + deltaTime * 2;
                    particle.mesh.scale.setScalar(particle.scale);
                    particle.velocity.multiplyScalar(0.95);
                }
                
                if (particle.type === 'sparkle' || particle.type === 'shard') {
                    if (particle.rotationSpeed) {
                        if (typeof particle.rotationSpeed === 'number') {
                            particle.mesh.rotation.y += particle.rotationSpeed * deltaTime;
                        } else {
                            particle.mesh.rotation.x += particle.rotationSpeed.x * deltaTime;
                            particle.mesh.rotation.y += particle.rotationSpeed.y * deltaTime;
                            particle.mesh.rotation.z += particle.rotationSpeed.z * deltaTime;
                        }
                    }
                }
                
                return true;
            });
            
            if (allDead) {
                group.active = false;
                return false;
            }
            
            return true;
        });
    }
    
    // Clear all particles
    clear() {
        this.particleGroups.forEach(group => {
            group.particles.forEach(particle => {
                this.scene.remove(particle.mesh);
                particle.mesh.geometry.dispose();
                particle.mesh.material.dispose();
            });
        });
        this.particleGroups = [];
    }
    
    // Get active particle count
    getActiveCount() {
        let count = 0;
        this.particleGroups.forEach(group => {
            count += group.particles.length;
        });
        return count;
    }
}

window.ParticleSystem = ParticleSystem;
