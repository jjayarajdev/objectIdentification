import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer,
  Type,
  Square,
  Circle,
  TrendingUp,
  Ruler,
  Download,
  Undo,
  Redo,
  Trash2,
  Save
} from 'lucide-react';

const ImageAnnotator = ({ imageUrl, onSave, onClose }) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [tool, setTool] = useState('select');
  const [color, setColor] = useState('#FF0000');
  const [lineWidth, setLineWidth] = useState(2);
  const [fontSize, setFontSize] = useState(16);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [annotations, setAnnotations] = useState([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadImage();
  }, [imageUrl]);

  useEffect(() => {
    redrawCanvas();
  }, [annotations]);

  const loadImage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      imageRef.current = img;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };

    img.src = imageUrl;
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!canvas || !ctx || !imageRef.current) return;

    // Clear canvas and redraw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0);

    // Draw all annotations
    annotations.forEach(annotation => {
      ctx.strokeStyle = annotation.color;
      ctx.lineWidth = annotation.lineWidth;
      ctx.fillStyle = annotation.color;
      ctx.font = `${annotation.fontSize || 16}px Arial`;

      switch (annotation.type) {
        case 'rectangle':
          ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
          break;
        case 'circle':
          ctx.beginPath();
          const radius = Math.sqrt(Math.pow(annotation.width, 2) + Math.pow(annotation.height, 2)) / 2;
          ctx.arc(
            annotation.x + annotation.width / 2,
            annotation.y + annotation.height / 2,
            radius,
            0,
            2 * Math.PI
          );
          ctx.stroke();
          break;
        case 'arrow':
          drawArrow(ctx, annotation.x, annotation.y, annotation.endX, annotation.endY);
          break;
        case 'line':
          ctx.beginPath();
          ctx.moveTo(annotation.x, annotation.y);
          ctx.lineTo(annotation.endX, annotation.endY);
          ctx.stroke();

          // Add measurement label if it's a measurement line
          if (annotation.measurement) {
            const midX = (annotation.x + annotation.endX) / 2;
            const midY = (annotation.y + annotation.endY) / 2;
            const distance = Math.sqrt(
              Math.pow(annotation.endX - annotation.x, 2) +
              Math.pow(annotation.endY - annotation.y, 2)
            );
            ctx.fillStyle = '#000';
            ctx.fillRect(midX - 30, midY - 20, 60, 20);
            ctx.fillStyle = '#FFF';
            ctx.fillText(`${Math.round(distance)}px`, midX - 25, midY - 5);
          }
          break;
        case 'text':
          // Draw background for better visibility
          const metrics = ctx.measureText(annotation.text);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(
            annotation.x - 5,
            annotation.y - annotation.fontSize - 5,
            metrics.width + 10,
            annotation.fontSize + 10
          );
          ctx.fillStyle = annotation.color;
          ctx.fillText(annotation.text, annotation.x, annotation.y);
          break;
      }
    });

    // Highlight selected annotation
    if (selectedAnnotation !== null && annotations[selectedAnnotation]) {
      const ann = annotations[selectedAnnotation];
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      if (ann.type === 'text') {
        const metrics = ctx.measureText(ann.text);
        ctx.strokeRect(
          ann.x - 5,
          ann.y - ann.fontSize - 5,
          metrics.width + 10,
          ann.fontSize + 10
        );
      } else if (ann.type === 'arrow' || ann.type === 'line') {
        ctx.beginPath();
        ctx.arc(ann.x, ann.y, 5, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ann.endX, ann.endY, 5, 0, 2 * Math.PI);
        ctx.stroke();
      } else {
        ctx.strokeRect(ann.x - 5, ann.y - 5, ann.width + 10, ann.height + 10);
      }
      ctx.setLineDash([]);
    }
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const headLength = 10;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw arrow head
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);

    if (tool === 'select') {
      // Check if clicking on an annotation
      const clickedIndex = annotations.findIndex(ann => {
        if (ann.type === 'text') {
          const ctx = canvasRef.current.getContext('2d');
          ctx.font = `${ann.fontSize}px Arial`;
          const metrics = ctx.measureText(ann.text);
          return pos.x >= ann.x - 5 && pos.x <= ann.x + metrics.width + 5 &&
                 pos.y >= ann.y - ann.fontSize - 5 && pos.y <= ann.y + 5;
        } else if (ann.type === 'arrow' || ann.type === 'line') {
          // Check if near the line
          const dist = distanceToLine(pos.x, pos.y, ann.x, ann.y, ann.endX, ann.endY);
          return dist < 10;
        } else {
          return pos.x >= ann.x && pos.x <= ann.x + ann.width &&
                 pos.y >= ann.y && pos.y <= ann.y + ann.height;
        }
      });

      setSelectedAnnotation(clickedIndex >= 0 ? clickedIndex : null);
    } else if (tool === 'text') {
      setTextPosition(pos);
      setShowTextInput(true);
    } else {
      setIsDrawing(true);
      setStartPos(pos);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const pos = getMousePos(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Redraw canvas
    redrawCanvas();

    // Draw preview
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    switch (tool) {
      case 'rectangle':
        ctx.strokeRect(
          startPos.x,
          startPos.y,
          pos.x - startPos.x,
          pos.y - startPos.y
        );
        break;
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2)
        ) / 2;
        ctx.beginPath();
        ctx.arc(
          startPos.x + (pos.x - startPos.x) / 2,
          startPos.y + (pos.y - startPos.y) / 2,
          radius,
          0,
          2 * Math.PI
        );
        ctx.stroke();
        break;
      case 'arrow':
        drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y);
        break;
      case 'line':
      case 'measurement':
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        if (tool === 'measurement') {
          const distance = Math.sqrt(
            Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2)
          );
          ctx.fillStyle = '#000';
          ctx.fillRect(pos.x + 10, pos.y - 20, 60, 20);
          ctx.fillStyle = '#FFF';
          ctx.fillText(`${Math.round(distance)}px`, pos.x + 15, pos.y - 5);
        }
        break;
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;

    const pos = getMousePos(e);
    const newAnnotation = {
      type: tool === 'measurement' ? 'line' : tool,
      color,
      lineWidth,
      fontSize,
      x: startPos.x,
      y: startPos.y,
      measurement: tool === 'measurement'
    };

    if (tool === 'rectangle' || tool === 'circle') {
      newAnnotation.width = pos.x - startPos.x;
      newAnnotation.height = pos.y - startPos.y;
    } else if (tool === 'arrow' || tool === 'line' || tool === 'measurement') {
      newAnnotation.endX = pos.x;
      newAnnotation.endY = pos.y;
    }

    addAnnotation(newAnnotation);
    setIsDrawing(false);
  };

  const addAnnotation = (annotation) => {
    const newAnnotations = [...annotations, annotation];
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations);
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      addAnnotation({
        type: 'text',
        text: textInput,
        x: textPosition.x,
        y: textPosition.y,
        color,
        fontSize
      });
    }
    setTextInput('');
    setShowTextInput(false);
  };

  const distanceToLine = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;

    return Math.sqrt(dx * dx + dy * dy);
  };

  const saveToHistory = (newAnnotations) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push([...newAnnotations]);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setAnnotations(history[historyStep - 1]);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setAnnotations(history[historyStep + 1]);
    }
  };

  const deleteSelected = () => {
    if (selectedAnnotation !== null) {
      const newAnnotations = annotations.filter((_, i) => i !== selectedAnnotation);
      setAnnotations(newAnnotations);
      saveToHistory(newAnnotations);
      setSelectedAnnotation(null);
    }
  };

  const clearAll = () => {
    setAnnotations([]);
    saveToHistory([]);
    setSelectedAnnotation(null);
  };

  const saveAnnotatedImage = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      const annotatedImage = {
        blob,
        annotations,
        originalUrl: imageUrl,
        timestamp: new Date().toISOString()
      };
      onSave(annotatedImage);
    }, 'image/png');
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `annotated_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            {/* Tool Selection */}
            <div className="flex gap-2 border-r pr-4">
              <button
                onClick={() => setTool('select')}
                className={`p-2 rounded ${tool === 'select' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                title="Select"
              >
                <MousePointer className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTool('text')}
                className={`p-2 rounded ${tool === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                title="Text"
              >
                <Type className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTool('rectangle')}
                className={`p-2 rounded ${tool === 'rectangle' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                title="Rectangle"
              >
                <Square className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTool('circle')}
                className={`p-2 rounded ${tool === 'circle' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                title="Circle"
              >
                <Circle className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTool('arrow')}
                className={`p-2 rounded ${tool === 'arrow' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                title="Arrow"
              >
                <TrendingUp className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTool('measurement')}
                className={`p-2 rounded ${tool === 'measurement' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                title="Measurement"
              >
                <Ruler className="w-5 h-5" />
              </button>
            </div>

            {/* Style Controls */}
            <div className="flex gap-3 items-center border-r pr-4">
              <div className="flex items-center gap-2">
                <label className="text-sm">Color:</label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 border rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm">Width:</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm">{lineWidth}</span>
              </div>
              {tool === 'text' && (
                <div className="flex items-center gap-2">
                  <label className="text-sm">Font:</label>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm">{fontSize}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={undo}
                disabled={historyStep === 0}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                title="Undo"
              >
                <Undo className="w-5 h-5" />
              </button>
              <button
                onClick={redo}
                disabled={historyStep === history.length - 1}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                title="Redo"
              >
                <Redo className="w-5 h-5" />
              </button>
              <button
                onClick={deleteSelected}
                disabled={selectedAnnotation === null}
                className="p-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                title="Delete Selected"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={clearAll}
                className="p-2 rounded bg-red-100 hover:bg-red-200"
                title="Clear All"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>
            </div>
          </div>

          {/* Save/Export */}
          <div className="flex gap-2">
            <button
              onClick={downloadImage}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={saveAnnotatedImage}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save & Continue
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full cursor-crosshair bg-white"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />

          {/* Text Input Modal */}
          {showTextInput && (
            <div
              className="absolute bg-white border-2 border-blue-500 rounded p-2"
              style={{ left: textPosition.x, top: textPosition.y }}
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
                placeholder="Enter text..."
                className="px-2 py-1 border rounded"
                autoFocus
              />
              <button
                onClick={handleTextSubmit}
                className="ml-2 px-3 py-1 bg-blue-500 text-white rounded text-sm"
              >
                Add
              </button>
              <button
                onClick={() => setShowTextInput(false)}
                className="ml-1 px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageAnnotator;