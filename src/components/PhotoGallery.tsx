import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoGalleryProps {
  photos: string[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export default function PhotoGallery({ photos, isOpen, onClose, initialIndex = 0 }: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!isOpen || photos.length === 0) return null;

  const goToPrevious = () => {
    setCurrentIndex(prev => prev === 0 ? photos.length - 1 : prev - 1);
  };

  const goToNext = () => {
    setCurrentIndex(prev => prev === photos.length - 1 ? 0 : prev + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="relative max-w-4xl max-h-full p-4" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
        >
          <X size={32} />
        </button>

        <img
          src={photos[currentIndex]}
          alt={`Photo ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
        />

        {photos.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
            >
              <ChevronRight size={24} />
            </button>

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {photos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full ${
                    index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute bottom-4 right-4 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
          {currentIndex + 1} / {photos.length}
        </div>
      </div>
    </div>
  );
}