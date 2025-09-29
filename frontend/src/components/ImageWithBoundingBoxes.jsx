import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ZoomIn, ZoomOut, Maximize2, Camera, DollarSign, Hash, MapPin } from 'lucide-react';

const ImageWithBoundingBoxes = ({ imageUrl, objects = [], imageAlt = "Image", metadata = null }) => {
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [selectedObject, setSelectedObject] = useState(null);
  const [scale, setScale] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    console.log('ImageWithBoundingBoxes received objects:', objects);
    if (objects && objects.length > 0) {
      objects.forEach((obj, idx) => {
        console.log(`Object ${idx}:`, obj.label, obj.bounding_box);
      });
    }
  }, [objects]);

  useEffect(() => {
    const checkImageLoad = () => {
      if (imageRef.current) {
        const img = imageRef.current;
        const handleLoad = () => {
          // Use a small delay to ensure the image is fully rendered
          setTimeout(() => {
            setImageSize({
              width: img.naturalWidth,
              height: img.naturalHeight
            });
            setImageLoaded(true);
            console.log('Image loaded - Natural:', img.naturalWidth, 'x', img.naturalHeight);
            console.log('Image loaded - Display:', img.clientWidth, 'x', img.clientHeight);
          }, 100);
        };

        if (img.complete && img.naturalHeight !== 0) {
          handleLoad();
        } else {
          img.addEventListener('load', handleLoad);
          return () => img.removeEventListener('load', handleLoad);
        }
      }
    };

    // Reset loaded state when image changes
    setImageLoaded(false);
    checkImageLoad();
  }, [imageUrl]);

  // Color palette for different object categories
  const getCategoryColor = (label) => {
    const categories = {
      'vehicle': '#3B82F6', // blue
      'car': '#3B82F6',
      'truck': '#3B82F6',
      'bus': '#3B82F6',
      'person': '#10B981', // green
      'people': '#10B981',
      'traffic cone': '#F97316', // orange
      'cone': '#F97316',
      'traffic': '#F97316',
      'building': '#8B5CF6', // purple
      'tree': '#059669', // teal
      'trees': '#059669',
      'forest': '#059669',
      'vegetation': '#059669',
      'plant': '#059669',
      'palm': '#059669',
      'sign': '#EF4444', // red
      'gate': '#EF4444',
      'road': '#6B7280', // gray
      'wire': '#F59E0B', // yellow
      'cable': '#F59E0B',
      'sky': '#60A5FA', // light blue
      'cloud': '#60A5FA',
      'clouds': '#60A5FA',
      'wall': '#9CA3AF', // gray
      'concrete': '#9CA3AF',
      'parking': '#8B5CF6',
      'garage': '#8B5CF6',
      'entrance': '#8B5CF6',
      'default': '#EC4899' // pink
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

  return (
    <div className="relative bg-gray-100 rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
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
      <div className="absolute top-4 left-4 z-10 space-y-2">
        {/* Object count badge */}
        {showBoundingBoxes && objects.length > 0 && (
          <div className="bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-medium">
            {objects.length} objects detected
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

        {/* EXIF info badges */}
        {metadata?.exif && (
          <>
            {/* Camera info */}
            {(metadata.exif.make || metadata.exif.model) && (
              <div className="bg-purple-600 bg-opacity-90 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-lg">
                <div className="flex items-center gap-2">
                  <Camera className="w-3 h-3" />
                  <span>{[metadata.exif.make, metadata.exif.model].filter(Boolean).join(' ')}</span>
                </div>
              </div>
            )}

            {/* GPS location */}
            {metadata.exif.gps_latitude && metadata.exif.gps_longitude && (
              <div className="bg-orange-600 bg-opacity-90 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  <span>
                    {metadata.exif.gps_latitude.toFixed(4)}, {metadata.exif.gps_longitude.toFixed(4)}
                  </span>
                </div>
              </div>
            )}

            {/* Camera settings */}
            {(metadata.exif.iso || metadata.exif.focal_length || metadata.exif.f_number) && (
              <div className="bg-gray-700 bg-opacity-90 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-lg">
                <div className="space-y-1">
                  {metadata.exif.iso && <div>ISO: {metadata.exif.iso}</div>}
                  {metadata.exif.focal_length && <div>Focal: {metadata.exif.focal_length}</div>}
                  {metadata.exif.f_number && <div>f/{metadata.exif.f_number}</div>}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image container with scroll for zoomed images */}
      <div
        ref={containerRef}
        className="relative overflow-auto"
        style={{
          maxHeight: '600px',
          cursor: scale > 1 ? 'move' : 'default'
        }}
      >
        <div
          className="relative inline-block w-full"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}
        >
          <div className="relative">
            <img
              ref={imageRef}
              src={imageUrl}
              alt={imageAlt}
              className="w-full h-auto max-h-[600px] object-contain"
              style={{
                display: 'block',
                maxWidth: '100%'
              }}
              onError={(e) => {
                console.error('Error loading image:', e);
              }}
            />

          {/* Bounding boxes overlay */}
          {showBoundingBoxes && imageLoaded && objects && objects.length > 0 && objects
            // Sort objects by area (smallest first) so smaller objects are rendered on top
            .slice()
            .sort((a, b) => {
              const areaA = (a.bounding_box?.width || 0) * (a.bounding_box?.height || 0);
              const areaB = (b.bounding_box?.width || 0) * (b.bounding_box?.height || 0);
              return areaA - areaB;
            })
            .map((obj, index) => {
            const originalIndex = objects.indexOf(obj);
            const bbox = obj.bounding_box;
            if (!bbox) {
              console.warn(`No bounding box for object ${originalIndex}:`, obj);
              return null;
            }

            // Check if image dimensions are available
            if (!imageRef.current || !imageRef.current.naturalWidth || !imageRef.current.naturalHeight) {
              console.warn('Image not loaded yet');
              return null;
            }

            // Skip overly large bounding boxes (likely background elements)
            if (bbox.width >= 95 || bbox.height >= 95) {
              console.log(`Skipping large background object: ${obj.label} (${bbox.width}x${bbox.height})`);
              return null;
            }

            // Get displayed image dimensions (actual rendered size)
            const displayWidth = imageRef.current.clientWidth || imageRef.current.width;
            const displayHeight = imageRef.current.clientHeight || imageRef.current.height;

            // Convert percentage coordinates to pixels based on displayed size
            const x = (bbox.x / 100) * displayWidth;
            const y = (bbox.y / 100) * displayHeight;
            const width = (bbox.width / 100) * displayWidth;
            const height = (bbox.height / 100) * displayHeight;

            console.log(`Rendering box ${originalIndex} for ${obj.label}: x=${x.toFixed(1)}, y=${y.toFixed(1)}, w=${width.toFixed(1)}, h=${height.toFixed(1)}`)

            // Skip if dimensions are invalid
            if (width <= 0 || height <= 0) {
              console.warn(`Invalid dimensions for object ${originalIndex}:`, obj);
              return null;
            }

            const color = getCategoryColor(obj.label);
            const isSelected = selectedObject === originalIndex;

            return (
              <div
                key={`bbox-${index}`}
                className={`absolute transition-all cursor-pointer ${
                  isSelected ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  border: `${isSelected ? '3px' : '2px'} solid ${color}`,
                  backgroundColor: isSelected ? `${color}33` : `${color}1A`,
                  ringColor: color,
                  zIndex: isSelected ? 10 : 5,
                  pointerEvents: 'all'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedObject(isSelected ? null : originalIndex);
                }}
                onMouseEnter={() => setSelectedObject(originalIndex)}
                onMouseLeave={() => setSelectedObject(null)}
              >
                {/* Label */}
                <div
                  className="absolute px-2 py-1 text-xs font-bold text-white rounded shadow-lg whitespace-nowrap"
                  style={{
                    backgroundColor: color,
                    top: '-24px',
                    left: '0px',
                    zIndex: 20
                  }}
                >
                  {obj.label} ({(obj.confidence * 100).toFixed(0)}%)
                </div>

                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2" style={{ borderColor: color }}></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2" style={{ borderColor: color }}></div>
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2" style={{ borderColor: color }}></div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2" style={{ borderColor: color }}></div>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Selected object details */}
      {selectedObject !== null && objects[selectedObject] && (
        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-lg capitalize">{objects[selectedObject].label}</h4>
              <p className="text-sm opacity-90">
                Confidence: {(objects[selectedObject].confidence * 100).toFixed(1)}%
              </p>
              <p className="text-xs opacity-75 mt-1">
                Position: ({objects[selectedObject].bounding_box.x.toFixed(0)}, {objects[selectedObject].bounding_box.y.toFixed(0)})
                | Size: {objects[selectedObject].bounding_box.width.toFixed(0)}×{objects[selectedObject].bounding_box.height.toFixed(0)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedObject(null);
              }}
              className="text-white hover:text-gray-300"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageWithBoundingBoxes;