import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { Tool } from './Toolbar';

interface FabricCanvasProps {
  activeTool: Tool;
  onCanvasReady?: (canvas: fabric.Canvas) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onStateSave?: () => void;
}

export default function FabricCanvas({ activeTool, onCanvasReady, onUndo, onRedo, onStateSave }: FabricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // Use refs for history to avoid dependency loops and re-renders
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

  // State for UI triggers if needed, but not for the history itself to avoid event rebinding
  const [, setHistoryTick] = useState(0);

  // Save canvas state for undo/redo
  const saveCanvasState = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const canvasData = JSON.stringify(fabricCanvasRef.current.toJSON());

    // Efficiently manage history using ref
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(canvasData);

    // Limit history size for performance
    if (newHistory.length > 20) {
      newHistory.shift();
    }

    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;

    // Trigger a re-render only if absolutely necessary for UI
    setHistoryTick(prev => prev + 1);
  }, []);

  // Handle delete key and keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Don't delete if we're in text editing mode
      const activeObject = canvas.getActiveObject();
      if (activeObject && !(activeObject instanceof fabric.IText && activeObject.isEditing)) {
        canvas.remove(activeObject);
        saveCanvasState();
      }
    }
    // Ctrl+Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      onUndo?.();
    }
    // Ctrl+Y or Ctrl+Shift+Z for redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      onRedo?.();
    }
  }, [onUndo, onRedo, saveCanvasState]);

  // Initialize fabric canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return; // Prevent re-initialization

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight - 64, // Account for navbar height
      backgroundColor: 'white',
      selection: activeTool === 'select',
      renderOnAddRemove: true, // Keep standard behavior for now
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    // Set up canvas defaults
    if (!canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    }

    // Optimize Brush Performance
    const brush = canvas.freeDrawingBrush as fabric.PencilBrush;
    brush.width = 2;
    brush.color = '#000000';
    brush.decimate = 1.5; // Smooths out path by removing close points

    // Save initial state
    saveCanvasState();

    // Handle window resize
    const handleResize = () => {
      canvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 64
      });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);

    if (onCanvasReady) {
      onCanvasReady(canvas);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []); // Empty dependency array - run only once

  // Update canvas mode based on active tool (Only re-runs when tool changes)
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    // Reset all modes
    canvas.isDrawingMode = false;
    canvas.selection = activeTool === 'select';
    canvas.defaultCursor = 'default';
    canvas.forEachObject(obj => {
      obj.selectable = activeTool === 'select';
      obj.evented = activeTool === 'select';
    });

    switch (activeTool) {
      case 'select':
        canvas.defaultCursor = 'move';
        break;

      case 'hand':
        canvas.defaultCursor = 'grab';
        break;

      case 'pencil':
        canvas.isDrawingMode = true;
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.width = 2;
          canvas.freeDrawingBrush.color = '#000000';
        }
        break;

      case 'eraser':
        canvas.isDrawingMode = true;
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.width = 20;
          canvas.freeDrawingBrush.color = '#FFFFFF';
        }
        break;

      case 'rectangle':
      case 'circle':
      case 'line':
      case 'arrow':
        canvas.defaultCursor = 'crosshair';
        break;

      case 'text':
        canvas.defaultCursor = 'text';
        break;

      case 'image':
        canvas.defaultCursor = 'pointer';
        break;
    }

    canvas.renderAll();
  }, [activeTool]);

  // Handle mouse events for shape drawing (Re-runs only when tool or brush settings change)
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    let isDrawingShape = false;
    let startPoint: { x: number; y: number } | null = null;
    let currentShape: fabric.Object | null = null;

    const handleMouseDown = (e: fabric.TEvent) => {
      if (activeTool === 'select' || activeTool === 'hand' || canvas.isDrawingMode) {
        return;
      }

      const pointer = canvas.getScenePoint(e.e);
      isDrawingShape = true;
      startPoint = pointer;

      if (activeTool === 'rectangle') {
        currentShape = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        canvas.add(currentShape);
      } else if (activeTool === 'circle') {
        currentShape = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 0,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        canvas.add(currentShape);
      } else if (activeTool === 'line' || activeTool === 'arrow') {
        currentShape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: '#000000',
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        canvas.add(currentShape);
      } else if (activeTool === 'text') {
        isDrawingShape = false;
        const text = new fabric.IText('Type here...', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: '#000000',
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        saveCanvasState();
      }
    };

    const handleMouseMove = (e: fabric.TEvent) => {
      if (!isDrawingShape || !startPoint || !currentShape) return;

      const pointer = canvas.getScenePoint(e.e);

      if (activeTool === 'rectangle' && currentShape instanceof fabric.Rect) {
        currentShape.set({
          left: Math.min(pointer.x, startPoint.x),
          top: Math.min(pointer.y, startPoint.y),
          width: Math.abs(pointer.x - startPoint.x),
          height: Math.abs(pointer.y - startPoint.y),
        });
      } else if (activeTool === 'circle' && currentShape instanceof fabric.Circle) {
        const radius = Math.sqrt(
          Math.pow(pointer.x - startPoint.x, 2) + Math.pow(pointer.y - startPoint.y, 2)
        );
        currentShape.set({ radius });
      } else if ((activeTool === 'line' || activeTool === 'arrow') && currentShape instanceof fabric.Line) {
        currentShape.set({
          x2: pointer.x,
          y2: pointer.y,
        });
      }

      canvas.renderAll();
    };

    const handleMouseUp = () => {
      if (isDrawingShape && currentShape) {
        // Check if shape has actual size, otherwise remove it
        let isValid = false;
        if (currentShape instanceof fabric.Rect) {
          isValid = currentShape.width! > 1 || currentShape.height! > 1;
        } else if (currentShape instanceof fabric.Circle) {
          isValid = currentShape.radius! > 1;
        } else if (currentShape instanceof fabric.Line) {
          isValid = Math.abs(currentShape.x1! - currentShape.x2!) > 1 || Math.abs(currentShape.y1! - currentShape.y2!) > 1;
        }

        if (!isValid) {
          canvas.remove(currentShape);
        } else {
          currentShape.set({
            selectable: activeTool === 'select',
            evented: activeTool === 'select'
          });
          saveCanvasState();
        }

        isDrawingShape = false;
        startPoint = null;
        currentShape = null;
      }
    };

    // Save state on free drawing fixed
    const handlePathCreated = () => {
      onStateSave?.();
    };

    // Save state on object modification (moving, scaling)
    const handleObjectModified = () => {
      onStateSave?.();
    }

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('path:created', handlePathCreated);
    canvas.on('object:modified', handleObjectModified);

    // Handle image upload logic
    if (activeTool === 'image') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          if (!event.target?.result) return;

          fabric.Image.fromURL(event.target.result as string, {
            crossOrigin: 'anonymous'
          }).then((img: fabric.Image) => {
            const canvas = fabricCanvasRef.current;
            if (!canvas) return;

            // Scale image to fit within canvas
            const scale = Math.min(
              (canvas.width! * 0.5) / img.width!,
              (canvas.height! * 0.5) / img.height!
            );

            img.scale(scale);
            img.set({
              left: (canvas.width! - img.width! * scale) / 2,
              top: (canvas.height! - img.height! * scale) / 2,
            });

            canvas.add(img);
            canvas.setActiveObject(img);
            saveCanvasState();
            // Reset tool will be handled by parent or by user choosing another tool
          });
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('path:created', handlePathCreated);
      canvas.off('object:modified', handleObjectModified);
    };
  }, [activeTool, saveCanvasState]);

  // Undo/Redo logic
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0 && fabricCanvasRef.current) {
      historyIndexRef.current--;
      const prevState = historyRef.current[historyIndexRef.current];
      fabricCanvasRef.current.loadFromJSON(prevState).then(() => {
        fabricCanvasRef.current?.renderAll();
      });
      setHistoryTick(prev => prev + 1);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1 && fabricCanvasRef.current) {
      historyIndexRef.current++;
      const nextState = historyRef.current[historyIndexRef.current];
      fabricCanvasRef.current.loadFromJSON(nextState).then(() => {
        fabricCanvasRef.current?.renderAll();
      });
      setHistoryTick(prev => prev + 1);
    }
  }, []);

  const clear = useCallback(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = 'white';
      fabricCanvasRef.current.renderAll();
      saveCanvasState();
    }
  }, [saveCanvasState]);

  const toDataURL = useCallback(() => {
    return fabricCanvasRef.current?.toDataURL({ format: 'png', multiplier: 1 }) || '';
  }, []);

  // Method to add result text to canvas with premium styling
  const addResultText = useCallback((data: { expr: string; result: string; steps?: string; confidence?: string; type?: string }) => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    const { expr, result, steps, confidence, type } = data;

    // Subject type styling
    const getSubjectColors = (subjectType: string) => {
      switch (subjectType?.toLowerCase()) {
        case 'math':
        case 'arithmetic':
        case 'algebra':
        case 'calculus':
          return { primary: '#4F46E5', secondary: '#EEF2FF', text: '#312E81' }; // Indigo
        case 'chemistry':
          return { primary: '#059669', secondary: '#ECFDF5', text: '#064E3B' }; // Green
        case 'physics':
          return { primary: '#DC2626', secondary: '#FEF2F2', text: '#991B1B' }; // Red
        default:
          return { primary: '#6B7280', secondary: '#F9FAFB', text: '#374151' }; // Gray
      }
    };

    const colors = getSubjectColors(type || '');

    // Subject type badge
    let subjectBadge: fabric.Group | null = null;
    if (type) {
      const badgeBg = new fabric.Rect({
        width: 120,
        height: 28,
        fill: colors.secondary,
        rx: 14,
        ry: 14,
        stroke: colors.primary,
        strokeWidth: 1
      });
      
      const badgeText = new fabric.Text(type.charAt(0).toUpperCase() + type.slice(1), {
        fontSize: 12,
        fontWeight: 'bold',
        fill: colors.text,
        fontFamily: 'Outfit, sans-serif',
        originX: 'center',
        originY: 'center'
      });

      subjectBadge = new fabric.Group([badgeBg, badgeText], {
        originX: 'center',
        top: 15
      });
    }

    // Use Textbox for wrapping long text
    const titleText = new fabric.Text(expr, {
      fontSize: 16,
      fill: '#374151', // Gray-700
      fontFamily: 'Outfit, sans-serif',
      fontWeight: '500',
      originX: 'center',
      top: subjectBadge ? 50 : 30
    });

    const valueText = new fabric.Text(`= ${result}`, {
      fontSize: 48,
      fontWeight: 'bold',
      fill: colors.primary,
      fontFamily: 'Outfit, sans-serif',
      originX: 'center',
      top: subjectBadge ? 90 : 70
    });

    let stepsBox: fabric.Textbox | null = null;
    let cardHeight = subjectBadge ? 140 : 120;

    if (steps) {
      stepsBox = new fabric.Textbox(steps, {
        width: 380,
        fontSize: 14,
        fill: '#6B7280', // Gray-500
        fontFamily: 'Outfit, sans-serif',
        originX: 'center',
        top: subjectBadge ? 140 : 120,
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 1.4,
        splitByGrapheme: false
      });
      cardHeight += stepsBox.height! + 30;
    }

    const rect = new fabric.Rect({
      width: 420,
      height: cardHeight,
      fill: '#ffffff',
      rx: 24,
      ry: 24,
      stroke: colors.primary,
      strokeWidth: 2,
      shadow: new fabric.Shadow({
        color: `${colors.primary}20`,
        blur: 30,
        offsetX: 0,
        offsetY: 15
      })
    });

    const objects: fabric.Object[] = [rect];
    if (subjectBadge) objects.push(subjectBadge);
    objects.push(titleText, valueText);
    if (stepsBox) objects.push(stepsBox);

    if (confidence) {
      const confidenceBadge = new fabric.Rect({
        width: 70,
        height: 24,
        fill: confidence === 'high' ? '#D1FAE5' : '#FEF3C7',
        rx: 12,
        ry: 12,
        left: 140,
        top: subjectBadge ? 50 : 30
      });
      const confidenceText = new fabric.Text(confidence.toUpperCase(), {
        fontSize: 10,
        fontWeight: 'bold',
        fill: confidence === 'high' ? '#065F46' : '#92400E',
        fontFamily: 'Outfit, sans-serif',
        originX: 'center',
        originY: 'center',
        left: 175,
        top: subjectBadge ? 62 : 42
      });
      objects.push(confidenceBadge, confidenceText);
    }

    const group = new fabric.Group(objects, {
      left: canvas.width! / 2 - 210,
      top: canvas.height! / 2 - cardHeight / 2,
      selectable: true
    });

    // Final layout adjustment
    if (subjectBadge) subjectBadge.set({ left: 0 });
    titleText.set({ left: 0 });
    valueText.set({ left: 0 });
    if (stepsBox) stepsBox.set({ left: 0 });
    rect.set({ left: -210, top: 0 });

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    saveCanvasState();
  }, [saveCanvasState]);

  // Expose methods via ref
  useEffect(() => {
    if (canvasRef.current) {
      (canvasRef.current as any).undo = undo;
      (canvasRef.current as any).redo = redo;
      (canvasRef.current as any).clear = clear;
      (canvasRef.current as any).toDataURL = toDataURL;
      (canvasRef.current as any).addResultText = addResultText;
    }
  }, [undo, redo, clear, toDataURL, addResultText]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
