# How Qwen Results Display on Canvas

## Data Flow: From Qwen to Canvas

### 1. Qwen AI Response Format
```javascript
// Qwen returns this structure:
{
  "expr": "2 + 3",        // The mathematical expression detected
  "result": "5",          // The calculated answer  
  "assign": false         // Whether it's an assignment (unused)
}
```

### 2. Backend Processing (ImageAnalyzer.js)
```javascript
// Line 212-267: /calculate endpoint processes image
router.post("/calculate", async (req, res) => {
  // 1. Receives canvas image data
  const { image } = req.body;
  
  // 2. Optimizes image for AI processing
  const optimizedImage = await optimizeImage(image);
  
  // 3. Sends to Qwen2.5-VL model
  const result = await solveWithQwen(optimizedImage);
  
  // 4. Returns Qwen's response to frontend
  return res.json(result);
});
```

### 3. Frontend Processing (index.tsx)
```javascript
// Lines 68-85: Fetch and process response
const analyzeResponse = await fetch(getApiUrl('/calculate'), {
  body: JSON.stringify({ image: imageData })
});

const analysisResult = await analyzeResponse.json();
// analysisResult = [{ expr: "2 + 3", result: "5", assign: false }]

// Lines 86-109: Handle response format
if (Array.isArray(analysisResult)) {
  analysisResult.forEach((item) => {
    if (item.expr && item.result) {
      displayResultOnCanvas({
        expr: item.expr,        // "2 + 3"
        result: String(item.result), // "5"
        type: 'Math'
      });
    }
  });
}
```

### 4. Canvas Display (FabricCanvas.tsx)
```javascript
// Lines 392-544: addResultText method creates visual card
const addResultText = (data) => {
  const { expr, result, type } = data;
  
  // Creates styled card with:
  // 1. Subject badge (Math)
  // 2. Expression text ("2 + 3")
  // 3. Large result ("= 5")
  // 4. Rounded card with shadow
  
  const titleText = new fabric.Text(expr, {
    fontSize: 16,
    fill: '#374151',
    top: 50
  });

  const valueText = new fabric.Text(`= ${result}`, {
    fontSize: 48,
    fontWeight: 'bold',
    fill: '#4F46E5', // Blue for Math
    top: 90
  });
  
  // Groups everything into a card positioned on canvas
  const group = new fabric.Group(objects, {
    left: canvas.width! / 2 - 210,
    top: canvas.height! / 2 - cardHeight / 2
  });
};
```

## Visual Result on Canvas

The user sees a beautiful card displaying:
```
┌─────────────────────────────────┐
│            MATH                 │ ← Subject badge
│                                 │
│         2 + 3                   │ ← Expression (gray)
│                                 │
│           = 5                   │ ← Result (large, blue)
│                                 │
└─────────────────────────────────┘
```

## Qwen Model Configuration

### Prompt Engineering (Lines 62-71)
```javascript
const prompt = `Return ONLY this JSON format:
[{"expr": "expression", "result": "answer", "assign": false}]

Examples:
[{"expr": "2 + 3", "result": "5", "assign": false}]
[{"expr": "sin(30)", "result": "0.5", "assign": false}]
```

### Model Settings (Lines 84-93)
- **Model**: qwen2.5vl:3b (Vision-Language model)
- **Temperature**: 0.2 (Low for consistent math)
- **Timeout**: 15 seconds
- **Image Size**: 512x512 optimized

## Error Handling

If Qwen fails:
1. **Timeout**: Returns "Processing took too long"
2. **Parse Error**: Extracts math from raw text
3. **Fallback**: Returns "AI model busy"

## Subject-Based Styling

The canvas automatically colors results based on subject type:
- **Math**: Blue (#4F46E5)
- **Chemistry**: Green (#059669) 
- **Physics**: Red (#DC2626)
- **Default**: Gray (#6B7280)
