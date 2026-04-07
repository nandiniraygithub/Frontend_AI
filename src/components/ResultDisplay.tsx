import { Brain, Calculator, CheckCircle, Loader2, TrendingUp, Eye, Lightbulb, Target, Zap } from "lucide-react";

interface ResultDisplayProps {
  results?: Array<{
    expr: string;
    result: string | number;
    assign: boolean;
    error?: string;
    type?: string;
    concept?: string;
    steps?: string;
    confidence?: string;
    explanation?: string;
  }> | null;
  onClose?: () => void;
  isAnalyzing?: boolean;
  showReady?: boolean;
}

export default function ResultDisplay({ results, onClose, isAnalyzing = false, showReady = false }: ResultDisplayProps) {
  if (!results && !isAnalyzing && !showReady) return null;

  return (
    <div className="fixed top-20 right-4 w-[380px] bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
      
      {/* Header */}
      <div className="bg-indigo-600 text-white px-5 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Analysis Results</h3>

        {onClose && (
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">

        {/* Ready State - Before Analysis */}
        {showReady && !isAnalyzing && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Calculator className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Ready to Analyze</h4>
            <p className="text-sm text-gray-600 mb-4">Click the calculator button to analyze your drawing</p>
            <div className="space-y-2 text-left bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Drawing detected</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>AI model ready</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Waiting for your command</span>
              </div>
            </div>
          </div>
        )}

        {/* Analyzing State */}
        {isAnalyzing && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Analyzing Image</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Eye className="w-4 h-4" />
                <span>Detecting content type...</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Brain className="w-4 h-4" />
                <span>Processing with AI...</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Calculator className="w-4 h-4" />
                <span>Calculating results...</span>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isAnalyzing && results && results.length === 0 && (
          <div className="text-center py-6">
            <div className="mb-4">
              <p className="text-gray-500 mb-4">Draw an equation to get started ✍️</p>
            </div>
            
            {/* Pythagorean Theorem Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                📐 Pythagorean Theorem
              </h4>
              <p className="text-sm text-blue-800 mb-3">
                Used to find the length of the hypotenuse in a right triangle.
              </p>
              <div className="bg-white rounded-lg p-3 mb-3">
                <p className="font-mono text-center text-blue-700 font-semibold">
                  a² + b² = c²
                </p>
              </div>
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>a</strong> = length of one leg</p>
                <p><strong>b</strong> = length of other leg</p>
                <p><strong>c</strong> = length of hypotenuse</p>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-600">
                  <strong>Example:</strong> For a triangle with sides 3 and 4:<br/>
                  c² = 3² + 4² = 9 + 16 = 25<br/>
                  c = √25 = 5
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {!isAnalyzing && results && results.map((item, index) => {
          const isError = item.error;
          const type = item.type || 'math';
          const confidence = item.confidence || 'medium';
          
          const getConfidenceColor = (conf: string) => {
            switch(conf) {
              case 'high': return 'text-green-600 bg-green-100';
              case 'medium': return 'text-yellow-600 bg-yellow-100';
              case 'low': return 'text-red-600 bg-red-100';
              default: return 'text-gray-600 bg-gray-100';
            }
          };

          const getTypeIcon = (type: string) => {
            switch(type) {
              case 'math': return <Calculator className="w-4 h-4" />;
              case 'diagram': return <Target className="w-4 h-4" />;
              case 'description': return <Eye className="w-4 h-4" />;
              default: return <Brain className="w-4 h-4" />;
            }
          };

          return (
            <div
              key={index}
              className="border rounded-xl p-4 bg-gray-50 hover:shadow-md transition"
            >
              
              {/* Enhanced Status Bar */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded ${getConfidenceColor(confidence)}`}>
                    {getTypeIcon(type)}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    isError ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                  }`}>
                    {isError ? "Error" : "Success"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">#{index + 1}</span>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(confidence)}`}>
                    {confidence}% confidence
                  </div>
                </div>
              </div>

              {/* Analysis Steps */}
              {item.concept && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                    <p className="text-xs font-semibold text-blue-800">Concept</p>
                  </div>
                  <p className="text-sm text-blue-700">{item.concept}</p>
                </div>
              )}

              {item.steps && (
                <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <p className="text-xs font-semibold text-purple-800">Steps</p>
                  </div>
                  <p className="text-sm text-purple-700 font-mono">{item.steps}</p>
                </div>
              )}

              {/* Explanation */}
              {item.explanation && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-green-600" />
                    <p className="text-xs font-semibold text-green-800">Explanation</p>
                  </div>
                  <p className="text-sm text-green-700">{item.explanation}</p>
                </div>
              )}

              {/* Expression */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 uppercase">Expression</p>
                <div className="mt-1 bg-white border rounded px-3 py-2 font-mono text-sm">
                  {item.expr || "N/A"}
                </div>
              </div>

              {/* Result or Error */}
              <div>
                <p className="text-xs text-gray-500 uppercase">
                  {isError ? "Error Message" : "Result"}
                </p>

                <div
                  className={`mt-1 px-3 py-2 rounded font-semibold ${
                    isError
                      ? "bg-red-50 text-red-600 border border-red-200"
                      : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  }`}
                >
                  {isError ? item.error : item.result}
                </div>
              </div>

              {/* Type */}
              <div className="mt-3 flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    item.assign ? "bg-orange-400" : "bg-green-400"
                  }`}
                ></div>
                <span className="text-xs text-gray-600">
                  {item.assign ? "Assignment" : "Evaluation"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}