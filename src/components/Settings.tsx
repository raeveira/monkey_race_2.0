'use client'
import React from "react";
import {Volume2, VolumeX} from 'lucide-react';

interface SettingsProps {
    volume: number;
    isMuted: boolean;
    onVolumeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onToggleMute: () => void;
    onClose: () => void;
}

export const Settings = ({
                             volume,
                             isMuted,
                             onVolumeChange,
                             onToggleMute,
                             onClose
                         }: SettingsProps) => {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div
                className="bg-white/95 border-4 border-[#6b5c3e] rounded-lg p-6 w-[350px] max-w-[90vw] shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[#3e2a14] font-['Pixelify_Sans',_sans-serif]">Settings</h2>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-[#5a4025] font-['Pixelify_Sans',_sans-serif]">Audio</h3>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={onToggleMute}
                                className="text-gray-700 hover:text-gray-900 bg-gray-200 hover:bg-gray-300 p-2 rounded-md transition-colors"
                            >
                                {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
                            </button>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Music Volume
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={onVolumeChange}
                                    className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>0%</span>
                                    <span>{Math.round(volume * 100)}%</span>
                                    <span>100%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-[#5a4025] font-['Pixelify_Sans',_sans-serif]">Game</h3>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700">Difficulty</span>
                            <select className="bg-gray-100 border border-gray-300 rounded-md px-3 py-1 text-gray-700">
                                <option>Easy</option>
                                <option>Medium</option>
                                <option>Hard</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={onClose}
                            className="w-full bg-[#7e57c2] hover:bg-[#5e35b1] text-white py-2 px-4 rounded-md font-bold transition-all transform hover:scale-105 shadow-md hover:cursor-pointer"
                        >
                            Save & Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
