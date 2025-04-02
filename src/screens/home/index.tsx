import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Pencil, Eraser, Undo, Redo, Trash2, Calculator, RefreshCcw } from 'lucide-react';

export default function DrawingCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'pencil' | 'eraser'| 'default'>('pencil');
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
  
    // Canvas history for undo/redo
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            initializeCanvas();
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Initialize canvas on mount
    useEffect(() => {
        initializeCanvas();
    }, []);

    const initializeCanvas = () => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        
        if (canvas && container) {
            const context = canvas.getContext('2d');
            if (context) {
                // Save the current drawing if any
                let currentDrawing: string | null = null;
                if (canvas.width > 0 && canvas.height > 0) {
                    currentDrawing = canvas.toDataURL();
                }
                
                // Set canvas size to fill container
                canvas.width = container.clientWidth;
                canvas.height = window.innerHeight - 100; // Leave space for the toolbar
                
                // Fill with white background
                context.fillStyle = 'white';
                context.fillRect(0, 0, canvas.width, canvas.height);
                
                // Restore previous drawing if any
                if (currentDrawing) {
                    const img = new Image();
                    img.onload = () => {
                        context.drawImage(img, 0, 0, canvas.width, canvas.height);
                    };
                    img.src = currentDrawing;
                } else {
                    // Initialize history if this is first load
                    setHistory([]);
                    setHistoryIndex(-1);
                }
            }
        }
    };

    const saveCanvasState = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const dataUrl = canvas.toDataURL();
            const newHistory = history.slice(0, historyIndex + 1);
            setHistory([...newHistory, dataUrl]);
            setHistoryIndex(newHistory.length);
        }
    }, [history, historyIndex]);

    // Handle native touch events for drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Native touch event handlers (these will override React's passive listeners)
        const handleTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            if (!canvas) return;
            const context = canvas.getContext('2d');
            if (!context) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            
            context.beginPath();
            context.moveTo(x, y);
            context.strokeStyle = tool === 'eraser' ? 'white' : color;
            context.lineWidth = brushSize;
            context.lineCap = 'round';
            context.lineJoin = 'round';
            setIsDrawing(true);
        };
        
        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            if (!isDrawing || !canvas) return;
            
            const context = canvas.getContext('2d');
            if (!context) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            
            context.lineTo(x, y);
            context.stroke();
        };
        
        const handleTouchEnd = (e: TouchEvent) => {
            e.preventDefault();
            if (isDrawing) {
                setIsDrawing(false);
                saveCanvasState();
            }
        };
        
        // Add event listeners with { passive: false } to ensure preventDefault works
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        return () => {
            // Clean up
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDrawing, tool, color, brushSize, saveCanvasState]);

    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };
    
    // Mouse events only - touch is handled separately with native events
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const { x, y } = getCoordinates(e);
        context.beginPath();
        context.moveTo(x, y);
        context.strokeStyle = tool === 'eraser' ? 'white' : color;
        context.lineWidth = brushSize;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        const { x, y } = getCoordinates(e);
        context.lineTo(x, y);
        context.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            saveCanvasState();
        }
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const canvas = canvasRef.current;
            if (canvas) {
                const context = canvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                    context?.clearRect(0, 0, canvas.width, canvas.height);
                    context?.drawImage(img, 0, 0);
                };
                img.src = history[newIndex];
                setHistoryIndex(newIndex);
            }
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            const canvas = canvasRef.current;
            if (canvas) {
                const context = canvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                    context?.clearRect(0, 0, canvas.width, canvas.height);
                    context?.drawImage(img, 0, 0);
                };
                img.src = history[newIndex];
                setHistoryIndex(newIndex);
            }
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                context.fillStyle = 'white';
                context.fillRect(0, 0, canvas.width, canvas.height);
                saveCanvasState();
            }
        }
    };

    const resetCanvas = () => {
        initializeCanvas();
    };
    
    const handleCalculate = async () => {

        const canvas = canvasRef.current;
        if (!canvas) {
            console.error("❌ Canvas not found!");
            alert("Canvas not available. Please try again.");
            return;
        }
    
        console.log("📤 Sending canvas image to server...");
        const dataUrl = canvas.toDataURL("image/png");
    
        try {  // cors ka issue hai be
            // Step 1: Upload image
            const uploadResponse = await fetch("https://backend-cal.vercel.app/image", {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: dataUrl, dictOfVars: {} })
            });
    
            if (!uploadResponse.ok) {
                throw new Error(`❌ Image upload failed: ${uploadResponse.status}`);
            }
    
            const uploadResult = await uploadResponse.json();
            const imageId = uploadResult.imageId;
            console.log("✅ Image stored with ID:", imageId);
    
            // Step 2: Analyze stored image
            const analyzeResponse = await fetch("https://backend-cal.vercel.app/calculate", {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageId })
            });
    
            if (!analyzeResponse.ok) {
                throw new Error(`❌ Calculation failed: ${analyzeResponse.status}`);
            }
    
            const analysisResult = await analyzeResponse.json();
            console.log("✅ Analysis Result:", analysisResult);
    
            // Get canvas context

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                console.error("❌ Could not get canvas context.");
                alert("Canvas context is unavailable.");
                return;
            }
    
            function displayResult(ctx: CanvasRenderingContext2D, text: string) {
                const canvas = canvasRef.current;
                if (!canvas) {
                    console.error("Canvas is null");
                    return;
                }
                
                const newCtx  = canvas.getContext("2d");
                if (!newCtx) {
                    console.error("Canvas context is null");
                    return;
                }

                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.font = "20px Arial";
                ctx.fillStyle = "black";
    
                // Split text for multi-line display
                const lines = text.split("\n");
                let y = 50;
                lines.forEach((line) => {
                    ctx.fillText(line, 20, y);
                    y += 30; // Line spacing
                });
            }
    
            if (Array.isArray(analysisResult.result) && analysisResult.result.length > 0) {
                const resultsText = analysisResult.result
                    .map((entry: { expr: string; result: string }) => `Expression: ${entry.expr}\nResult: ${entry.result}`)
                    .join("\n\n");
    
                // Call function to display results
                displayResult(ctx, resultsText);
            } else {
                alert("⚠️ No valid calculation result. Try again!");
            }
        } catch (error) {
            console.error("❌ Error:", error);
            alert("Error occurred while calculating. Check console.");
        }
    };
    
    return (
        <div className="flex flex-col h-screen" ref={containerRef}>
             <div className="sticky top-0 left-0 right-0 z-10 bg-white/80 p-2 flex flex-wrap items-center gap-2">
                <ToggleGroup type="single" value={tool} onValueChange={(value) => value && setTool(value as 'pencil' | 'eraser')}>
                    <ToggleGroupItem value="pencil"><Pencil className="h-4 w-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="eraser"><Eraser className="h-4 w-4" /></ToggleGroupItem>
                </ToggleGroup>
                
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 p-0 border-none" />
                
                <div className="flex items-center gap-2">
                    <span className="text-sm">Size:</span>
                    <Slider defaultValue={[brushSize]} max={50} step={1} onValueChange={(value) => setBrushSize(value[0])} className="w-24" />
                    <span className="text-xs">{brushSize}px</span>
                </div>
                
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={handleUndo} disabled={historyIndex <= 0}>
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
                        <Redo className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={clearCanvas}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={resetCanvas}>
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                    <Button variant="default" size="icon" onClick={handleCalculate}>
                        <Calculator className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            
            <div className="flex-grow relative overflow-hidden">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    className="w-full h-full touch-none"
                    style={{ 
                        touchAction: "none", // Prevents scrolling on touch devices
                        display: "block" 
                    }}
                />
            </div>
        </div>
    );
}