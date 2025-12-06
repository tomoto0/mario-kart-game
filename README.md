# 🏎️ Super Kart Racing 3D

A professional Mario Kart-style racing game built with Three.js!

## Overview
Super Kart Racing 3D is a web-based racing game inspired by Mario Kart. It features AI opponents, a dynamic power-up system, and a tropical-themed track. The game is built entirely with JavaScript and Three.js, ensuring smooth performance and engaging gameplay.

## 🎮 How to Play

### Controls
- **Arrow Keys / WASD** - Accelerate, Brake, Turn Left/Right
- **Spacebar** - Drift (hold while turning) / Use Item (when stopped)
- **Shift** - Use Item
- **P / Escape** - Pause Game

### Gameplay
1. Select difficulty (Easy, Normal, Hard)
2. Press "START RACE" 
3. Race 3 laps against 7 AI opponents
4. Collect item boxes for power-ups
5. Use drift boosts for speed advantages
6. Cross the finish line first to win!

## 🚀 Features

### Core Gameplay
- **8 racers** - 1 player + 7 AI opponents
- **3 laps** per race with position tracking (1st-8th)
- **Drift mechanics** with 3-level boost system:
  - Blue sparks (0.5s) - Small boost
  - Orange sparks (1.2s) - Medium boost  
  - Purple sparks (2.0s) - Maximum boost

### Track Features
- Tropical island themed circuit
- Elevation changes
- Boost pads for extra speed
- Grass slowdown areas
- Item boxes throughout the track

### Power-Up System (10 Items)
Position-based item distribution:

| Item | Effect |
|------|--------|
| 🚀 Rocket Boost | Massive speed boost |
| ⚡ Triple Boost | Three consecutive small boosts |
| 🎯 Homing Missile | Targets racer ahead |
| 🔴 Straight Missile | Fires straight ahead |
| 🍌 Banana | Drop behind to spin out others |
| 🛢️ Oil Slick | Creates slippery area |
| 🛡️ Shield | Blocks one attack |
| ⚡ Lightning | Shrinks all opponents |
| ✨ Teleport | Warp forward (6th-8th only) |
| ❄️ Time Freeze | Slow all opponents (7th-8th only) |

### AI System
- 3 difficulty levels (Easy/Normal/Hard)
- Smart pathfinding with racing lines
- Strategic item usage
- Rubber-banding for competitive races
- Unique colors per racer

### Visual Effects
- Low-poly kart models with rotating wheels
- Drift spark particles (color-coded by level)
- Boost flame effects
- Dust particles on grass
- Speed lines at high velocity
- Explosion effects

### Audio
- Procedurally generated engine sounds
- Drift sound effects
- Boost and item sound effects
- Background racing music
- Victory fanfare

### UI/HUD
- Position indicator (1st - 8th)
- Lap counter
- Race timer
- Held item display
- Minimap with all racers
- Speed display
- Boost meter
- Wrong way warning

## 🛠️ Running the Game

1. Start a local server:
```bash
cd mario_kart
python3 -m http.server 8080
```

2. Open in browser:
```
http://localhost:8080
```

## 📁 Project Structure

```
mario_kart/
├── index.html          # Main HTML file with styles
├── js/
│   ├── utils.js        # Utility functions and constants
│   ├── audio.js        # Audio system (synthesized sounds)
│   ├── track.js        # Track generation and features
│   ├── kart.js         # Kart physics and controls
│   ├── items.js        # Power-up system
│   ├── ai.js           # AI controller
│   ├── particles.js    # Visual effects system
│   ├── ui.js           # UI/HUD manager
│   └── game.js         # Main game controller
└── README.md

python3 -m http.server 8080

http://localhost:8080
```

## 🎯 Tips for Winning

1. **Master drifting** - Hold drift through corners to build boost
2. **Time your boosts** - Use drift boosts on straights for max effect
3. **Use items strategically** - Save shields for when you're in the lead
4. **Learn the track** - Memorize turn locations for optimal racing lines
5. **Hit boost pads** - Orange pads give free speed boosts
6. **Stay on track** - Grass significantly slows you down

## 🎨 Technical Details

- Built with **Three.js r128**
- Procedural audio using **Web Audio API**
- 60 FPS target performance
- Responsive design for different screen sizes
- No external assets required - all procedurally generated

## 🏆 Success Criteria Met

✅ Complete race loop from start to finish
✅ Responsive controls with tight handling
✅ Competitive AI with rubber-banding
✅ Strategic item gameplay
✅ Smooth 60 FPS performance
✅ Cohesive visual style

Enjoy racing! 🏁
