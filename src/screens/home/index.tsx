/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Pencil, Eraser, Undo, Redo, Trash2, Calculator, RefreshCcw } from 'lucide-react';




export default function DrawingCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
  
    
    // Canvas history for undo/redo
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    useEffect(() => {
        initializeCanvas();
         // Your function to set up the canvas
    
    }, []);




    const initializeCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - 100;
                context.fillStyle = 'white';
                context.fillRect(0, 0, canvas.width, canvas.height);
                setHistory([]);
                setHistoryIndex(-1);
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

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
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
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
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
    
        try {
            // Step 1: Upload image
            const uploadResponse = await fetch("https://backend-ai-nsep-git-main-nandiniraygithubs-projects.vercel.app/Image", {
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
            const analyzeResponse = await fetch("https://backend-ai-nsep-git-main-nandiniraygithubs-projects.vercel.app/calculate", {
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
        <div className="relative">
            <div className="absolute top-0 left-0 right-0 z-10 bg-white/80 p-2 flex items-center space-x-4">
                <ToggleGroup type="single" value={tool} onValueChange={(value) => setTool(value as 'pencil' | 'eraser')}>
                    <ToggleGroupItem value="pencil"><Pencil className="h-4 w-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="eraser"><Eraser className="h-4 w-4" /></ToggleGroupItem>
                </ToggleGroup>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 p-0 border-none" />
                <div className="flex items-center space-x-2">
                    <span>Brush Size:</span>
                    <Slider defaultValue={[brushSize]} max={50} step={1} onValueChange={(value) => setBrushSize(value[0])} />
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline" size="icon" onClick={handleUndo} disabled={historyIndex <= 0}><Undo className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={handleRedo} disabled={historyIndex >= history.length - 1}><Redo className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon" onClick={clearCanvas}><Trash2 className="h-4 w-4" /></Button>
                    <Button variant="secondary" size="icon" onClick={resetCanvas}><RefreshCcw className="h-4 w-4" /></Button>
                    <Button variant="default" size="icon" onClick={handleCalculate}><Calculator className="h-4 w-4" /></Button>
                </div>
            </div>
            <canvas ref={canvasRef} className="absolute top-12 left-0 right-0 bottom-0" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} />
</div>

    );
}
