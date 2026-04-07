import { useEffect, useRef, useState, useCallback } from 'react';
import { Tool } from './Toolbar';

interface SimpleCanvasProps {
  activeTool: Tool;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  onHistoryUpdate?: (history: string[], index: number) => void;
}

export default function SimpleCanvas({ activeTool, onCanvasReady, onHistoryUpdate }: SimpleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  
  // Shape management for resizing
  const [shapes, setShapes] = useState<Array<{
    type: 'rectangle' | 'circle' | 'line' | 'arrow';
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
    endX?: number;
    endY?: number;
  }>>([]);
  const [selectedShape, setSelectedShape] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Save canvas state for undo/redo (using data URL for memory efficiency)
  const saveCanvasState = useCallback(() => {
    if (!canvasRef.current) return;
    
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png', 0.8); // Compress to 80% quality
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(dataUrl);
      
      // Limit history to 10 states to prevent memory issues
      if (newHistory.length > 10) {
        newHistory.shift(); // Remove oldest state
      }
      
      setHistory(newHistory);
      const newIndex = newHistory.length - 1;
      setHistoryIndex(newIndex);
      
      // Notify parent component of history update
      if (onHistoryUpdate) {
        onHistoryUpdate(newHistory, newIndex);
      }
    } catch (error) {
      console.error('Error saving canvas state:', error);
    }
  }, [history, historyIndex, onHistoryUpdate]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight; // Full screen height

    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save initial state
    saveCanvasState();

    // Handle window resize
    const handleResize = () => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(imageData, 0, 0);
    };

    window.addEventListener('resize', handleResize);

    if (onCanvasReady) {
      onCanvasReady(canvas);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [saveCanvasState, onCanvasReady]);

  // Get mouse position relative to canvas
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Draw rectangle
  const drawRectangle = (ctx: CanvasRenderingContext2D, start: { x: number; y: number }, end: { x: number; y: number }) => {
    const width = end.x - start.x;
    const height = end.y - start.y;
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(start.x, start.y, width, height);
  };

// Draw resize handles
  const drawResizeHandles = (ctx: CanvasRenderingContext2D, shape: any) => {
    const handleSize = 8;
    ctx.fillStyle = '#4A90E2';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;

    if (shape.type === 'rectangle') {
      // Corner handles
      const handles = [
        { x: shape.x, y: shape.y }, // top-left
        { x: shape.x + shape.width, y: shape.y }, // top-right
        { x: shape.x, y: shape.y + shape.height }, // bottom-left
        { x: shape.x + shape.width, y: shape.y + shape.height } // bottom-right
      ];
      
      handles.forEach(handle => {
        ctx.fillRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
        ctx.strokeRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
      });
    } else if (shape.type === 'circle') {
      // Cardinal points on circle
      const handles = [
        { x: shape.x + shape.radius, y: shape.y }, // right
        { x: shape.x - shape.radius, y: shape.y }, // left
        { x: shape.x, y: shape.y + shape.radius }, // bottom
        { x: shape.x, y: shape.y - shape.radius } // top
      ];
      
      handles.forEach(handle => {
        ctx.fillRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
        ctx.strokeRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
      });
    }
  };

// Get resize handle at position
  const getResizeHandle = (shape: any, pos: { x: number; y: number }, tolerance: number = 10): string => {
    const handleSize = 10;
    
    if (shape.type === 'rectangle') {
      const handles = [
        { x: shape.x, y: shape.y, type: 'nw' },
        { x: shape.x + shape.width, y: shape.y, type: 'ne' },
        { x: shape.x, y: shape.y + shape.height, type: 'sw' },
        { x: shape.x + shape.width, y: shape.y + shape.height, type: 'se' }
      ];
      
      for (const handle of handles) {
        const dist = Math.sqrt(Math.pow(pos.x - handle.x, 2) + Math.pow(pos.y - handle.y, 2));
        if (dist <= tolerance) return handle.type;
      }
    } else if (shape.type === 'circle') {
      const handles = [
        { x: shape.x + shape.radius, y: shape.y, type: 'e' },
        { x: shape.x - shape.radius, y: shape.y, type: 'w' },
        { x: shape.x, y: shape.y + shape.radius, type: 's' },
        { x: shape.x, y: shape.y - shape.radius, type: 'n' }
      ];
      
      for (const handle of handles) {
        const dist = Math.sqrt(Math.pow(pos.x - handle.x, 2) + Math.pow(pos.y - handle.y, 2));
        if (dist <= tolerance) return handle.type;
      }
    }
    
    return '';
  };

  // Draw circle
  const drawCircle = (ctx: CanvasRenderingContext2D, start: { x: number; y: number }, end: { x: number; y: number }) => {
    const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
    ctx.stroke();
  };

  // Draw line
  const drawLine = (ctx: CanvasRenderingContext2D, start: { x: number; y: number }, end: { x: number; y: number }) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  };

  // Draw arrow
  const drawArrow = (ctx: CanvasRenderingContext2D, start: { x: number; y: number }, end: { x: number; y: number }) => {
    const headLength = 15;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    
    // Draw line
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    
    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pos = getMousePos(e);
    
    // Check if clicking on existing shape for selection
    let clickedShapeIndex = -1;
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (shape.type === 'rectangle') {
        if (shape.width && shape.height &&
            pos.x >= shape.x && pos.x <= shape.x + shape.width &&
            pos.y >= shape.y && pos.y <= shape.y + shape.height) {
          clickedShapeIndex = i;
          break;
        }
      } else if (shape.type === 'circle') {
        const dist = Math.sqrt(Math.pow(pos.x - shape.x, 2) + Math.pow(pos.y - shape.y, 2));
        if (shape.radius !== undefined && dist <= shape.radius) {
          clickedShapeIndex = i;
          break;
        }
      }
    }
    
    // If clicking on a shape, handle based on active tool
    if (clickedShapeIndex !== -1) {
      if (activeTool === 'select') {
        // Start dragging the shape
        setSelectedShape(clickedShapeIndex);
        setIsDragging(true);
        const shape = shapes[clickedShapeIndex];
        setDragOffset({
          x: pos.x - shape.x,
          y: pos.y - shape.y
        });
        return;
      } else {
        // Check for resize handles
        const handle = getResizeHandle(shapes[clickedShapeIndex], pos);
        if (handle) {
          setIsResizing(true);
          setResizeHandle(handle);
          setSelectedShape(clickedShapeIndex);
          return;
        } else {
          setSelectedShape(clickedShapeIndex);
          return;
        }
      }
    }
    
    // Clear selection if clicking on empty space (only for non-select tools)
    if (activeTool !== 'select') {
      setSelectedShape(null);
    }
    
    // For eraser and select, don't set isDrawing immediately - wait for mouse move
    if (activeTool !== 'eraser' && activeTool !== 'select') {
      setIsDrawing(true);
      setStartPoint(pos);
    }

    if (activeTool === 'pencil') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (activeTool === 'text') {
      // Create editable text field
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'Type here';
      input.style.position = 'absolute';
      input.style.left = `${e.clientX}px`;
      input.style.top = `${e.clientY}px`;
      input.style.fontSize = '20px';
      input.style.border = '1px solid #000';
      input.style.padding = '2px 4px';
      input.style.background = 'white';
      input.style.zIndex = '1000';
      
      document.body.appendChild(input);
      input.focus();
      input.select();
      
      const handleTextSubmit = () => {
        const text = input.value.trim();
        if (text && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.font = '20px Arial';
            ctx.fillStyle = '#000000';
            ctx.fillText(text, pos.x, pos.y);
            saveCanvasState();
          }
        }
        document.body.removeChild(input);
      };
      
      input.addEventListener('blur', handleTextSubmit);
      input.addEventListener('keydown', (keyEvent) => {
        if (keyEvent.key === 'Enter') {
          handleTextSubmit();
        } else if (keyEvent.key === 'Escape') {
          document.body.removeChild(input);
        }
      });
      
      setIsDrawing(false);
    } else if (activeTool === 'eraser') {
      // Eraser works like rubber - only erase what it touches
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI); // Larger eraser size
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      saveCanvasState();
    }
  };

  // Handle mouse move with throttling for better performance
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pos = getMousePos(e);

    // Handle dragging shapes
    if (isDragging && selectedShape !== null && activeTool === 'select') {
      const updatedShapes = [...shapes];
      const shape = updatedShapes[selectedShape];
      
      // Update shape position based on mouse position and drag offset
      shape.x = pos.x - dragOffset.x;
      shape.y = pos.y - dragOffset.y;
      
      // For lines and arrows, update end points as well
      if (shape.type === 'line' || shape.type === 'arrow') {
        if (shape.endX !== undefined && shape.endY !== undefined) {
          const deltaX = pos.x - dragOffset.x - shape.x;
          const deltaY = pos.y - dragOffset.y - shape.y;
          shape.endX = shape.x + deltaX;
          shape.endY = shape.y + deltaY;
        }
      }
      
      setShapes(updatedShapes);
      return;
    }

    // Handle real-time resize preview
    if (isResizing && selectedShape !== null) {
      const shape = shapes[selectedShape];
      const handle = resizeHandle;
      
      // Create preview shape
      const previewShape = { ...shape };
      
      if (shape.type === 'rectangle') {
        if (handle === 'se') {
          previewShape.width = pos.x - shape.x;
          previewShape.height = pos.y - shape.y;
        } else if (handle === 'sw') {
          previewShape.width = shape.x - pos.x;
          previewShape.height = pos.y - shape.y;
          previewShape.x = pos.x;
          previewShape.y = pos.y;
        } else if (handle === 'ne') {
          previewShape.width = pos.x - shape.x;
          previewShape.height = pos.y - shape.y;
          previewShape.y = pos.y;
        } else if (handle === 'nw') {
          previewShape.width = shape.x - pos.x;
          previewShape.height = shape.y - pos.y;
          previewShape.x = pos.x;
          previewShape.y = pos.y;
        }
      } else if (shape.type === 'circle') {
        const dist = Math.sqrt(Math.pow(pos.x - shape.x, 2) + Math.pow(pos.y - shape.y, 2));
        previewShape.radius = dist;
      }
      
      // Render preview
      requestAnimationFrame(() => {
        renderCanvas();
        
        // Draw preview shape with dashed lines
        ctx.strokeStyle = '#4A90E2';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        if (previewShape.type === 'rectangle') {
          if (previewShape.width !== undefined && previewShape.height !== undefined) {
            ctx.strokeRect(previewShape.x, previewShape.y, previewShape.width, previewShape.height);
          }
        } else if (previewShape.type === 'circle') {
          ctx.beginPath();
          if (previewShape.radius !== undefined) {
            ctx.arc(previewShape.x, previewShape.y, previewShape.radius, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
        
        ctx.setLineDash([]);
      });
      
      return;
    }

    // Start drawing if using eraser and moving
    if (activeTool === 'eraser' && !isDrawing) {
      setIsDrawing(true);
      setStartPoint(pos);
      
      // Erase immediately on mouse down for eraser
      if (ctx) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, 15, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        saveCanvasState();
      }
    }

    if (!isDrawing || activeTool === 'select') return;

    if (activeTool === 'pencil') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (activeTool === 'eraser') {
      // Eraser works like rubber - only erase what it touches
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI); // Larger eraser size
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (['rectangle', 'circle', 'line', 'arrow'].includes(activeTool)) {
      // Throttled shape preview for better performance
      requestAnimationFrame(() => {
        if (canvasRef.current) {
          const currentCtx = canvasRef.current?.getContext('2d');
          if (currentCtx && canvasRef.current) {
            // Render all existing shapes first
            renderCanvas();
            
            // Draw preview shape with dashed lines
            currentCtx.strokeStyle = '#4A90E2';
            currentCtx.lineWidth = 2;
            currentCtx.setLineDash([5, 5]);
            
            if (activeTool === 'rectangle') {
              drawRectangle(currentCtx, startPoint, pos);
            } else if (activeTool === 'circle') {
              drawCircle(currentCtx, startPoint, pos);
            } else if (activeTool === 'line') {
              drawLine(currentCtx, startPoint, pos);
            } else if (activeTool === 'arrow') {
              drawArrow(currentCtx, startPoint, pos);
            }
            
            currentCtx.setLineDash([]);
          }
        }
      });
    }
  };

  // Handle mouse up
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pos = getMousePos(e);

    // Handle end of dragging
    if (isDragging) {
      setIsDragging(false);
      saveCanvasState();
      return;
    }

    if (isResizing && selectedShape !== null) {
      // Handle resizing
      const shape = shapes[selectedShape];
      const handle = resizeHandle;
      
      if (shape.type === 'rectangle') {
        if (handle === 'se') {
          shape.width = pos.x - shape.x;
          shape.height = pos.y - shape.y;
        } else if (handle === 'sw') {
          shape.width = shape.x - pos.x;
          shape.height = pos.y - shape.y;
          shape.x = pos.x;
          shape.y = pos.y;
        } else if (handle === 'ne') {
          shape.width = pos.x - shape.x;
          shape.height = pos.y - shape.y;
          shape.y = pos.y;
        } else if (handle === 'nw') {
          shape.width = shape.x - pos.x;
          shape.height = shape.y - pos.y;
          shape.x = pos.x;
          shape.y = pos.y;
        }
      } else if (shape.type === 'circle') {
        const dist = Math.sqrt(Math.pow(pos.x - shape.x, 2) + Math.pow(pos.y - shape.y, 2));
        shape.radius = dist;
      }
      
      setIsResizing(false);
      setResizeHandle('');
      saveCanvasState();
    } else if (isDrawing && activeTool !== 'select') {
      if (activeTool === 'rectangle') {
        const newShape = {
          type: 'rectangle' as const,
          x: Math.min(startPoint.x, pos.x),
          y: Math.min(startPoint.y, pos.y),
          width: Math.abs(pos.x - startPoint.x),
          height: Math.abs(pos.y - startPoint.y)
        };
        setShapes([...shapes, newShape]);
        drawRectangle(ctx, startPoint, pos);
        saveCanvasState();
      } else if (activeTool === 'circle') {
        const newShape = {
          type: 'circle' as const,
          x: startPoint.x,
          y: startPoint.y,
          radius: Math.sqrt(Math.pow(pos.x - startPoint.x, 2) + Math.pow(pos.y - startPoint.y, 2))
        };
        setShapes([...shapes, newShape]);
        drawCircle(ctx, startPoint, pos);
        saveCanvasState();
      } else if (activeTool === 'line') {
        const newShape = {
          type: 'line' as const,
          x: startPoint.x,
          y: startPoint.y,
          endX: pos.x,
          endY: pos.y
        };
        setShapes([...shapes, newShape]);
        drawLine(ctx, startPoint, pos);
        saveCanvasState();
      } else if (activeTool === 'arrow') {
        const newShape = {
          type: 'arrow' as const,
          x: startPoint.x,
          y: startPoint.y,
          endX: pos.x,
          endY: pos.y
        };
        setShapes([...shapes, newShape]);
        drawArrow(ctx, startPoint, pos);
        saveCanvasState();
      } else if (activeTool === 'pencil') {
        saveCanvasState();
      }
    }

    setIsDrawing(false);
  };

  // Handle image upload
  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (!canvas || !ctx) return;

          // Scale image to fit canvas
          const scale = Math.min(
            (canvas.width * 0.5) / img.width,
            (canvas.height * 0.5) / img.height
          );
          
          const width = img.width * scale;
          const height = img.height * scale;
          const x = (canvas.width - width) / 2;
          const y = (canvas.height - height) / 2;
          
          ctx.drawImage(img, x, y, width, height);
          saveCanvasState();
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Handle image tool
  useEffect(() => {
    if (activeTool === 'image') {
      handleImageUpload();
    }
  }, [activeTool]);

  // Undo/Redo methods (exposed via ref)
  const undo = useCallback(() => {
    if (historyIndex > 0 && canvasRef.current && history[historyIndex - 1]) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = history[newIndex];
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1 && canvasRef.current && history[historyIndex + 1]) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = history[newIndex];
    }
  }, [history, historyIndex]);

  const clear = useCallback(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        saveCanvasState();
      }
    }
  }, [saveCanvasState]);

  // Delete selected shape
  const deleteSelectedShape = useCallback(() => {
    if (selectedShape !== null) {
      const newShapes = shapes.filter((_, index) => index !== selectedShape);
      setShapes(newShapes);
      setSelectedShape(null);
      saveCanvasState();
    }
  }, [selectedShape, shapes, saveCanvasState]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedShape();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedShape]);

  // Export canvas as image data URL
  const toDataURL = useCallback(() => {
    return canvasRef.current?.toDataURL('image/png', 1.0) || '';
  }, []);

  // Expose methods via ref
  useEffect(() => {
    if (canvasRef.current) {
      (canvasRef.current as any).undo = undo;
      (canvasRef.current as any).redo = redo;
      (canvasRef.current as any).clear = clear;
      (canvasRef.current as any).toDataURL = toDataURL;
    }
  }, [undo, redo, clear, toDataURL]);

  // Render canvas with shapes and handles
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear and redraw
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all shapes
    shapes.forEach((shape) => {
      if (shape.type === 'rectangle') {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        if (shape.width !== undefined && shape.height !== undefined) {
          ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        }
      } else if (shape.type === 'circle') {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (shape.radius !== undefined) {
          ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
      } else if (shape.type === 'line') {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (shape.endX !== undefined && shape.endY !== undefined) {
          ctx.moveTo(shape.x, shape.y);
          ctx.lineTo(shape.endX, shape.endY);
          ctx.stroke();
        }
      } else if (shape.type === 'arrow') {
        if (shape.endX !== undefined && shape.endY !== undefined) {
          drawArrow(ctx, { x: shape.x, y: shape.y }, { x: shape.endX, y: shape.endY });
        }
      }
    });

    // Draw resize handles for selected shape
    if (selectedShape !== null && !isDrawing) {
      drawResizeHandles(ctx, shapes[selectedShape]);
    }
  }, [shapes, selectedShape, isDrawing]);

  // Update canvas when shapes change
  useEffect(() => {
    renderCanvas();
  }, [shapes, selectedShape, isDrawing]);

  // Update cursor based on hover state
  const updateCursor = useCallback((pos: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return 'crosshair';

    // Check if hovering over resize handle (only for select tool)
    if (selectedShape !== null) {
      const handle = getResizeHandle(shapes[selectedShape], pos);
      if (handle) {
        return handle.includes('n') || handle.includes('s') ? 'ns-resize' : 'ew-resize';
      }
    }

    // Check if hovering over shape (only show move cursor for select tool)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (shape.type === 'rectangle') {
        if (shape.width && shape.height &&
            pos.x >= shape.x && pos.x <= shape.x + shape.width &&
            pos.y >= shape.y && pos.y <= shape.y + shape.height) {
          return activeTool === 'select' ? 'move' : 'crosshair';
        }
      } else if (shape.type === 'circle') {
        const dist = Math.sqrt(Math.pow(pos.x - shape.x, 2) + Math.pow(pos.y - shape.y, 2));
        if (shape.radius !== undefined && dist <= shape.radius) {
          return activeTool === 'select' ? 'move' : 'crosshair';
        }
      }
    }

    return 'crosshair';
  }, [shapes, selectedShape, activeTool]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ 
          imageRendering: 'crisp-edges',
          touchAction: 'none',
          cursor: updateCursor(getMousePos({ clientX: 0, clientY: 0 } as any))
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          const pos = getMousePos(e);
          // Update cursor
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.style.cursor = updateCursor(pos);
          }
          handleMouseMove(e);
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDrawing(false);
          if (canvasRef.current) {
            canvasRef.current.style.cursor = 'crosshair';
          }
        }}
      />
      
      {/* Drawing Instructions */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
        <h3 className="font-semibold text-sm mb-2">How to use:</h3>
        <ul className="text-xs space-y-1 text-gray-600">
          <li>• Select a tool from the toolbar</li>
          <li>• Draw your math equation</li>
          <li>• Click shapes to select & resize</li>
          <li>• Drag handles for smooth resizing</li>
          <li>• Press <span className="bg-red-100 px-1 rounded">Delete/Backspace</span> to remove selected shape</li>
          <li>• Click the <span className="bg-blue-100 px-1 rounded">Calculate button</span> to get answer</li>
        </ul>
      </div>
    </div>
  );
}
