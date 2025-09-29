import React from 'react';
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react';
import ImageWithBoundingBoxesSVG from './ImageWithBoundingBoxesSVG';

const GalleryViewer = ({ images, selectedIndex, onSelectImage, onClose }) => {
  const handlePrevious = () => {
    if (selectedIndex > 0) {
      onSelectImage(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex < images.length - 1) {
      onSelectImage(selectedIndex + 1);
    }
  };

  if (!images || images.length === 0) {
    return null;
  }

  const currentImage = images[selectedIndex];

  // Debug: Log objects being passed
  console.log('GalleryViewer - Current image objects:', currentImage.objects);
  console.log('GalleryViewer - Objects count:', currentImage.objects?.length || 0);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Image {selectedIndex + 1} of {images.length}
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Main Image Display with Bounding Boxes */}
      <div className="relative">
        <ImageWithBoundingBoxesSVG
          imageUrl={currentImage.url || currentImage.preview}
          objects={currentImage.objects || []}
          imageAlt={currentImage.filename || `Image ${selectedIndex + 1}`}
          metadata={{
            token_usage: currentImage.token_usage,
            cost_estimate: currentImage.cost_estimate,
            exif: currentImage.exif
          }}
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              disabled={selectedIndex === 0}
              className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md z-20
                ${selectedIndex === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-100 cursor-pointer'
                }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleNext}
              disabled={selectedIndex === images.length - 1}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md z-20
                ${selectedIndex === images.length - 1
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-100 cursor-pointer'
                }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => onSelectImage(index)}
              className={`flex-shrink-0 border-2 rounded-lg overflow-hidden transition-all
                ${index === selectedIndex
                  ? 'border-blue-500 shadow-md'
                  : 'border-gray-300 hover:border-gray-400'
                }`}
            >
              <img
                src={image.url || image.preview}
                alt={`Thumbnail ${index + 1}`}
                className="w-20 h-20 object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Image Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Filename:</span> {currentImage.filename || 'N/A'}
        </p>
        {currentImage.size && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">Size:</span> {(currentImage.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
      </div>
    </div>
  );
};

export default GalleryViewer;