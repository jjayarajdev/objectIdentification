import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ZoomIn, ZoomOut, Maximize2, Camera, DollarSign, Hash, MapPin } from 'lucide-react';

const ImageWithBoundingBoxesSVG = ({ imageUrl, objects = [], imageAlt = "Image", metadata = null }) => {
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [selectedObject, setSelectedObject] = useState(null);
  const [scale, setScale] = useState(1);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    console.log('ImageWithBoundingBoxesSVG received objects:', objects);
    if (objects && objects.length > 0) {
      objects.forEach((obj, idx) => {
        console.log(`Object ${idx}:`, obj.label, obj.bounding_box);
      });
    }
  }, [objects]);

  useEffect(() => {
    const updateDimensions = () => {
      if (imageRef.current && containerRef.current) {
        const img = imageRef.current;
        const container = containerRef.current;

        // Get natural dimensions
        const naturalWidth = img.naturalWidth || img.width || 0;
        const naturalHeight = img.naturalHeight || img.height || 0;

        if (naturalWidth === 0 || naturalHeight === 0) {
          console.log('Image dimensions not yet available');
          return;
        }

        // Get container dimensions
        const containerWidth = container.clientWidth || 800;
        const containerHeight = container.clientHeight || 600;

        // Calculate scale to fit image in container
        const scaleX = containerWidth / naturalWidth;
        const scaleY = containerHeight / naturalHeight;
        const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond natural size

        // Calculate actual display dimensions
        const displayWidth = naturalWidth * fitScale;
        const displayHeight = naturalHeight * fitScale;

        setImageDimensions({
          width: displayWidth,
          height: displayHeight
        });

        setContainerDimensions({
          width: containerWidth,
          height: containerHeight
        });

        console.log('Dimensions updated:', {
          natural: { width: naturalWidth, height: naturalHeight },
          display: { width: displayWidth, height: displayHeight },
          container: { width: containerWidth, height: containerHeight }
        });
      }
    };

    // Reset dimensions when image changes
    setImageDimensions({ width: 0, height: 0 });

    // Load handler
    const img = imageRef.current;
    if (img) {
      // Force reload if image URL changed
      if (img.src !== imageUrl) {
        img.src = imageUrl;
      }

      if (img.complete && img.naturalWidth > 0) {
        updateDimensions();
      } else {
        img.addEventListener('load', updateDimensions);
        img.addEventListener('error', () => {
          console.error('Failed to load image:', imageUrl);
        });
      }

      // Resize observer for container changes
      const resizeObserver = new ResizeObserver(updateDimensions);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        img.removeEventListener('load', updateDimensions);
        img.removeEventListener('error', () => {});
        resizeObserver.disconnect();
      };
    }
  }, [imageUrl]);

  // Color palette for different object categories
  const getCategoryColor = (label) => {
    const categories = {
      'car': '#3B82F6',
      'vehicle': '#3B82F6',
      'person': '#10B981',
      'people': '#10B981',
      'traffic cone': '#F97316',
      'cone': '#F97316',
      'building': '#8B5CF6',
      'tree': '#059669',
      'palm': '#059669',
      'sign': '#EF4444',
      'gate': '#EF4444',
      'road': '#6B7280',
      'sky': '#60A5FA',
      'cloud': '#60A5FA',
      'default': '#EC4899'
    };

    const lowerLabel = label.toLowerCase();
    for (const [key, color] of Object.entries(categories)) {
      if (lowerLabel.includes(key)) {
        return color;
      }
    }
    return categories.default;
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  // Filter out large background objects
  const filteredObjects = (objects || []).filter(obj => {
    const bbox = obj?.bounding_box;
    return bbox && bbox.width < 95 && bbox.height < 95;
  });

  return (
    <div className="relative bg-gray-100 rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
          className={`p-2 rounded-lg shadow-lg transition-all ${
            showBoundingBoxes
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title={showBoundingBoxes ? "Hide bounding boxes" : "Show bounding boxes"}
        >
          {showBoundingBoxes ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </button>

        <button
          onClick={handleZoomIn}
          className="p-2 bg-white text-gray-700 rounded-lg shadow-lg hover:bg-gray-100 transition-all"
          title="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        <button
          onClick={handleZoomOut}
          className="p-2 bg-white text-gray-700 rounded-lg shadow-lg hover:bg-gray-100 transition-all"
          title="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        <button
          onClick={handleResetZoom}
          className="p-2 bg-white text-gray-700 rounded-lg shadow-lg hover:bg-gray-100 transition-all"
          title="Reset zoom"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Left side info badges */}
      <div className="absolute top-4 left-4 z-20 space-y-2 max-w-[200px]">
        {/* Object count badge */}
        {showBoundingBoxes && filteredObjects.length > 0 && (
          <div className="bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-medium">
            {filteredObjects.length} objects detected
          </div>
        )}

        {/* Token usage badge */}
        {metadata?.token_usage && (
          <div className="bg-blue-600 bg-opacity-90 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-lg">
            <div className="flex items-center gap-2">
              <Hash className="w-3 h-3" />
              <span>Tokens: {metadata.token_usage.total_tokens?.toLocaleString() || 0}</span>
            </div>
          </div>
        )}

        {/* Cost badge */}
        {metadata?.cost_estimate && (
          <div className="bg-green-600 bg-opacity-90 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="w-3 h-3" />
              <span>Cost: ${metadata.cost_estimate.total_cost?.toFixed(4) || '0.0000'}</span>
            </div>
          </div>
        )}

        {/* Camera info */}
        {metadata?.exif && (metadata.exif.make || metadata.exif.model) && (
          <div className="bg-purple-600 bg-opacity-90 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-lg">
            <div className="flex items-center gap-2">
              <Camera className="w-3 h-3" />
              <span className="truncate">{[metadata.exif.make, metadata.exif.model].filter(Boolean).join(' ')}</span>
            </div>
          </div>
        )}

        {/* GPS location */}
        {metadata?.exif?.gps_latitude && metadata?.exif?.gps_longitude && (
          <div className="bg-orange-600 bg-opacity-90 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-lg">
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              <span className="text-[10px]">
                {metadata.exif.gps_latitude.toFixed(4)}, {metadata.exif.gps_longitude.toFixed(4)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center bg-gray-200"
        style={{
          height: '600px',
          overflow: scale > 1 ? 'auto' : 'hidden'
        }}
      >
        <div
          className="relative"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            width: imageDimensions.width,
            height: imageDimensions.height
          }}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt={imageAlt}
            className="block"
            style={{
              width: imageDimensions.width,
              height: imageDimensions.height
            }}
          />

          {/* SVG Overlay for bounding boxes */}
          {showBoundingBoxes && imageDimensions.width > 0 && (
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              width={imageDimensions.width}
              height={imageDimensions.height}
              style={{ zIndex: 10 }}
            >
              {filteredObjects.map((obj, index) => {
                const bbox = obj.bounding_box;
                if (!bbox) return null;

                // Convert percentage to pixels based on displayed image dimensions
                const x = (bbox.x / 100) * imageDimensions.width;
                const y = (bbox.y / 100) * imageDimensions.height;
                const width = (bbox.width / 100) * imageDimensions.width;
                const height = (bbox.height / 100) * imageDimensions.height;

                const color = getCategoryColor(obj.label);
                const isSelected = selectedObject === index;

                return (
                  <g key={index}>
                    {/* Bounding box */}
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={isSelected ? `${color}33` : `${color}1A`}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 2}
                      className="pointer-events-auto cursor-pointer"
                      onClick={() => setSelectedObject(isSelected ? null : index)}
                      onMouseEnter={() => setSelectedObject(index)}
                      onMouseLeave={() => setSelectedObject(null)}
                    />

                    {/* Label background */}
                    <rect
                      x={x}
                      y={y - 22}
                      width={Math.min(width, 150)}
                      height={20}
                      fill={color}
                      rx={2}
                    />

                    {/* Label text */}
                    <text
                      x={x + 4}
                      y={y - 7}
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                      className="select-none"
                    >
                      {obj.label} ({(obj.confidence * 100).toFixed(0)}%)
                    </text>

                    {/* Corner markers */}
                    <rect x={x - 2} y={y - 2} width={6} height={6} fill="white" stroke={color} strokeWidth={2} />
                    <rect x={x + width - 4} y={y - 2} width={6} height={6} fill="white" stroke={color} strokeWidth={2} />
                    <rect x={x - 2} y={y + height - 4} width={6} height={6} fill="white" stroke={color} strokeWidth={2} />
                    <rect x={x + width - 4} y={y + height - 4} width={6} height={6} fill="white" stroke={color} strokeWidth={2} />
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Selected object details */}
      {selectedObject !== null && filteredObjects[selectedObject] && (
        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg z-30">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-lg capitalize">{filteredObjects[selectedObject].label}</h4>
              <p className="text-sm opacity-90">
                Confidence: {(filteredObjects[selectedObject].confidence * 100).toFixed(1)}%
              </p>
              <p className="text-xs opacity-75 mt-1">
                Position: ({filteredObjects[selectedObject].bounding_box.x.toFixed(0)}, {filteredObjects[selectedObject].bounding_box.y.toFixed(0)})
                | Size: {filteredObjects[selectedObject].bounding_box.width.toFixed(0)}×{filteredObjects[selectedObject].bounding_box.height.toFixed(0)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedObject(null);
              }}
              className="text-white hover:text-gray-300 text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageWithBoundingBoxesSVG;