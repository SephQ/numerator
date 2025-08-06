# Numerator Game

A pure JavaScript arcade-style game where you play as a number and collect or avoid other numbers to survive!

## How to Play

### Controls
- **Move Left/Right**: A/D keys or Left/Right arrow keys
- **Jump**: W key, Up arrow, or Mouse Click
- **Pause/Menu**: ESC key

### Gameplay
- You start as the number **0**
- **+N numbers** (green): Collect these to increase your score
- **-N numbers** (red): These will attack when you get close and subtract from your score
- **Division lines** (/N): Jump over these to avoid being divided
- Your movement speed increases as your number grows (capped for playability)
- **Don't let your score go below 0 or you die!**

### Game Elements

#### Adders (+N)
- Appear as green squares with white text
- Static objects that you can collect by touching
- Add their value to your current number

#### Subtractors (-N)
- Appear as red squares with white text
- Start static but will "stab" at you when you get close
- Will attack with a swift motion and subtract their value
- Become more aggressive with pulsing animations when attacking

#### Divisors (/N)
- Appear as orange horizontal lines spanning the screen
- Filled with repeated "/N" text
- The only way to avoid them is to jump over
- If you touch them while on the ground, your number gets divided by N (rounded down)

#### Multipliers (*N)
- Appear as small golden squares with white text
- By default are guarded by 4 subtractors
- Will multiply your current number by N

### Features
- Beautiful gradient backgrounds and animations
- Smooth player movement and physics
- Dynamic difficulty scaling based on your score
- Animated starfield background
- Responsive design that works on different screen sizes
- Clean, modern UI with hover effects

## Technical Details

- **Pure JavaScript** - No frameworks or libraries
- **HTML5 Canvas** for game rendering
- **CSS3** for UI styling and animations
- **Responsive design** that adapts to screen size
- **60 FPS** game loop using requestAnimationFrame

## File Structure

```
Numerator/
├── index.html    # Main game file with HTML structure and CSS
├── game.js       # Game logic and JavaScript code
└── README.md     # This file
```

## Getting Started

1. Open `index.html` in any modern web browser
2. Click "Start Game" to begin playing
3. Use the controls to move and jump
4. Try to get the highest score possible!

## Game Tips

- Jump early when you see division lines approaching
- Sometimes it's worth taking a small negative number to avoid a larger one
- Your speed increases with your score, so plan your movements accordingly
- Use the walls to help control your movement - you can't fall off the sides
- Practice the timing of jumps to master avoiding division lines

Enjoy the game!
