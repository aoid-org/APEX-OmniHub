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

    // Node system for orchestration visualization (relative positioning)
    interface Node {
      x: number; // 0-1 relative position
      y: number; // 0-1 relative position
      vx: number;
      vy: number;
      radius: number;
      connections: number[];
    }

    const nodes: Node[] = [];

    // Adaptive parameters based on viewport
    const getResponsiveParams = () => {
      const width = canvas.offsetWidth;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;

      return {
        nodeCount: isMobile ? 8 : isTablet ? 10 : 12,
        connectionDistance: isMobile ? 200 : isTablet ? 225 : 250,
        nodeSpeed: isMobile ? 0.2 : 0.3, // Slower on mobile for battery
      };
    };

    let params = getResponsiveParams();

    // Set canvas size with proper scaling
    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);

      // Update responsive parameters on resize
      const newParams = getResponsiveParams();
      if (newParams.nodeCount !== params.nodeCount) {
        // Reinitialize nodes if count changed
        initializeNodes();
      }
      params = newParams;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Initialize nodes with relative positions (0-1 range for responsiveness)
    // SECURITY: Math.random() is safe here - used for visual animation only, not cryptography
    // sonar-disable-next-line typescript:S2245
    const initializeNodes = () => {
      nodes.length = 0; // Clear existing nodes
      for (let i = 0; i < params.nodeCount; i++) {
        nodes.push({
          x: Math.random(), // 0-1 relative position - non-sensitive
          y: Math.random(), // 0-1 relative position - non-sensitive
          vx: (Math.random() - 0.5) * params.nodeSpeed / 1000, // Animation velocity - non-sensitive
          vy: (Math.random() - 0.5) * params.nodeSpeed / 1000, // Animation velocity - non-sensitive
          radius: Math.random() * 3 + 2, // Visual size - non-sensitive
          connections: [],
        });
      }
    };

    initializeNodes();

    let animationFrame: number;
    let time = 0;

    // Helper: Draw connection line between nodes (expects absolute coordinates)
    const drawConnection = (
      node: { x: number; y: number },
      otherNode: { x: number; y: number },
      distance: number
    ) => {
      const opacity = (1 - distance / params.connectionDistance) * 0.3;
      const lineGradient = ctx.createLinearGradient(node.x, node.y, otherNode.x, otherNode.y);
      lineGradient.addColorStop(0, `hsla(195, 100%, 65%, ${opacity})`);
      lineGradient.addColorStop(1, `hsla(216, 65%, 45%, ${opacity})`);

      ctx.strokeStyle = lineGradient;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(otherNode.x, otherNode.y);
      ctx.stroke();
    };

    // Helper: Find and draw connections for a node
    const processConnections = (node: Node, nodeIndex: number) => {
      node.connections = [];
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      const absoluteX = node.x * width;
      const absoluteY = node.y * height;

      for (let j = 0; j < nodes.length; j++) {
        if (nodeIndex === j) continue;

        const otherNode = nodes[j];
        const otherAbsoluteX = otherNode.x * width;
        const otherAbsoluteY = otherNode.y * height;
        const dx = otherAbsoluteX - absoluteX;
        const dy = otherAbsoluteY - absoluteY;
        const distance = Math.hypot(dx, dy);

        if (distance < params.connectionDistance) {
          node.connections.push(j);
          drawConnection(
            { ...node, x: absoluteX, y: absoluteY },
            { ...otherNode, x: otherAbsoluteX, y: otherAbsoluteY },
            distance
          );
        }
      }
    };

    // Helper: Render a single node with glow effects
    const renderNode = (node: Node, nodeIndex: number) => {
      const pulse = Math.sin(time + nodeIndex) * 0.3 + 0.7;
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      const absoluteX = node.x * width;
      const absoluteY = node.y * height;

      // Glow halo
      const glowGradient = ctx.createRadialGradient(absoluteX, absoluteY, 0, absoluteX, absoluteY, node.radius * 4);
      glowGradient.addColorStop(0, `hsla(195, 100%, 75%, ${0.4 * pulse})`);
      glowGradient.addColorStop(1, 'hsla(195, 100%, 75%, 0)');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(absoluteX, absoluteY, node.radius * 4, 0, Math.PI * 2);
      ctx.fill();

      // Core node
      ctx.fillStyle = `hsl(195, 100%, ${65 + pulse * 10}%)`;
      ctx.beginPath();
      ctx.arc(absoluteX, absoluteY, node.radius, 0, Math.PI * 2);
      ctx.fill();

      // Ring accent
      ctx.strokeStyle = `hsla(195, 100%, 85%, ${0.6 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(absoluteX, absoluteY, node.radius * 2, 0, Math.PI * 2);
      ctx.stroke();
    };

    const animate = () => {
      time += 0.01;

      // Clear with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight);
      gradient.addColorStop(0, 'hsl(216, 65%, 8%)');
      gradient.addColorStop(1, 'hsl(216, 65%, 14%)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Update and render nodes (using relative 0-1 coordinates)
      nodes.forEach((node, i) => {
        // Update position (relative 0-1 range)
        node.x += node.vx;
        node.y += node.vy;

        // Boundary bounce (clamp to 0-1 range)
        if (node.x < 0 || node.x > 1) {
          node.vx *= -1;
          node.x = Math.max(0, Math.min(1, node.x)); // Clamp
        }
        if (node.y < 0 || node.y > 1) {
          node.vy *= -1;
          node.y = Math.max(0, Math.min(1, node.y)); // Clamp
        }

        // Draw connections (behind nodes)
        processConnections(node, i);
      });

      // Render all nodes on top of connections
      nodes.forEach((node, i) => {
        renderNode(node, i);
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
