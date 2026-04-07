import { useRef, useState, useCallback, useEffect } from 'react';
import { Calculator, Undo, Redo, Trash2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Toolbar, { Tool } from '@/components/Toolbar';
import FabricCanvas from '@/components/FabricCanvas';
import ErrorDisplay from '@/components/ErrorDisplay';
import HelpPanel from '@/components/HelpPanel';
import ResultDisplay from '@/components/ResultDisplay';
import { getApiUrl, config } from '@/config/api';
import { evaluate } from 'mathjs';


export default function DrawingCanvas() {
    const [activeTool, setActiveTool] = useState<Tool>('pencil');
    const [error, setError] = useState<{ expr?: string; result?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [dictOfVars, setDictOfVars] = useState<{ [key: string]: string }>({});
    const [result, setResult] = useState<{ 
        expression: string; 
        answer: string; 
        steps?: string;
        confidence?: string;
        explanation?: string;
    } | null>(null);
    const [results, setResults] = useState<Array<{
        expr: string;
        result: string | number;
        assign: boolean;
        error?: string;
    }> | null>(null);
    const [hasDrawing, setHasDrawing] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const [redoStack, setRedoStack] = useState<string[]>([]);
    const canvasRef = useRef<any>(null);

    const handleToolChange = (tool: Tool) => {
        setActiveTool(tool);
    };

    const handleUndo = useCallback(() => {
        if (history.length <= 1) return; // Keep at least one state

        const canvas = canvasRef.current;
        if (!canvas) return;

        const newHistory = [...history];
        const lastState = newHistory.pop();

        if (!lastState) return;

        setRedoStack((prev) => [...prev, lastState]);
        setHistory(newHistory);

        const prevState = newHistory[newHistory.length - 1];
        
        if (canvas.loadFromDataUrl) {
            canvas.loadFromDataUrl(prevState);
        } else if (canvas.setBackgroundImage) {
            const img = new Image();
            img.src = prevState;
            img.onload = () => {
                canvas.clear();
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            };
        }
    }, [history]);

    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const newRedo = [...redoStack];
        const state = newRedo.pop();

        if (!state) return;

        setRedoStack(newRedo);
        setHistory((prev) => [...prev, state]);

        if (canvas.loadFromDataUrl) {
            canvas.loadFromDataUrl(state);
        } else if (canvas.setBackgroundImage) {
            const img = new Image();
            img.src = state;
            img.onload = () => {
                canvas.clear();
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            };
        }
    }, [redoStack]);

    const handleClear = useCallback(() => {
        if (canvasRef.current && canvasRef.current.clear) {
            canvasRef.current.clear();
        }
        // Also clear variables and results
        setDictOfVars({});
        setResult(null);
        setResults(null);
        setHasDrawing(false); // Reset drawing state
        
        // Save blank state to history
        const canvas = canvasRef.current;
        if (canvas) {
            setTimeout(() => {
                setHistory([canvas.toDataURL()]);
                setRedoStack([]);
            }, 50);
        }
    }, []);

    // 🔹 Save canvas state after drawing
    const saveCanvasState = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dataUrl = canvas.toDataURL();
        setHistory((prev) => [...prev, dataUrl]);
        setRedoStack([]); // clear redo after new draw
        setHasDrawing(true); // Mark that user has drawn something
    }, []);

    // 🔹 Variable substitute function
    function substituteVariables(expr: string, dict: { [key: string]: string }) {
        let updated = expr;

        Object.keys(dict).forEach((key) => {
            const regex = new RegExp(`\\b${key}\\b`, "g");
            updated = updated.replace(regex, dict[key]);
        });

        // convert 2x → 2*x
        updated = updated.replace(/(\d)([a-zA-Z])/g, "$1*$2");

        return updated;
    }

    // 🔹 Expression evaluation function
    function evaluateExpression(expr: string) {
        try {
            return evaluate(expr).toString();
        } catch {
            return "Error";
        }
    }

    const showError = (expr: string, result: string) => {
        setError({ expr, result });
        setTimeout(() => setError(null), 5000); // Auto-hide after 5 seconds
    };

    const displayResultOnCanvas = (data: { 
        expr: string; 
        result: string; 
        steps?: string; 
        confidence?: string; 
        explanation?: string;
        type?: string 
    }) => {
        if (canvasRef.current && canvasRef.current.addResultText) {
            console.log("🎨 Adding rich result to canvas:", data);
            
            // Create rich display text
            let displayText = `${data.expr} = ${data.result}`;
            
            if (data.steps) {
                displayText += `\n📝 Steps: ${data.steps}`;
            }
            
            if (data.confidence) {
                const confidenceEmoji = data.confidence === 'high' ? '🟢' : 
                                     data.confidence === 'medium' ? '🟡' : '🔴';
                displayText += `\n${confidenceEmoji} Confidence: ${data.confidence}`;
            }
            
            if (data.explanation) {
                displayText += `\n💡 ${data.explanation}`;
            }
            
            canvasRef.current.addResultText({
                ...data,
                displayText
            });
        } else {
            console.error("❌ canvasRef.current.addResultText not found!");
        }
    };

    const handleCalculate = async () => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(getApiUrl('/calculate'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: canvas.toDataURL("image/png"),
                    dict_of_vars: dictOfVars,
                }),
                signal: AbortSignal.timeout(config.apiTimeout)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            console.log("✅ Backend response:", responseData);
            
            // 🔹 Handle different response formats
            let resp: any[] = [];
            if (Array.isArray(responseData)) {
                resp = responseData;
            } else if (responseData.result && Array.isArray(responseData.result)) {
                resp = responseData.result;
            }

            let updatedVars = { ...dictOfVars };
            
            // Convert backend response to ResultDisplay format
            const displayResults: Array<{
                expr: string;
                result: string | number;
                assign: boolean;
                error?: string;
                type?: string;
                concept?: string;
                steps?: string;
                confidence?: string;
                explanation?: string;
            }> = resp.map((item) => {
                if (item.type === 'math' && item.expr && item.result) {
                    const isAssignment = item.expr.includes('=') && !item.expr.includes('+') && !item.expr.includes('-') && !item.expr.includes('*') && !item.expr.includes('/');
                    return {
                        expr: item.expr,
                        result: item.result,
                        assign: isAssignment,
                        error: item.error,
                        type: item.type,
                        concept: item.concept,
                        steps: item.steps,
                        confidence: item.confidence,
                        explanation: item.explanation
                    };
                }
                // Handle legacy format
                else if (item.expr && item.result) {
                    return {
                        expr: item.expr,
                        result: item.result,
                        assign: item.assign || false,
                        error: item.error,
                        type: item.type || 'math',
                        concept: item.concept,
                        steps: item.steps,
                        confidence: item.confidence,
                        explanation: item.explanation
                    };
                }
                return null;
            }).filter((item): item is NonNullable<typeof item> => Boolean(item));
            
            setResults(displayResults);

            // 🔹 Process each response item
            resp.forEach((item) => {
                console.log("🎯 Processing item:", item);
                
                // Handle new rich response format
                if (item.type === 'math' && item.expr && item.result) {
                    // Check if this is a variable assignment (e.g., "x = 5")
                    const isAssignment = item.expr.includes('=') && !item.expr.includes('+') && !item.expr.includes('-') && !item.expr.includes('*') && !item.expr.includes('/');
                    
                    if (isAssignment) {
                        // Extract variable name and value
                        const parts = item.expr.split('=');
                        if (parts.length === 2) {
                            const varName = parts[0].trim();
                            const varValue = parts[1].trim();
                            updatedVars[varName] = varValue;
                            console.log(`📝 Variable stored: ${varName} = ${varValue}`);
                        }
                    } else {
                        // This is an expression to evaluate
                        const finalExpr = substituteVariables(item.expr, updatedVars);
                        const finalAnswer = item.result || evaluateExpression(finalExpr);

                        setResult({
                            expression: finalExpr,
                            answer: finalAnswer,
                            steps: item.steps,
                            confidence: item.confidence,
                            explanation: item.explanation,
                        });

                        console.log(`🧮 Expression solved: ${finalExpr} = ${finalAnswer}`);
                        console.log(`📝 Full result object:`, {
                            expression: finalExpr,
                            answer: finalAnswer,
                            steps: item.steps,
                            confidence: item.confidence,
                            explanation: item.explanation,
                        });

                        // Display rich result on canvas
                        displayResultOnCanvas({
                            expr: item.expr,
                            result: finalAnswer,
                            steps: item.steps,
                            confidence: item.confidence,
                            explanation: item.explanation,
                            type: item.type
                        });
                    }
                }
                // Handle legacy format for backward compatibility
                else if (item.expr && item.result) {
                    const isAssignment = item.assign === true;
                    
                    if (isAssignment) {
                        updatedVars[item.expr] = item.result;
                    } else {
                        const finalExpr = substituteVariables(item.expr, updatedVars);
                        const finalAnswer = evaluateExpression(finalExpr);

                        setResult({
                            expression: finalExpr,
                            answer: finalAnswer,
                        });

                        displayResultOnCanvas({
                            expr: finalExpr,
                            result: finalAnswer,
                            type: 'Math'
                        });
                    }
                }
            });

            setDictOfVars(updatedVars);

        } catch (error: any) {
            showError("System Error", error.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    // Debug logging for explanation
    useEffect(() => {
        if (result?.explanation) {
            console.log("🔍 Result explanation:", result.explanation);
        }
    }, [result?.explanation]);

    return (
        <div className="relative w-full h-screen overflow-hidden">
            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="text-lg font-medium">Calculating...</span>
                    </div>
                </div>
            )}

            {/* Error Display */}
            <ErrorDisplay
                error={error}
                onClose={() => setError(null)}
            />

            {/* Results Display */}
            <ResultDisplay
                results={results}
                isAnalyzing={isLoading}
                showReady={hasDrawing && !isLoading && !results}
                onClose={() => setResults(null)}
            />
            
            {/* Always show empty state when no drawing */}
            {!hasDrawing && !isLoading && !results && (
                <ResultDisplay
                    results={[]}
                    isAnalyzing={false}
                    showReady={false}
                    onClose={() => {}}
                />
            )}

            {/* Debug Panel - Remove in production */}
            {config.enableDebug && result && (
                <div className="fixed top-4 left-4 bg-white p-4 rounded-lg shadow-lg z-40 max-w-sm">
                    <h3 className="font-bold text-sm mb-2">🔍 Debug Info</h3>
                    <div className="text-xs space-y-1">
                        <div><strong>Expression:</strong> {result.expression}</div>
                        <div><strong>Answer:</strong> {result.answer}</div>
                        <div><strong>Variables:</strong> {JSON.stringify(dictOfVars)}</div>
                    </div>
                </div>
            )}


            {/* Help Panel */}
            {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

            {/* Navigation Bar */}
            {/* <Navbar /> */}

            {/* Main Content Area */}
            <div className="flex w-full h-full">
                {/* Left Side - Canvas */}
                <div className="flex-1 relative">
                    <FabricCanvas
                        activeTool={activeTool}
                        onCanvasReady={(canvas: any) => {
                            canvasRef.current = canvas;
                            
                            // Save initial state after canvas is ready
                            setTimeout(() => {
                                if (canvas.toDataURL) {
                                    setHistory([canvas.toDataURL()]);
                                }
                            }, 200);
                        }}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        onStateSave={saveCanvasState}
                    />

                    {/* Toolbar */}
                    <Toolbar
                        activeTool={activeTool}
                        onToolChange={handleToolChange}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        onClear={handleClear}
                        canUndo={true}
                        canRedo={true}
                    />

                    {/* Floating Action Buttons */}
                    <div className="fixed bottom-6 right-6 flex flex-col gap-2">
                        <Button
                            onClick={() => setShowHelp(true)}
                            variant="outline"
                            size="icon"
                            className="bg-blue-100 shadow-lg hover:shadow-xl transition-all duration-200"
                            title="What can I solve?"
                        >
                            <HelpCircle size={18} />
                        </Button>

                        <Button
                            onClick={handleUndo}
                            variant="outline"
                            size="icon"
                            className="bg-white shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                            <Undo size={18} />
                        </Button>

                        <Button
                            onClick={handleClear}
                            variant="outline"
                            size="icon"
                            className="bg-white shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-red-50"
                            title="Clear Canvas"
                        >
                            <Trash2 size={18} />
                        </Button>

                        <Button
                            onClick={handleCalculate}
                            disabled={isLoading}
                            variant="default"
                            size="icon"
                            className="bg-blue-600 text-white shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all duration-200"
                            title="Analyze Drawing"
                        >
                            <Calculator size={18} />
                        </Button>
                    </div>
                </div>

                {/* Right Side - Analysis Output Column */}
                <div className="w-96 bg-gray-50 border-l border-gray-200 p-6 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-lg">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h2 className="text-xl font-bold text-gray-800">Results</h2>
                            <p className="text-sm text-gray-600 mt-1">Analysis and solutions</p>
                        </div>
                        
                        <div className="p-6">
                            {result ? (
                                <div className="space-y-4">
                                    <div className="font-mono bg-gray-100 p-4 rounded-lg text-base">
                                        {result.expression} = {result.answer}
                                    </div>
                                    {result.steps && (
                                        <div>
                                            <strong className="text-gray-700">📝 Steps:</strong>
                                            <div className="text-sm text-gray-600 mt-2 bg-blue-50 p-3 rounded">{result.steps}</div>
                                        </div>
                                    )}
                                    {result.explanation && (
                                        <div>
                                            <strong className="text-gray-700">💡 Explanation:</strong>
                                            <div className="text-sm text-gray-700 mt-2 italic bg-yellow-50 p-3 rounded">{result.explanation}</div>
                                        </div>
                                    )}
                                    {result.confidence && (
                                        <div className="flex items-center gap-2">
                                            <strong className="text-gray-700">Confidence:</strong>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                result.confidence === 'high' ? 'bg-green-100 text-green-800' :
                                                result.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {result.confidence}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                    <div className="bg-gray-200 p-6 rounded-full mb-4">
                                        <Calculator size={48} className="text-gray-400" />
                                    </div>
                                    <p className="text-lg font-medium mb-2">Start drawing an equation</p>
                                    <p className="text-sm text-center">Draw a mathematical expression and click the calculator button to see analysis results here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}