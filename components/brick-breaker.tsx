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

export default function BrickBreaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | undefined>(undefined);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(2); // Initial speed
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  
  // Update canvas size based on window size
  useEffect(() => {
    const updateCanvasSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setCanvasSize({ width, height });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  const CANVAS_WIDTH = canvasSize.width;
  const CANVAS_HEIGHT = canvasSize.height;
  const PADDLE_WIDTH = Math.max(120, CANVAS_WIDTH * 0.1);
  const PADDLE_HEIGHT = 12;
  const BALL_SIZE = 12;
  const BRICK_WIDTH = Math.max(60, (CANVAS_WIDTH - 200) / 15);
  const BRICK_HEIGHT = 25;
  const BRICK_ROWS = 8;
  const BRICK_COLS = Math.floor((CANVAS_WIDTH - 100) / (BRICK_WIDTH + 8));
  const BRICK_PADDING = 8;
  const INITIAL_BALL_SPEED = 2;
  const MAX_BALL_SPEED = 8;
  const SPEED_INCREASE_FACTOR = 0.1;
  
  // Game objects
  const gameStateRef = useRef({
    ball: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 80,
      width: BALL_SIZE,
      height: BALL_SIZE,
      dx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      dy: -INITIAL_BALL_SPEED,
      speed: INITIAL_BALL_SPEED
    } as Ball,
    paddle: {
      x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: CANVAS_HEIGHT - 40,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT
    } as Paddle,
    bricks: [] as Brick[],
    keys: {
      left: false,
      right: false
    },
    totalBricksDestroyed: 0
  });

  // Initialize bricks
  const initializeBricks = useCallback(() => {
    const bricks: Brick[] = [];
    const offsetTop = 80;
    const totalBricksWidth = BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING;
    const offsetLeft = (CANVAS_WIDTH - totalBricksWidth) / 2;
    
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
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, BRICK_WIDTH, BRICK_COLS]);

  // Update game objects when canvas size changes
  useEffect(() => {
    gameStateRef.current.ball.x = CANVAS_WIDTH / 2;
    gameStateRef.current.ball.y = CANVAS_HEIGHT - 80;
    gameStateRef.current.paddle.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    gameStateRef.current.paddle.y = CANVAS_HEIGHT - 40;
    gameStateRef.current.paddle.width = PADDLE_WIDTH;
    initializeBricks();
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, initializeBricks]);

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
      paddle.x -= 10;
    }
    if (keys.right && paddle.x < CANVAS_WIDTH - paddle.width) {
      paddle.x += 10;
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
      const newDx = ball.speed * (hitPos - 0.5) * 2;
      ball.dx = newDx;
      ball.dy = -Math.abs(ball.dy);
    }

    // Ball collision with bricks
    let newScore = 0;
    bricks.forEach(brick => {
      if (!brick.destroyed && checkCollision(ball, brick)) {
        brick.destroyed = true;
        ball.dy = -ball.dy;
        newScore += 10;
        gameStateRef.current.totalBricksDestroyed++;
      }
    });

    if (newScore > 0) {
      setScore(prev => prev + newScore);
      
      // Increase speed progressively
      const newSpeed = Math.min(
        INITIAL_BALL_SPEED + (gameStateRef.current.totalBricksDestroyed * SPEED_INCREASE_FACTOR),
        MAX_BALL_SPEED
      );
      
      // Update ball speed and direction vectors
      const currentDirection = Math.atan2(ball.dy, ball.dx);
      ball.speed = newSpeed;
      ball.dx = Math.cos(currentDirection) * newSpeed;
      ball.dy = Math.sin(currentDirection) * newSpeed;
      
      setSpeed(newSpeed);
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
  }, [checkCollision, CANVAS_WIDTH, CANVAS_HEIGHT]);

  // Render game
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { ball, paddle, bricks } = gameStateRef.current;

    // Clear canvas with deep black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw paddle with white glass effect
    const paddleGradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
    paddleGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    paddleGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
    paddleGradient.addColorStop(1, 'rgba(255, 255, 255, 0.5)');
    ctx.fillStyle = paddleGradient;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    
    // Add paddle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);

    // Draw ball with glowing white effect
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ball.x, ball.y, ball.width, ball.height);
    ctx.shadowBlur = 0;

    // Draw bricks with monochrome glass gradients
    bricks.forEach((brick, index) => {
      if (!brick.destroyed) {
        const row = Math.floor(index / BRICK_COLS);
        
        // Create opacity gradient based on row (top rows more transparent)
        const baseOpacity = 0.3 + (row * 0.08); // 0.3 to 0.86
        
        const brickGradient = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
        brickGradient.addColorStop(0, `rgba(255, 255, 255, ${Math.min(baseOpacity + 0.2, 0.9)})`);
        brickGradient.addColorStop(0.5, `rgba(255, 255, 255, ${baseOpacity})`);
        brickGradient.addColorStop(1, `rgba(255, 255, 255, ${Math.max(baseOpacity - 0.1, 0.2)})`);
        
        ctx.fillStyle = brickGradient;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        
        // Add glass border effect
        ctx.strokeStyle = `rgba(255, 255, 255, ${baseOpacity * 0.5})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        
        // Add inner highlight for glass effect
        ctx.strokeStyle = `rgba(255, 255, 255, ${baseOpacity * 0.3})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(brick.x + 1, brick.y + 1, brick.width - 2, brick.height - 2);
      }
    });

    // Draw minimal game state overlay
    if (gameState === 'paused') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.font = '24px Arial';
      ctx.fillText('Press SPACE to resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
    }

    if (gameState === 'gameOver') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.font = '24px Arial';
      ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
      ctx.fillText('Press R to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
    }

    if (gameState === 'won') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('VICTORY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.font = '24px Arial';
      ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
      ctx.fillText('Press R to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
    }
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, BRICK_COLS, gameState, score]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameState === 'playing') {
      updateGame();
      render();
      animationIdRef.current = requestAnimationFrame(gameLoop);
    } else {
      render(); // Still render paused/game over states
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
      case 'r':
      case 'R':
        resetGame();
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
      y: CANVAS_HEIGHT - 80,
      width: BALL_SIZE,
      height: BALL_SIZE,
      dx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      dy: -INITIAL_BALL_SPEED,
      speed: INITIAL_BALL_SPEED
    };
    gameStateRef.current.paddle.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    gameStateRef.current.totalBricksDestroyed = 0;
    initializeBricks();
    setScore(0);
    setSpeed(INITIAL_BALL_SPEED);
    setGameState('playing');
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, initializeBricks]);

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
    gameLoop();
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [gameLoop]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full bg-black"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
} 