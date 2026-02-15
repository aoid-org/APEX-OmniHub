import { useEffect, useRef } from 'react';

/**
 * Premium animated hero background component
 * Visualizes "orchestration" with synchronized geometric patterns
 */
export const HeroBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Node system for orchestration visualization
    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      connections: number[];
    }

    const nodes: Node[] = [];
    const nodeCount = 12;
    const connectionDistance = 250;

    // Initialize nodes with random positions/velocities
    // SECURITY: Math.random() is safe here - used for visual animation only, not cryptography
    // sonar-disable-next-line typescript:S2245
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.offsetWidth, // Visual position - non-sensitive
        y: Math.random() * canvas.offsetHeight, // Visual position - non-sensitive
        vx: (Math.random() - 0.5) * 0.3, // Animation velocity - non-sensitive
        vy: (Math.random() - 0.5) * 0.3, // Animation velocity - non-sensitive
        radius: Math.random() * 3 + 2, // Visual size - non-sensitive
        connections: [],
      });
    }

    let animationFrame: number;
    let time = 0;

    const animate = () => {
      time += 0.01;

      // Clear with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight);
      gradient.addColorStop(0, 'hsl(216, 65%, 8%)');   // Deep navy
      gradient.addColorStop(1, 'hsl(216, 65%, 14%)');  // Navy
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Gentle movement
        node.x += node.vx;
        node.y += node.vy;

        // Boundary bounce
        if (node.x < 0 || node.x > canvas.offsetWidth) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.offsetHeight) node.vy *= -1;

        // Draw connections first (behind nodes)
        node.connections = [];
        nodes.forEach((otherNode, j) => {
          if (i === j) return;
          const dx = otherNode.x - node.x;
          const dy = otherNode.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            node.connections.push(j);
            const opacity = (1 - distance / connectionDistance) * 0.3;

            // Gradient connection line
            const lineGradient = ctx.createLinearGradient(node.x, node.y, otherNode.x, otherNode.y);
            lineGradient.addColorStop(0, `hsla(195, 100%, 65%, ${opacity})`);  // Cyan
            lineGradient.addColorStop(1, `hsla(216, 65%, 45%, ${opacity})`);   // Blue

            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.stroke();
          }
        });

        // Draw node with glow
        const pulse = Math.sin(time + i) * 0.3 + 0.7;
        const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 4);
        glowGradient.addColorStop(0, `hsla(195, 100%, 75%, ${0.4 * pulse})`);
        glowGradient.addColorStop(1, 'hsla(195, 100%, 75%, 0)');

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core node
        ctx.fillStyle = `hsl(195, 100%, ${65 + pulse * 10}%)`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        // Ring accent
        ctx.strokeStyle = `hsla(195, 100%, 85%, ${0.6 * pulse})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2, 0, Math.PI * 2);
        ctx.stroke();
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateSize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.4 }}
    />
  );
};
