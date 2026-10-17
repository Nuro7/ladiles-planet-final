import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const BackgroundSelector = ({ backgrounds, selected, onSelect }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {backgrounds.map((bg) => (
                <button
                    key={bg.id}
                    onClick={() => onSelect(bg.id)}
                    className={`relative group ${selected === bg.id
                            ? 'selection-card-active'
                            : 'selection-card-inactive'
                        }`}
                >
                    <div className="text-center">
                        <div className={`text-5xl mb-3 transition-transform group-hover:scale-110 ${selected === bg.id ? 'animate-float' : ''
                            }`}>
                            {bg.preview}
                        </div>
                        <h4 className="font-bold text-sm mb-1">{bg.label}</h4>
                        <p className="text-xs text-slate-500">{bg.description}</p>
                    </div>
                    {selected === bg.id && (
                        <div className="absolute top-3 right-3">
                            <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
};

export default BackgroundSelector;
