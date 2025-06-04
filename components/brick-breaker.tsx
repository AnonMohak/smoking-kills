'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Ball extends GameObject {
  dx: number;
  dy: number;
  speed: number;
}

interface Paddle extends GameObject {}

interface Brick extends GameObject {
  destroyed: boolean;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 10;
const BALL_SIZE = 10;
const BRICK_WIDTH = 75;
const BRICK_HEIGHT = 20;
const BRICK_ROWS = 8;
const BRICK_COLS = 10;
const BRICK_PADDING = 5;
const BALL_SPEED = 5;

export default function BrickBreaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | undefined>(undefined);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const [score, setScore] = useState(0);
  
  // Game objects
  const gameStateRef = useRef({
    ball: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 50,
      width: BALL_SIZE,
      height: BALL_SIZE,
      dx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      dy: -BALL_SPEED,
      speed: BALL_SPEED
    } as Ball,
    paddle: {
      x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: CANVAS_HEIGHT - 30,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT
    } as Paddle,
    bricks: [] as Brick[],
    keys: {
      left: false,
      right: false
    }
  });

  // Initialize bricks
  const initializeBricks = useCallback(() => {
    const bricks: Brick[] = [];
    const offsetTop = 50;
    const offsetLeft = (CANVAS_WIDTH - (BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) / 2;
    
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        bricks.push({
          x: offsetLeft + col * (BRICK_WIDTH + BRICK_PADDING),
          y: offsetTop + row * (BRICK_HEIGHT + BRICK_PADDING),
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          destroyed: false
        });
      }
    }
    
    gameStateRef.current.bricks = bricks;
  }, []);

  // Collision detection
  const checkCollision = useCallback((rect1: GameObject, rect2: GameObject): boolean => {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }, []);

  // Update game logic
  const updateGame = useCallback(() => {
    const { ball, paddle, bricks, keys } = gameStateRef.current;

    // Move paddle
    if (keys.left && paddle.x > 0) {
      paddle.x -= 8;
    }
    if (keys.right && paddle.x < CANVAS_WIDTH - paddle.width) {
      paddle.x += 8;
    }

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with walls
    if (ball.x <= 0 || ball.x >= CANVAS_WIDTH - ball.width) {
      ball.dx = -ball.dx;
    }
    if (ball.y <= 0) {
      ball.dy = -ball.dy;
    }

    // Ball collision with paddle
    if (checkCollision(ball, paddle) && ball.dy > 0) {
      const hitPos = (ball.x + ball.width / 2 - paddle.x) / paddle.width;
      ball.dx = ball.speed * (hitPos - 0.5) * 2;
      ball.dy = -Math.abs(ball.dy);
    }

    // Ball collision with bricks
    let newScore = 0;
    bricks.forEach(brick => {
      if (!brick.destroyed && checkCollision(ball, brick)) {
        brick.destroyed = true;
        ball.dy = -ball.dy;
        newScore += 10;
      }
    });

    if (newScore > 0) {
      setScore(prev => prev + newScore);
    }

    // Check game over conditions
    if (ball.y > CANVAS_HEIGHT) {
      setGameState('gameOver');
      return;
    }

    // Check win condition
    if (bricks.every(brick => brick.destroyed)) {
      setGameState('won');
      return;
    }
  }, [checkCollision]);

  // Render game
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { ball, paddle, bricks } = gameStateRef.current;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw paddle
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

    // Draw ball
    ctx.fillRect(ball.x, ball.y, ball.width, ball.height);

    // Draw bricks
    bricks.forEach(brick => {
      if (!brick.destroyed) {
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      }
    });
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameState === 'playing') {
      updateGame();
      render();
      animationIdRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameState, updateGame, render]);

  // Handle keyboard input
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
        gameStateRef.current.keys.left = true;
        break;
      case 'ArrowRight':
      case 'd':
        gameStateRef.current.keys.right = true;
        break;
      case ' ':
        e.preventDefault();
        setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
        break;
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
        gameStateRef.current.keys.left = false;
        break;
      case 'ArrowRight':
      case 'd':
        gameStateRef.current.keys.right = false;
        break;
    }
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    gameStateRef.current.ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 50,
      width: BALL_SIZE,
      height: BALL_SIZE,
      dx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      dy: -BALL_SPEED,
      speed: BALL_SPEED
    };
    gameStateRef.current.paddle.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    initializeBricks();
    setScore(0);
    setGameState('playing');
  }, [initializeBricks]);

  // Initialize game and event listeners
  useEffect(() => {
    initializeBricks();
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [handleKeyDown, handleKeyUp, initializeBricks]);

  // Start/stop game loop based on game state
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoop();
    } else {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [gameState, gameLoop]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Brick Breaker</h1>
        <div className="text-xl">Score: {score}</div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-gray-300 bg-black"
        style={{ imageRendering: 'pixelated' }}
      />
      
      <div className="flex gap-2">
        {gameState === 'paused' && (
          <button
            onClick={() => setGameState('playing')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Resume
          </button>
        )}
        
        {(gameState === 'gameOver' || gameState === 'won') && (
          <div className="text-center">
            <div className="text-xl mb-2">
              {gameState === 'won' ? 'You Won!' : 'Game Over!'}
            </div>
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Play Again
            </button>
          </div>
        )}
        
        {gameState === 'playing' && (
          <button
            onClick={() => setGameState('paused')}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Pause
          </button>
        )}
        
        <button
          onClick={resetGame}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reset
        </button>
      </div>
      
      <div className="text-sm text-gray-600 text-center">
        <div>Use ← → arrow keys or A/D to move paddle</div>
        <div>Press SPACE to pause/resume</div>
      </div>
    </div>
  );
} 