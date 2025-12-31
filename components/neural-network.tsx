'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface NeuralNetworkProps {
  particleCount?: number;
  linkDistance?: number;
  particleColor?: string;
  linkColor?: string;
  particleSize?: number;
}

export default function NeuralNetwork({
  particleCount = 60,
  linkDistance = 150,
  particleColor = 'rgba(99, 91, 255, 0.8)',
  linkColor = '99, 91, 255',
  particleSize = 2,
}: NeuralNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;
    let particles: Particle[] = [];
    let animationId: number;

    // Initialize particles
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
        });
      }
    };

    // Update particle position
    const updateParticle = (p: Particle) => {
      p.x += p.vx;
      p.y += p.vy;

      // Bounce off edges
      if (p.x >= w || p.x <= 0) p.vx *= -1;
      if (p.y >= h || p.y <= 0) p.vy *= -1;

      // Keep in bounds
      if (p.x > w) p.x = w;
      if (p.y > h) p.y = h;
      if (p.x < 0) p.x = 0;
      if (p.y < 0) p.y = 0;
    };

    // Draw particle
    const drawParticle = (p: Particle) => {
      ctx.fillStyle = particleColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, particleSize, 0, Math.PI * 2);
      ctx.fill();
    };

    // Calculate distance between two points
    const distance = (x1: number, y1: number, x2: number, y2: number) => {
      return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    };

    // Draw connections between nearby particles
    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dist = distance(
            particles[i].x,
            particles[i].y,
            particles[j].x,
            particles[j].y
          );

          if (dist < linkDistance) {
            const opacity = (1 - dist / linkDistance) * 0.5;
            ctx.strokeStyle = `rgba(${linkColor}, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      // Draw connections first (behind particles)
      drawConnections();

      // Update and draw particles
      particles.forEach((p) => {
        updateParticle(p);
        drawParticle(p);
      });

      animationId = requestAnimationFrame(animate);
    };

    // Handle resize
    const handleResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
      initParticles();
    };

    window.addEventListener('resize', handleResize);
    initParticles();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [particleCount, linkDistance, particleColor, linkColor, particleSize]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
