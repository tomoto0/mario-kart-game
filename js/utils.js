// Utility functions for the racing game

// Math utilities
const Utils = {
    // Clamp value between min and max
    clamp: function(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    // Linear interpolation
    lerp: function(a, b, t) {
        return a + (b - a) * t;
    },
    
    // Smooth interpolation
    smoothLerp: function(a, b, t) {
        t = t * t * (3 - 2 * t);
        return a + (b - a) * t;
    },
    
    // Convert degrees to radians
    degToRad: function(degrees) {
        return degrees * Math.PI / 180;
    },
    
    // Convert radians to degrees
    radToDeg: function(radians) {
        return radians * 180 / Math.PI;
    },
    
    // Get random value in range
    random: function(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    // Get random integer in range
    randomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    // Distance between two points (2D)
    distance2D: function(x1, z1, x2, z2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dz * dz);
    },
    
    // Distance between two Vector3 points
    distance3D: function(p1, p2) {
        return p1.distanceTo(p2);
    },
    
    // Angle between two points (returns radians)
    angleBetween: function(x1, z1, x2, z2) {
        return Math.atan2(z2 - z1, x2 - x1);
    },
    
    // Normalize angle to -PI to PI
    normalizeAngle: function(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    },
    
    // Check if point is inside polygon (2D)
    pointInPolygon: function(x, z, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, zi = polygon[i].z;
            const xj = polygon[j].x, zj = polygon[j].z;
            
            if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    },
    
    // Get closest point on line segment
    closestPointOnLine: function(px, pz, x1, z1, x2, z2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        const len2 = dx * dx + dz * dz;
        
        if (len2 === 0) return { x: x1, z: z1 };
        
        let t = ((px - x1) * dx + (pz - z1) * dz) / len2;
        t = Math.max(0, Math.min(1, t));
        
        return {
            x: x1 + t * dx,
            z: z1 + t * dz
        };
    },
    
    // Catmull-Rom spline interpolation
    catmullRom: function(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        
        return 0.5 * (
            (2 * p1) +
            (-p0 + p2) * t +
            (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
            (-p0 + 3 * p1 - 3 * p2 + p3) * t3
        );
    },
    
    // Get point on spline path
    getSplinePoint: function(points, t) {
        const p = (points.length - 1) * t;
        const intPoint = Math.floor(p);
        const weight = p - intPoint;
        
        const p0 = points[(intPoint - 1 + points.length) % points.length];
        const p1 = points[intPoint % points.length];
        const p2 = points[(intPoint + 1) % points.length];
        const p3 = points[(intPoint + 2) % points.length];
        
        return {
            x: this.catmullRom(p0.x, p1.x, p2.x, p3.x, weight),
            y: p1.y !== undefined ? this.catmullRom(p0.y || 0, p1.y || 0, p2.y || 0, p3.y || 0, weight) : 0,
            z: this.catmullRom(p0.z, p1.z, p2.z, p3.z, weight)
        };
    },
    
    // Format time as MM:SS.ms
    formatTime: function(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = Math.floor((ms % 1000) / 10);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    },
    
    // Get ordinal suffix (1st, 2nd, 3rd, etc.)
    getOrdinal: function(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    },
    
    // Get ordinal suffix only
    getOrdinalSuffix: function(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    },
    
    // Shuffle array
    shuffleArray: function(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },
    
    // Deep clone object
    deepClone: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    // Ease in out quad
    easeInOutQuad: function(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },
    
    // Ease out elastic
    easeOutElastic: function(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 :
            Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    
    // Ease out bounce
    easeOutBounce: function(t) {
        const n1 = 7.5625;
        const d1 = 2.75;
        
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }
};

// Color palette for karts
const KartColors = [
    { name: 'Mario Red', primary: 0xff0000, secondary: 0xffffff, accent: 0x0000ff },
    { name: 'Luigi Green', primary: 0x00aa00, secondary: 0xffffff, accent: 0x000088 },
    { name: 'Peach Pink', primary: 0xff69b4, secondary: 0xffffff, accent: 0xffd700 },
    { name: 'Toad Blue', primary: 0x4169e1, secondary: 0xffffff, accent: 0xff0000 },
    { name: 'Yoshi Lime', primary: 0x32cd32, secondary: 0xffffff, accent: 0xff6347 },
    { name: 'Wario Yellow', primary: 0xffd700, secondary: 0x800080, accent: 0xffffff },
    { name: 'DK Brown', primary: 0x8b4513, secondary: 0xffd700, accent: 0xff0000 },
    { name: 'Bowser Orange', primary: 0xff8c00, secondary: 0x228b22, accent: 0xffff00 }
];

// Item definitions
const ItemTypes = {
    ROCKET_BOOST: {
        id: 'rocket_boost',
        name: 'Rocket Boost',
        emoji: '🚀',
        description: 'Massive speed boost',
        rarity: { '1-3': 0.05, '4-5': 0.15, '6-8': 0.25 }
    },
    TRIPLE_BOOST: {
        id: 'triple_boost',
        name: 'Triple Boost',
        emoji: '⚡',
        description: 'Three small boosts',
        rarity: { '1-3': 0.1, '4-5': 0.2, '6-8': 0.15 }
    },
    HOMING_MISSILE: {
        id: 'homing_missile',
        name: 'Homing Missile',
        emoji: '🎯',
        description: 'Targets racer ahead',
        rarity: { '1-3': 0, '4-5': 0, '6-8': 0 }  // 廃止（出現率ゼロ）
    },
    BANANA: {
        id: 'banana',
        name: 'Banana Hazard',
        emoji: '🍌',
        description: 'Drop behind to spin out others',
        rarity: { '1-3': 0.25, '4-5': 0.15, '6-8': 0.05 }
    },
    OIL_SLICK: {
        id: 'oil_slick',
        name: 'Oil Slick',
        emoji: '🛢️',
        description: 'Creates slippery patch',
        rarity: { '1-3': 0.2, '4-5': 0.1, '6-8': 0.05 }
    },
    SHIELD: {
        id: 'shield',
        name: 'Shield',
        emoji: '🛡️',
        description: 'Blocks one attack',
        rarity: { '1-3': 0.1, '4-5': 0.1, '6-8': 0.1 }
    },
    LIGHTNING: {
        id: 'lightning',
        name: 'Lightning Strike',
        emoji: '⚡',
        description: 'Crashes all opponents',
        rarity: { '1-3': 0, '4-5': 0.05, '6-8': 0.1 }
    },
    TELEPORT: {
        id: 'teleport',
        name: 'Teleport',
        emoji: '✨',
        description: 'Warp forward',
        rarity: { '1-3': 0, '4-5': 0, '6-8': 0.15 }
    },
    TIME_FREEZE: {
        id: 'time_freeze',
        name: 'Time Freeze',
        emoji: '❄️',
        description: 'Slow all opponents',
        rarity: { '1-3': 0, '4-5': 0, '6-8': 0.1 }
    },
    STAR: {
        id: 'star',
        name: 'Super Star',
        emoji: '⭐',
        description: 'Invincibility and speed boost',
        rarity: { '1-3': 0, '4-5': 0.05, '6-8': 0.15 }
    },
    GREEN_SHELL: {
        id: 'green_shell',
        name: 'Green Shell',
        emoji: '🐢',
        description: 'Fires straight, bounces off walls',
        rarity: { '1-3': 0.2, '4-5': 0.2, '6-8': 0.1 }
    },
    RED_SHELL: {
        id: 'red_shell',
        name: 'Red Shell',
        emoji: '💀',
        description: 'Homing shell that targets nearest rival',
        rarity: { '1-3': 0.05, '4-5': 0.15, '6-8': 0.25 }
    }
};

// Get random item based on position
function getRandomItem(position) {
    const posGroup = position <= 3 ? '1-3' : position <= 5 ? '4-5' : '6-8';
    const items = Object.values(ItemTypes);
    const weights = items.map(item => item.rarity[posGroup]);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    
    let random = Math.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return items[i];
        }
    }
    return items[0];
}

// Racer names
const RacerNames = [
    'Player',
    'Speed Demon',
    'Road Runner',
    'Turbo Tom',
    'Flash Fury',
    'Nitro Nick',
    'Drift King',
    'Rocket Ray'
];

// Export for use in other modules
window.Utils = Utils;
window.KartColors = KartColors;
window.ItemTypes = ItemTypes;
window.getRandomItem = getRandomItem;
window.RacerNames = RacerNames;
