import React, { useState } from 'react';
import { X, Calculator, FlaskConical, Atom, Brain } from 'lucide-react';

interface HelpPanelProps {
  onClose: () => void;
}

export default function HelpPanel({ onClose }: HelpPanelProps) {
  const [activeTab, setActiveTab] = useState<'math' | 'chemistry' | 'physics' | 'general'>('math');

  const subjects = [
    {
      id: 'math',
      name: 'Mathematics',
      icon: Calculator,
      color: 'indigo',
      examples: [
        '2 + 2 = 4',
        'x² + 5x + 6 = 0',
        '∫x² dx = x³/3 + C',
        'd/dx(x²) = 2x',
        'sin(30°) = 0.5'
      ]
    },
    {
      id: 'chemistry',
      name: 'Chemistry',
      icon: FlaskConical,
      color: 'green',
      examples: [
        'H₂O → H₂ + O₂',
        'Na + Cl → NaCl',
        'CH₄ + 2O₂ → CO₂ + 2H₂O',
        'pH = -log[H⁺]',
        'PV = nRT'
      ]
    },
    {
      id: 'physics',
      name: 'Physics',
      icon: Atom,
      color: 'red',
      examples: [
        'F = ma',
        'E = mc²',
        'V = IR',
        'KE = ½mv²',
        'λ = h/p'
      ]
    },
    {
      id: 'general',
      name: 'General Equations',
      icon: Brain,
      color: 'gray',
      examples: [
        'y = mx + b',
        'a² + b² = c²',
        'A = πr²',
        'C = 2πr',
        'V = lwh'
      ]
    }
  ];

  const activeSubject = subjects.find(s => s.id === activeTab);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">What can I solve?</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {subjects.map((subject) => {
            const Icon = subject.icon;
            return (
              <button
                key={subject.id}
                onClick={() => setActiveTab(subject.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === subject.id
                    ? `border-b-2 border-${subject.color}-500 text-${subject.color}-600 bg-white`
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {subject.name}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeSubject?.name} Examples:
            </h3>
            <p className="text-gray-600 mb-4">
              Draw any of these equations on the canvas and click calculate to see the AI solve them step by step.
            </p>
          </div>

          <div className="grid gap-3">
            {activeSubject?.examples.map((example, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full bg-${activeSubject.color}-500`} />
                <code className="text-sm font-mono text-gray-800">{example}</code>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Tips:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Write clearly and use standard notation</li>
              <li>• Include all necessary symbols and operators</li>
              <li>• For complex equations, break them into parts</li>
              <li>• The AI will show steps and confidence levels</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
