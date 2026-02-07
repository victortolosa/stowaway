import React from 'react';
import { MapPin, Box, Tag } from 'lucide-react';

export const OnboardingHierarchy: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center p-4 space-y-4 w-full">
            <div className="relative flex flex-col items-center w-full max-w-xs">
                {/* Place */}
                <div className="flex items-center w-full p-3 bg-blue-50/50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl z-30 transform transition-transform hover:scale-105 duration-300">
                    <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg mr-3">
                        <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">Place</h4>
                        <p className="text-xs text-blue-600 dark:text-blue-300">Home, Office, Garage...</p>
                    </div>
                </div>

                {/* Connecting Line 1 */}
                <div className="h-6 w-0.5 bg-gray-300 dark:bg-gray-700 -my-1 z-0" />

                {/* Container */}
                <div className="flex items-center w-[90%] p-3 bg-amber-50/50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl z-20 transform transition-transform hover:scale-105 duration-300">
                    <div className="bg-amber-100 dark:bg-amber-800 p-2 rounded-lg mr-3">
                        <Box className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-sm">Container</h4>
                        <p className="text-xs text-amber-600 dark:text-amber-300">Box, Shelf, Bin...</p>
                    </div>
                </div>

                {/* Connecting Line 2 */}
                <div className="h-6 w-0.5 bg-gray-300 dark:bg-gray-700 -my-1 z-0" />

                {/* Item */}
                <div className="flex items-center w-[80%] p-3 bg-purple-50/50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl z-10 transform transition-transform hover:scale-105 duration-300">
                    <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-lg mr-3">
                        <Tag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-purple-900 dark:text-purple-100 text-sm">Item</h4>
                        <p className="text-xs text-purple-600 dark:text-purple-300">The actual stuff</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
