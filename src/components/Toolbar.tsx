import React from 'react';
import { 
  MousePointer2, 
  Hand, 
  Square, 
  Circle, 
  ArrowRight, 
  Minus, 
  Pencil, 
  Type, 
  Image as ImageIcon, 
  Eraser,
  Undo,
  Redo,
  Trash2
} from 'lucide-react';

export type Tool = | 'select' | 'hand' | 'rectangle' | 'circle' | 'arrow' | 'line' | 'pencil' | 'text' | 'image' | 'eraser';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const tools = [
  { id: 'select' as Tool, icon: MousePointer2, label: 'Select (pointer)' },
  { id: 'hand' as Tool, icon: Hand, label: 'Hand (pan/move canvas)' },
  { id: 'rectangle' as Tool, icon: Square, label: 'Rectangle' },
  { id: 'circle' as Tool, icon: Circle, label: 'Circle' },
  { id: 'arrow' as Tool, icon: ArrowRight, label: 'Arrow' },
  { id: 'line' as Tool, icon: Minus, label: 'Line' },
  { id: 'pencil' as Tool, icon: Pencil, label: 'Pencil (free draw)' },
  { id: 'text' as Tool, icon: Type, label: 'Text tool' },
  { id: 'image' as Tool, icon: ImageIcon, label: 'Image upload' },
  { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser' },
];

export default function Toolbar({ 
  activeTool, 
  onToolChange, 
  onUndo, 
  onRedo, 
  onClear, 
  canUndo, 
  canRedo 
}: ToolbarProps) {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-2 flex items-center gap-1 border border-gray-200">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                className={`p-3 rounded-xl transition-all duration-200 hover:bg-gray-100 hover:scale-105 ${
                  activeTool === tool.id 
                    ? 'bg-purple-100 text-purple-600 shadow-sm' 
                    : 'text-gray-700'
                }`}
                title={tool.label}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 pl-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-3 rounded-xl transition-all duration-200 hover:bg-gray-100 hover:scale-105 ${
              canUndo ? 'text-gray-700' : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Undo"
          >
            <Undo size={18} />
          </button>
          
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-3 rounded-xl transition-all duration-200 hover:bg-gray-100 hover:scale-105 ${
              canRedo ? 'text-gray-700' : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <Redo size={18} />
          </button>
          
          <button
            onClick={onClear}
            className="p-3 rounded-xl transition-all duration-200 hover:bg-red-100 hover:scale-105 text-gray-700 hover:text-red-600"
            title="Clear Canvas"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      
      {/* Hint Text */}
      <div className="text-center mt-2 text-sm text-gray-500 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1">
        To move canvas, hold <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Scroll wheel</kbd> or <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Space</kbd> while dragging, or use the hand tool.
      </div>
    </div>
  );
}
