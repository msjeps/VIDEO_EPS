import React, { useState, useRef } from 'react';
import { Stage, Layer, Line, Circle, Rect, Arrow } from 'react-konva';
import { Annotation, Tool } from '../types';

interface AnnotationCanvasProps {
  width: number;
  height: number;
  tool: Tool;
  color: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  disabled?: boolean;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  width,
  height,
  tool,
  color,
  annotations,
  onAnnotationsChange,
  disabled = false,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const stageRef = useRef<any>(null);

  const handleMouseDown = (e: any) => {
    if (disabled || !tool) return;
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      tool,
      color,
      points: [pos.x, pos.y],
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
    };
    onAnnotationsChange([...annotations, newAnnotation]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || disabled || !tool) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastAnnotation = { ...annotations[annotations.length - 1] };
    const newAnnotations = annotations.slice(0, -1);

    if (tool === 'pen') {
      lastAnnotation.points = [...lastAnnotation.points, point.x, point.y];
    } else if (tool === 'segment') {
      // Segment d'alignement : snap to horizontal or vertical
      const dx = Math.abs(point.x - (lastAnnotation.x || 0));
      const dy = Math.abs(point.y - (lastAnnotation.y || 0));
      if (dx > dy) {
        // Horizontal segment
        lastAnnotation.points = [lastAnnotation.x || 0, lastAnnotation.y || 0, point.x, lastAnnotation.y || 0];
      } else {
        // Vertical segment
        lastAnnotation.points = [lastAnnotation.x || 0, lastAnnotation.y || 0, lastAnnotation.x || 0, point.y];
      }
      lastAnnotation.width = point.x - (lastAnnotation.x || 0);
      lastAnnotation.height = point.y - (lastAnnotation.y || 0);
    } else if (tool === 'rect' || tool === 'circle' || tool === 'arrow' || tool === 'line') {
      lastAnnotation.width = point.x - (lastAnnotation.x || 0);
      lastAnnotation.height = point.y - (lastAnnotation.y || 0);
      lastAnnotation.points = [lastAnnotation.x || 0, lastAnnotation.y || 0, point.x, point.y];
    }

    onAnnotationsChange([...newAnnotations, lastAnnotation]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  return (
    <div className="absolute inset-0 pointer-events-auto">
      <Stage
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        ref={stageRef}
      >
        <Layer>
          {annotations.map((ann) => {
            if (ann.tool === 'pen') {
              return (
                <Line
                  key={ann.id}
                  points={ann.points}
                  stroke={ann.color}
                  strokeWidth={4}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                />
              );
            }
            if (ann.tool === 'segment') {
              // Segment d'alignement with dashed line + small perpendicular ticks at ends
              const [x1, y1, x2, y2] = ann.points;
              const isHorizontal = y1 === y2;
              const tickSize = 16;
              return (
                <React.Fragment key={ann.id}>
                  <Line
                    points={[x1, y1, x2, y2]}
                    stroke={ann.color}
                    strokeWidth={3}
                    dash={[12, 6]}
                    lineCap="round"
                  />
                  {/* Start tick */}
                  <Line
                    points={isHorizontal
                      ? [x1, y1 - tickSize, x1, y1 + tickSize]
                      : [x1 - tickSize, y1, x1 + tickSize, y1]
                    }
                    stroke={ann.color}
                    strokeWidth={3}
                    lineCap="round"
                  />
                  {/* End tick */}
                  <Line
                    points={isHorizontal
                      ? [x2, y2 - tickSize, x2, y2 + tickSize]
                      : [x2 - tickSize, y2, x2 + tickSize, y2]
                    }
                    stroke={ann.color}
                    strokeWidth={3}
                    lineCap="round"
                  />
                </React.Fragment>
              );
            }
            if (ann.tool === 'rect') {
              return (
                <Rect
                  key={ann.id}
                  x={ann.x}
                  y={ann.y}
                  width={ann.width}
                  height={ann.height}
                  stroke={ann.color}
                  strokeWidth={4}
                />
              );
            }
            if (ann.tool === 'circle') {
              const radius = Math.sqrt(Math.pow(ann.width || 0, 2) + Math.pow(ann.height || 0, 2));
              return (
                <Circle
                  key={ann.id}
                  x={ann.x}
                  y={ann.y}
                  radius={radius}
                  stroke={ann.color}
                  strokeWidth={4}
                />
              );
            }
            if (ann.tool === 'arrow') {
              return (
                <Arrow
                  key={ann.id}
                  points={ann.points}
                  stroke={ann.color}
                  fill={ann.color}
                  strokeWidth={4}
                  pointerLength={14}
                  pointerWidth={14}
                />
              );
            }
            if (ann.tool === 'line') {
              return (
                <Line
                  key={ann.id}
                  points={ann.points}
                  stroke={ann.color}
                  strokeWidth={4}
                />
              );
            }
            return null;
          })}
        </Layer>
      </Stage>
    </div>
  );
};
