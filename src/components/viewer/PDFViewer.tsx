import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { useToolStore } from '@/stores/toolStore';
import { useUIStore } from '@/stores/uiStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { PageDimensions, TextItem, AnnotationObject } from '@core/pdf/engine.interface';
import { AlertCircle, Check, X, Edit3, StickyNote } from 'lucide-react';
import { SelectionHUD } from './SelectionHUD';
import { pointsToSvgPath, distanceToStroke, distToSegmentSquared } from '@/utils/spline-utils';

import { extractTextFromArea } from '@core/ocr/area-extractor';
import { AreaOCRDialog } from '@/components/dialogs/AreaOCRDialog';
import { ScannedDocBanner } from './ScannedDocBanner';
import { generateStampContent } from '@/types/dynamicStamp';
import { PresentationOverlays } from './PresentationOverlays';

interface LocalDrawingStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth: number;
  opacity: number;
}

interface PageCanvasProps {
  pageIndex: number;
  scale: number;
  dimensions: PageDimensions;
  isActive: boolean;
  isSpacePressed?: boolean;
  onSnipOCR?: (data: {
    text: string;
    confidence?: number;
    wordCount?: number;
    isDigital?: boolean;
    language?: string;
    lastExtraction?: {
      pageIndex: number;
      pdfRect: { x: number; y: number; width: number; height: number };
      dimensions: PageDimensions;
      cropBoxScreen: { x: number; y: number; width: number; height: number };
    };
  }) => void;
  externalRenderVersion?: number;
}

function isPointNearAnnotation(
  annot: AnnotationObject,
  pdfX: number,
  pdfY: number,
  radiusInPdf: number
): boolean {
  if (annot.type === 'draw' && annot.points && annot.points.length > 1) {
    return distanceToStroke({ x: pdfX, y: pdfY }, annot.points) <= radiusInPdf;
  }

  if (annot.type === 'line' || annot.type === 'arrow' || annot.type === 'measure') {
    const p1 = { x: annot.rect[0], y: annot.rect[1] };
    const p2 = annot.endPoint
      ? annot.endPoint
      : { x: annot.rect[0] + annot.rect[2], y: annot.rect[1] + annot.rect[3] };
    const distSq = distToSegmentSquared({ x: pdfX, y: pdfY }, p1, p2);
    return Math.sqrt(distSq) <= radiusInPdf;
  }

  // Rectangular / box annotations: rectangle, circle, highlight, underline, strikethrough, stamp, note
  const [rx, ry, rw, rh] = annot.rect;
  const pad = Math.max(radiusInPdf, 4);
  return (
    pdfX >= rx - pad &&
    pdfX <= rx + rw + pad &&
    pdfY >= ry - pad &&
    pdfY <= ry + rh + pad
  );
}

const PageCanvas: React.FC<PageCanvasProps> = ({
  pageIndex,
  scale,
  dimensions,
  isActive: _isActive,
  isSpacePressed = false,
  onSnipOCR,
  externalRenderVersion = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    documentId,
    pushHistory,
    searchResults,
    formFields,
    highlightFormFields,
    updateFormField,
    refreshFormFields,
    markDirty,
  } = useDocumentStore();
  const {
    currentTool,
    color,
    strokeWidth,
    opacity,
    fontSize,
    fontFamily,
    dynamicStampConfig,
    eraserRadius,
    measureUnit,
    measureScale,
    stagedRedactions,
    addStagedRedaction,
    ocrLanguage,
  } = useToolStore();
  const { addToast, paperTone } = useUIStore();

  const [localStrokes, setLocalStrokes] = useState<LocalDrawingStroke[]>([]);
  const [pageAnnotations, setPageAnnotations] = useState<AnnotationObject[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; pdfX: number; pdfY: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number; pdfX: number; pdfY: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [hoveredStrokeId, setHoveredStrokeId] = useState<string | null>(null);
  const [hoveredAnnotId, setHoveredAnnotId] = useState<string | null>(null);
  const [eraserCursorPos, setEraserCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPressureWidth, setCurrentPressureWidth] = useState<number | null>(null);

  // Synchronized refs to guarantee zero-latency stroke capture and eliminate React batching drop
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; pdfX: number; pdfY: number } | null>(null);
  const dragCurrentRef = useRef<{ x: number; y: number; pdfX: number; pdfY: number } | null>(null);
  const currentBoxRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const freehandPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  
  // Inline text input state (for adding new text)
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number; pdfX: number; pdfY: number } | null>(null);
  const [inlineText, setInlineText] = useState('');

  // AcroForm Field Builder state
  const [newFieldModal, setNewFieldModal] = useState<{
    type: 'text' | 'checkbox' | 'dropdown';
    rect: [number, number, number, number];
    name: string;
    defaultValue: string;
    options: string;
  } | null>(null);

  // Direct In-Place Text Editing state (for editing existing PDF text)
  const [pageTextItems, setPageTextItems] = useState<TextItem[]>([]);
  const [editingItem, setEditingItem] = useState<{
    item: TextItem;
    pdfRect: [number, number, number, number];
    screenRect: { x: number; y: number; w: number; h: number };
  } | null>(null);
  const [editInputText, setEditInputText] = useState('');

  const width = Math.floor(dimensions.width * scale);
  const height = Math.floor(dimensions.height * scale);

  const [renderVersion, setRenderVersion] = useState(0);

  // Inline Sticky Note Placement state
  const [pendingNote, setPendingNote] = useState<{
    clientX: number;
    clientY: number;
    pdfX: number;
    pdfY: number;
    text: string;
    noteColor: string;
  } | null>(null);

  // Render Page to Canvas
  useEffect(() => {
    let isCancelled = false;
    const render = async () => {
      if (!documentId || !canvasRef.current) return;
      try {
        const engine = getPDFEngine();
        const res = await engine.renderPage(documentId, pageIndex, scale);
        if (isCancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        canvas.width = res.width;
        canvas.height = res.height;
        const ctx = canvas.getContext('2d');
        if (ctx && res.canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(res.canvas, 0, 0);
          // Zero offscreen canvas dimensions to immediately free GPU texture
          res.canvas.width = 0;
          res.canvas.height = 0;
        }
      } catch (e) {
        console.warn('Page render error:', e);
      }
    };

    render();
    return () => {
      isCancelled = true;
      if (canvasRef.current) {
        canvasRef.current.width = 0;
        canvasRef.current.height = 0;
      }
    };
  }, [documentId, pageIndex, scale, dimensions, renderVersion, externalRenderVersion]);

  // Load existing page text items when Selection HUD, Markup Tools, or In-Place Edit Text mode is active
  useEffect(() => {
    if (!['edit_text', 'select', 'highlight', 'underline', 'strikethrough'].includes(currentTool) || !documentId) {
      setEditingItem(null);
      return;
    }
    let isCancelled = false;
    const loadText = async () => {
      try {
        const engine = getPDFEngine();
        const textContent = await engine.extractPageText(documentId, pageIndex);
        if (!isCancelled) {
          setPageTextItems(textContent.items || []);
        }
      } catch (err) {
        console.warn('Error fetching text items for edit/selection:', err);
      }
    };
    loadText();
    return () => {
      isCancelled = true;
    };
  }, [currentTool, documentId, pageIndex, renderVersion, externalRenderVersion]);

  // Load existing annotations on mount or when renderVersion updates
  useEffect(() => {
    if (!documentId) return;
    let isCancelled = false;
    const loadAnnots = async () => {
      try {
        const engine = getPDFEngine();
        const annots = await engine.getAnnotations(documentId, pageIndex);
        if (!isCancelled) {
          setPageAnnotations(annots);
          const strokes: LocalDrawingStroke[] = [];
          for (const a of annots) {
            if (a.type === 'draw' && a.points && a.points.length > 1) {
              strokes.push({
                id: a.id,
                points: a.points,
                color: a.color,
                strokeWidth: a.strokeWidth || 2,
                opacity: a.opacity ?? 1,
              });
            }
          }
          setLocalStrokes(strokes);
        }
      } catch (e) {
        console.warn('Error loading annotations:', e);
      }
    };
    loadAnnots();
    return () => {
      isCancelled = true;
    };
  }, [documentId, pageIndex, renderVersion, externalRenderVersion]);

  // Transform browser pointer event coordinates to PDF point coordinates (from bottom-left)
  const getPdfCoordinates = useCallback(
    (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
      const rect = pageContainerRef.current?.getBoundingClientRect() || e.currentTarget.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // PDF coordinate origin is bottom-left
      const pdfX = (clientX / width) * dimensions.width;
      const pdfY = ((height - clientY) / height) * dimensions.height;

      return { clientX, clientY, pdfX, pdfY };
    },
    [width, height, dimensions]
  );

  // Cancel in-progress drawing or box drag on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawingRef.current) {
        isDrawingRef.current = false;
        dragStartRef.current = null;
        dragCurrentRef.current = null;
        currentBoxRef.current = null;
        freehandPointsRef.current = [];
        setIsDrawing(false);
        setDragStart(null);
        setDragCurrent(null);
        setCurrentBox(null);
        setFreehandPoints([]);
        setCurrentPressureWidth(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePointerDown = async (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button (left click / touch / stylus tip)
    if (e.button !== 0 || isSpacePressed) return;
    if (['select', 'hand', 'edit_text'].includes(currentTool)) return;

    const isTextSpanClicked = Boolean(
      (e.target as HTMLElement)?.closest('[data-text-layer]') ||
      (e.target as HTMLElement)?.dataset?.textSpan
    );

    // If clicking directly on text while on markup tools, allow native browser selection
    if (['highlight', 'underline', 'strikethrough'].includes(currentTool) && isTextSpanClicked) {
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const { clientX, clientY, pdfX, pdfY } = getPdfCoordinates(e);

    // Universal Eraser Tool Hit Detection & Erase Action
    if (currentTool === 'eraser') {
      isDrawingRef.current = true;
      dragStartRef.current = { x: clientX, y: clientY, pdfX, pdfY };
      setIsDrawing(true);
      setDragStart({ x: clientX, y: clientY, pdfX, pdfY });
      const scaleRatio = width / dimensions.width;
      const radiusInPdf = eraserRadius / scaleRatio;
      const target = pageAnnotations.find((a) =>
        isPointNearAnnotation(a, pdfX, pdfY, radiusInPdf)
      );
      if (target) {
        setPageAnnotations((prev) => prev.filter((a) => a.id !== target.id));
        setLocalStrokes((prev) => prev.filter((s) => s.id !== target.id));
        setHoveredAnnotId(null);
        setHoveredStrokeId(null);
        if (documentId) {
          getPDFEngine().deleteAnnotation(documentId, target.id).catch(() => {});
          markDirty();
          setRenderVersion((v) => v + 1);
        }
      }
      return;
    }

    if (currentTool === 'text') {
      setTextInputPos({ x: clientX, y: clientY, pdfX, pdfY });
      setInlineText('');
      return;
    }

    if (currentTool === 'stamp') {
      if (!documentId) return;
      try {
        const stampData = generateStampContent(dynamicStampConfig, new Date());
        await pushHistory(`Stamp "${stampData.title}"`);
        const engine = getPDFEngine();
        const stampW = stampData.width;
        const stampH = stampData.height;
        const newAnnot: AnnotationObject = {
          id: `annot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          pageIndex,
          type: 'stamp',
          stampText: stampData.fullStampText,
          isFlag: stampData.isFlag,
          rect: [Math.max(0, pdfX - stampW / 2), Math.max(0, pdfY - stampH / 2), stampW, stampH],
          color: dynamicStampConfig.color || color,
          opacity,
          createdAt: new Date().toISOString(),
        } as any;
        setPageAnnotations((prev) => [...prev, newAnnot]);
        await engine.addAnnotation(documentId, newAnnot);
        markDirty();
        setRenderVersion((v) => v + 1);
        addToast({
          type: 'success',
          title: 'Stamp Placed',
          message: `Placed "${stampData.title}" stamp on page ${pageIndex + 1}.`,
        });
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Stamp Failed',
          message: err?.message || 'Failed to place stamp.',
        });
      }
      return;
    }

    if (currentTool === 'note') {
      if (!documentId) return;
      setPendingNote({
        clientX,
        clientY,
        pdfX,
        pdfY,
        text: '',
        noteColor: color || '#fef08a',
      });
      return;
    }

    isDrawingRef.current = true;
    dragStartRef.current = { x: clientX, y: clientY, pdfX, pdfY };
    dragCurrentRef.current = { x: clientX, y: clientY, pdfX, pdfY };
    setIsDrawing(true);
    setDragStart({ x: clientX, y: clientY, pdfX, pdfY });
    setDragCurrent({ x: clientX, y: clientY, pdfX, pdfY });

    if (currentTool === 'draw') {
      const pWidth = e.pressure && e.pressure > 0.05 ? Math.max(1, (strokeWidth || 2) * (0.5 + e.pressure * 1.0)) : (strokeWidth || 2);
      setCurrentPressureWidth(pWidth);
      freehandPointsRef.current = [{ x: pdfX, y: pdfY }];
      setFreehandPoints([{ x: pdfX, y: pdfY }]);
    } else if (['rectangle', 'circle', 'line', 'arrow', 'measure', 'highlight', 'underline', 'strikethrough', 'redact', 'form_text', 'form_checkbox', 'form_dropdown', 'snip_ocr'].includes(currentTool)) {
      currentBoxRef.current = { x: clientX, y: clientY, w: 0, h: 0 };
      setCurrentBox({ x: clientX, y: clientY, w: 0, h: 0 });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isSpacePressed) return;
    const { clientX, clientY, pdfX, pdfY } = getPdfCoordinates(e);

    // Universal Eraser Tool Movement & Swipe Erasing
    if (currentTool === 'eraser') {
      setEraserCursorPos({ x: clientX, y: clientY });
      const scaleRatio = width / dimensions.width;
      const radiusInPdf = eraserRadius / scaleRatio;
      const target = pageAnnotations.find((a) =>
        isPointNearAnnotation(a, pdfX, pdfY, radiusInPdf)
      );
      setHoveredAnnotId(target ? target.id : null);
      setHoveredStrokeId(target && target.type === 'draw' ? target.id : null);
      if (isDrawingRef.current && target) {
        setPageAnnotations((prev) => prev.filter((a) => a.id !== target.id));
        setLocalStrokes((prev) => prev.filter((s) => s.id !== target.id));
        setHoveredAnnotId(null);
        setHoveredStrokeId(null);
        if (documentId) {
          getPDFEngine().deleteAnnotation(documentId, target.id).catch(() => {});
          markDirty();
          setRenderVersion((v) => v + 1);
        }
      }
      return;
    }

    if (!isDrawingRef.current || !dragStartRef.current) return;
    dragCurrentRef.current = { x: clientX, y: clientY, pdfX, pdfY };
    setDragCurrent({ x: clientX, y: clientY, pdfX, pdfY });

    if (currentTool === 'draw') {
      if (e.pressure && e.pressure > 0.05) {
        const pWidth = Math.max(1, (strokeWidth || 2) * (0.5 + e.pressure * 1.0));
        setCurrentPressureWidth(pWidth);
      }
      const pts = freehandPointsRef.current;
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(last.x - pdfX, last.y - pdfY) >= 0.8) {
        pts.push({ x: pdfX, y: pdfY });
        setFreehandPoints([...pts]);
      }
    } else if (['rectangle', 'circle', 'line', 'arrow', 'measure', 'highlight', 'underline', 'strikethrough', 'redact', 'form_text', 'form_checkbox', 'form_dropdown', 'snip_ocr'].includes(currentTool)) {
      const start = dragStartRef.current;
      const x = Math.min(start.x, clientX);
      const y = Math.min(start.y, clientY);
      const w = Math.abs(clientX - start.x);
      const h = Math.abs(clientY - start.y);
      currentBoxRef.current = { x, y, w, h };
      setCurrentBox({ x, y, w, h });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (currentTool === 'eraser') {
      isDrawingRef.current = false;
      dragStartRef.current = null;
      dragCurrentRef.current = null;
      setIsDrawing(false);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    if (!isDrawingRef.current || !dragStartRef.current || !documentId) {
      isDrawingRef.current = false;
      dragStartRef.current = null;
      dragCurrentRef.current = null;
      currentBoxRef.current = null;
      freehandPointsRef.current = [];
      setIsDrawing(false);
      setDragStart(null);
      setDragCurrent(null);
      setCurrentBox(null);
      setFreehandPoints([]);
      setCurrentPressureWidth(null);
      return;
    }

    // Capture stroke parameters synchronously from refs so it is NEVER stale
    const tool = currentTool;
    const rawPoints = [...freehandPointsRef.current];
    const points = rawPoints.length === 1
      ? [rawPoints[0], { x: rawPoints[0].x + 0.5, y: rawPoints[0].y + 0.5 }]
      : rawPoints;
    const box = currentBoxRef.current ? { ...currentBoxRef.current } : null;
    const dStart = { ...dragStartRef.current };
    const dCurrent = dragCurrentRef.current ? { ...dragCurrentRef.current } : null;
    const strokeColor = color;
    const strokeWidthVal = currentPressureWidth || strokeWidth || 2;
    const strokeOpacityVal = opacity || 1;

    // Synchronously reset drawing state so next stroke can begin IMMEDIATELY with zero lag
    isDrawingRef.current = false;
    dragStartRef.current = null;
    dragCurrentRef.current = null;
    currentBoxRef.current = null;
    freehandPointsRef.current = [];
    setIsDrawing(false);
    setDragStart(null);
    setDragCurrent(null);
    setCurrentBox(null);
    setFreehandPoints([]);
    setCurrentPressureWidth(null);

    // 1. FREEHAND BRUSH / PEN STROKE
    if (tool === 'draw' && points.length >= 1) {
      const strokeId = `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      // Immediately display in persistent SVG layer so it NEVER disappears or flickers
      setLocalStrokes((prev) => [
        ...prev,
        {
          id: strokeId,
          points,
          color: strokeColor,
          strokeWidth: strokeWidthVal,
          opacity: strokeOpacityVal,
        },
      ]);
      const newDrawAnnot: AnnotationObject = {
        id: strokeId,
        pageIndex,
        type: 'draw',
        rect: [0, 0, dimensions.width, dimensions.height],
        color: strokeColor,
        opacity: strokeOpacityVal,
        strokeWidth: strokeWidthVal,
        points,
        createdAt: new Date().toISOString(),
      };
      setPageAnnotations((prev) => [...prev, newDrawAnnot]);

      // Non-blocking background persistence to PDF engine
      (async () => {
        try {
          const engine = getPDFEngine();
          await pushHistory('Freehand drawing');
          await engine.addAnnotation(documentId, newDrawAnnot);
          markDirty();
        } catch (err: any) {
          console.warn('Annotation save error:', err);
        }
      })();
      return;
    }

    // 2. LINE / ARROW / MEASURE
    if ((tool === 'line' || tool === 'arrow' || tool === 'measure') && dCurrent && Math.hypot(dCurrent.x - dStart.x, dCurrent.y - dStart.y) > 5) {
      const annotId = `annot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      if (tool === 'measure') {
        const distPt = Math.hypot(dCurrent.pdfX - dStart.pdfX, dCurrent.pdfY - dStart.pdfY);
        let converted = distPt;
        if (measureUnit === 'mm') converted = distPt * (25.4 / 72);
        else if (measureUnit === 'cm') converted = distPt * (2.54 / 72);
        else if (measureUnit === 'in') converted = distPt / 72;
        const finalVal = converted * (measureScale || 1.0);
        const dimensionText = `${finalVal < 10 ? finalVal.toFixed(2) : finalVal.toFixed(1)} ${measureUnit}`;

        const newAnnot: AnnotationObject = {
          id: annotId,
          pageIndex,
          type: 'measure',
          rect: [dStart.pdfX, dStart.pdfY, dCurrent.pdfX, dCurrent.pdfY],
          color: strokeColor,
          opacity: strokeOpacityVal,
          strokeWidth: strokeWidthVal,
          endPoint: { x: dCurrent.pdfX, y: dCurrent.pdfY },
          dimensionUnit: measureUnit,
          dimensionScale: measureScale,
          dimensionText,
          createdAt: new Date().toISOString(),
        };
        setPageAnnotations((prev) => [...prev, newAnnot]);

        (async () => {
          try {
            const engine = getPDFEngine();
            await pushHistory(`Measurement (${dimensionText})`);
            await engine.addAnnotation(documentId, newAnnot);
            markDirty();
            setRenderVersion((v) => v + 1);
          } catch (err: any) {
            console.warn('Measurement save error:', err);
          }
        })();
        return;
      }

      const newAnnot: AnnotationObject = {
        id: annotId,
        pageIndex,
        type: tool,
        rect: [dStart.pdfX, dStart.pdfY, dCurrent.pdfX, dCurrent.pdfY],
        color: strokeColor,
        opacity: strokeOpacityVal,
        strokeWidth: strokeWidthVal,
        endPoint: { x: dCurrent.pdfX, y: dCurrent.pdfY },
        createdAt: new Date().toISOString(),
      };
      setPageAnnotations((prev) => [...prev, newAnnot]);

      (async () => {
        try {
          const engine = getPDFEngine();
          await pushHistory(tool === 'arrow' ? 'Arrow' : 'Line');
          await engine.addAnnotation(documentId, newAnnot);
          markDirty();
          setRenderVersion((v) => v + 1);
        } catch (err: any) {
          console.warn('Line save error:', err);
        }
      })();
      return;
    }

    // 3. SHAPES / HIGHLIGHTS / REDACTION / SNIP OCR
    if (box && box.w > 5 && box.h > 5) {
      if (tool === 'snip_ocr' && box.w > 8 && box.h > 8) {
        const pdfX = (box.x / width) * dimensions.width;
        const pdfY = ((height - (box.y + box.h)) / height) * dimensions.height;
        const pdfW = (box.w / width) * dimensions.width;
        const pdfH = (box.h / height) * dimensions.height;

        (async () => {
          try {
            const engine = getPDFEngine();
            addToast({
              type: 'info',
              title: 'Extracting Area Text...',
              message: 'Reading text with copy-restriction bypass & deep neural OCR...',
            });

            const result = await extractTextFromArea({
              engine,
              documentId,
              pageIndex,
              pdfRect: { x: pdfX, y: pdfY, width: pdfW, height: pdfH },
              dimensions,
              screenCanvas: canvasRef.current,
              cropBoxScreen: { x: box.x, y: box.y, width: box.w, height: box.h },
              language: ocrLanguage,
            });

            const recognizedText = result.text.trim();
            if (recognizedText) {
              await navigator.clipboard.writeText(recognizedText).catch(() => {});
              addToast({
                type: 'success',
                title: result.isDigital ? '⚡ 100% Precision Extraction' : 'OCR Extraction Complete',
                message: `${result.wordCount} words captured and copied to clipboard!`,
              });
              if (onSnipOCR) {
                onSnipOCR({
                  text: recognizedText,
                  confidence: result.confidence,
                  wordCount: result.wordCount,
                  isDigital: result.isDigital,
                  language: ocrLanguage,
                  lastExtraction: {
                    pageIndex,
                    pdfRect: { x: pdfX, y: pdfY, width: pdfW, height: pdfH },
                    dimensions,
                    cropBoxScreen: { x: box.x, y: box.y, width: box.w, height: box.h },
                  },
                });
              }
            } else {
              addToast({
                type: 'warning',
                title: 'No Text Found',
                message: 'Could not detect readable characters in the selected area.',
              });
            }
          } catch (err: any) {
            console.error('Area extraction error:', err);
            addToast({
              type: 'error',
              title: 'OCR Failed',
              message: err?.message || 'Failed to extract text from area.',
            });
          }
        })();
        return;
      }

      const pdfX = (box.x / width) * dimensions.width;
      const pdfY = ((height - (box.y + box.h)) / height) * dimensions.height;
      const pdfW = (box.w / width) * dimensions.width;
      const pdfH = (box.h / height) * dimensions.height;

      if (tool === 'redact') {
        addStagedRedaction({
          pageIndex,
          rect: [pdfX, pdfY, pdfW, pdfH],
          overlayText: '[REDACTED]',
        });
        addToast({
          type: 'info',
          title: 'Redaction Staged',
          message: 'Area queued. Click "Apply Redactions" in toolbar to permanently purge data.',
        });
      } else if (['highlight', 'underline', 'strikethrough', 'circle', 'rectangle'].includes(tool)) {
        const annotId = `annot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newAnnot: AnnotationObject = {
          id: annotId,
          pageIndex,
          type: tool as any,
          rect: [pdfX, pdfY, pdfW, pdfH],
          color: strokeColor,
          opacity: tool === 'highlight' ? Math.min(strokeOpacityVal, 0.4) : strokeOpacityVal,
          strokeWidth: strokeWidthVal,
          createdAt: new Date().toISOString(),
        };
        setPageAnnotations((prev) => [...prev, newAnnot]);

        (async () => {
          try {
            const engine = getPDFEngine();
            await pushHistory(`Add ${tool}`);
            await engine.addAnnotation(documentId, newAnnot);
            markDirty();
            setRenderVersion((v) => v + 1);
          } catch (err: any) {
            console.warn('Shape save error:', err);
          }
        })();
      } else if (['form_text', 'form_checkbox', 'form_dropdown'].includes(tool)) {
        const typeMap: Record<string, 'text' | 'checkbox' | 'dropdown'> = {
          form_text: 'text',
          form_checkbox: 'checkbox',
          form_dropdown: 'dropdown',
        };
        const fType = typeMap[tool] || 'text';
        setNewFieldModal({
          type: fType,
          rect: [pdfX, pdfY, pdfW, pdfH],
          name: `${fType}_${Date.now() % 10000}`,
          defaultValue: '',
          options: 'Option 1, Option 2, Option 3',
        });
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    isDrawingRef.current = false;
    dragStartRef.current = null;
    dragCurrentRef.current = null;
    currentBoxRef.current = null;
    freehandPointsRef.current = [];
    setIsDrawing(false);
    setDragStart(null);
    setDragCurrent(null);
    setCurrentBox(null);
    setFreehandPoints([]);
    setCurrentPressureWidth(null);
  };

  const handleCommitStickyNote = async () => {
    if (!pendingNote || !pendingNote.text.trim() || !documentId) {
      setPendingNote(null);
      return;
    }
    try {
      await pushHistory('Sticky Note');
      const engine = getPDFEngine();
      const noteW = 120;
      const noteH = 34;
      const newAnnot: AnnotationObject = {
        id: `annot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        pageIndex,
        type: 'note',
        content: pendingNote.text.trim(),
        rect: [
          Math.max(0, pendingNote.pdfX - noteW / 2),
          Math.max(0, pendingNote.pdfY - noteH / 2),
          noteW,
          noteH,
        ],
        color: pendingNote.noteColor || color,
        opacity: 1.0,
        createdAt: new Date().toISOString(),
      };
      setPageAnnotations((prev) => [...prev, newAnnot]);
      await engine.addAnnotation(documentId, newAnnot);
      markDirty();
      setRenderVersion((v) => v + 1);
      addToast({
        type: 'success',
        title: 'Sticky Note Placed',
        message: `Placed sticky note on page ${pageIndex + 1}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Note Failed',
        message: err?.message || 'Failed to place sticky note.',
      });
    } finally {
      setPendingNote(null);
    }
  };

  const handleCreateFormField = async () => {
    if (!newFieldModal || !documentId) return;
    try {
      const engine = getPDFEngine();
      await pushHistory(`Create form field "${newFieldModal.name}"`);
      await engine.addFormField(documentId, {
        pageIndex,
        type: newFieldModal.type,
        name: newFieldModal.name,
        rect: newFieldModal.rect,
        defaultValue: newFieldModal.defaultValue,
        options:
          newFieldModal.type === 'dropdown'
            ? newFieldModal.options.split(',').map((s) => s.trim()).filter(Boolean)
            : undefined,
      });
      await refreshFormFields();
      markDirty();
      setRenderVersion((v) => v + 1);
      addToast({
        type: 'success',
        title: 'Form Field Created',
        message: `Created ${newFieldModal.type} field "${newFieldModal.name}".`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Field Creation Failed',
        message: err?.message || 'Could not create form field.',
      });
    } finally {
      setNewFieldModal(null);
    }
  };

  const handleCommitInlineText = async () => {
    if (!textInputPos || !inlineText.trim() || !documentId) {
      setTextInputPos(null);
      return;
    }

    try {
      await pushHistory(`Insert text "${inlineText.substring(0, 15)}..."`);
      const engine = getPDFEngine();
      await engine.insertText(documentId, {
        pageIndex,
        text: inlineText,
        x: textInputPos.pdfX,
        y: textInputPos.pdfY,
        size: fontSize,
        color,
        fontFamily,
      });
      markDirty();
      setRenderVersion((v) => v + 1);

      addToast({
        type: 'success',
        title: 'Text Inserted',
        message: 'Text was placed at the specified coordinate.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Insert Text Failed',
        message: err?.message || 'Failed to insert text.',
      });
    } finally {
      setTextInputPos(null);
      setInlineText('');
    }
  };

  // Direct In-Place Text Edit Commit Handler
  const handleCommitTextEdit = async () => {
    if (!editingItem || !documentId) return;
    try {
      await pushHistory(`Edit text "${editingItem.item.str}" -> "${editInputText}"`);
      const engine = getPDFEngine();
      await engine.replaceTextOnPage(documentId, {
        pageIndex,
        rect: editingItem.pdfRect,
        originalText: editingItem.item.str,
        newText: editInputText,
        fontSize,
        color,
        fontFamily,
      });
      markDirty();
      setRenderVersion((v) => v + 1);

      // Update in-memory text items
      setPageTextItems((prev) =>
        prev.map((it) => (it === editingItem.item ? { ...it, str: editInputText } : it))
      );

      addToast({
        type: 'success',
        title: 'Text Replaced',
        message: `Updated to "${editInputText}" on page ${pageIndex + 1}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Text Edit Failed',
        message: err?.message || 'Could not replace text on page.',
      });
    } finally {
      setEditingItem(null);
    }
  };

  const pageMatches = searchResults.filter((r) => r.pageIndex === pageIndex);
  const pageFields = formFields.filter((f) => f.pageIndex === pageIndex);
  const pageStagedRedactions = stagedRedactions.filter((r) => r.pageIndex === pageIndex);

  // Ergonomic Paper Tone styles for canvas
  let canvasFilter: string | undefined = undefined;
  let pageBgColor = '#ffffff';

  if (paperTone === 'sepia') {
    canvasFilter = 'sepia(0.38) contrast(0.96)';
    pageBgColor = '#fbf0d9';
  } else if (paperTone === 'dark') {
    canvasFilter = 'invert(0.92) hue-rotate(180deg) contrast(1.15)';
    pageBgColor = '#1e293b';
  } else if (paperTone === 'mint') {
    canvasFilter = 'sepia(0.18) hue-rotate(85deg) saturate(0.85)';
    pageBgColor = '#f0f7f2';
  }

  return (
    <div
      ref={pageContainerRef}
      className={`relative shadow-2xl select-none transition-shadow hover:shadow-cyan-950/20 touch-none ${
        currentTool === 'eraser'
          ? 'cursor-none'
          : ['draw', 'measure', 'rectangle', 'circle', 'line', 'arrow', 'snip_ocr', 'redact'].includes(currentTool)
          ? 'cursor-crosshair'
          : currentTool === 'text'
          ? 'cursor-text'
          : currentTool === 'hand'
          ? 'cursor-grab'
          : ''
      }`}
      style={{ width: `${width}px`, height: `${height}px`, backgroundColor: pageBgColor }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={(e) => {
        setHoveredStrokeId(null);
        setEraserCursorPos(null);
        if (isDrawingRef.current) {
          handlePointerUp(e);
        }
      }}
    >
      {/* Underlying Rendered Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none block"
        style={{ width: `${width}px`, height: `${height}px`, filter: canvasFilter }}
      />

      {/* Direct In-Place Text Editing Overlays */}
      {currentTool === 'edit_text' &&
        pageTextItems.map((item, idx) => {
          const screenX = (item.x / dimensions.width) * width;
          const screenH = Math.max(12, (item.height / dimensions.height) * height);
          const screenY = height - ((item.y + (item.height || 12)) / dimensions.height) * height;
          const screenW = Math.max(14, (item.width / dimensions.width) * width);

          return (
            <div
              key={`edit_text_${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                setEditingItem({
                  item,
                  pdfRect: [item.x, item.y, Math.max(item.width, 10), Math.max(item.height || 12, 10)],
                  screenRect: { x: screenX, y: screenY, w: screenW, h: screenH },
                });
                setEditInputText(item.str);
              }}
              className="absolute z-20 transition-all border border-dashed border-swift-500/50 hover:border-swift-400 hover:bg-swift-500/25 cursor-text rounded-sm group flex items-center justify-center"
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: `${screenW}px`,
                height: `${screenH}px`,
              }}
              title={`Click to edit: "${item.str}"`}
            >
              <span className="sr-only">{item.str}</span>
            </div>
          );
        })}

      {/* Direct In-Place Text Editor Popup */}
      {editingItem && (
        <div
          className="absolute z-40 bg-black border border-swift-500 p-2 rounded-xl shadow-2xl flex items-center gap-2 animate-scale-in"
          style={{
            left: `${Math.max(4, Math.min(width - 270, editingItem.screenRect.x))}px`,
            top: `${Math.max(4, editingItem.screenRect.y - 44)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 text-[10px] text-swift-400 font-semibold uppercase tracking-wider pl-1">
            <Edit3 className="w-3 h-3" />
            Edit:
          </div>
          <input
            autoFocus
            type="text"
            value={editInputText}
            onChange={(e) => setEditInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCommitTextEdit();
              if (e.key === 'Escape') setEditingItem(null);
            }}
            className="bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 outline-none w-56 focus:border-swift-500"
            placeholder="Enter replacement text..."
          />
          <button
            onClick={handleCommitTextEdit}
            className="p-1.5 bg-swift-600 hover:bg-swift-500 text-white rounded-lg transition-colors"
            title="Save text changes"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setEditingItem(null)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* AcroForm Field Builder Popup */}
      {newFieldModal && (
        <div
          className="absolute z-40 bg-black border border-swift-500 p-3 rounded-xl shadow-2xl flex flex-col gap-2 animate-scale-in text-xs w-64"
          style={{
            left: `${Math.max(10, Math.min(width - 270, (newFieldModal.rect[0] / dimensions.width) * width))}px`,
            top: `${Math.max(10, height - ((newFieldModal.rect[1] + newFieldModal.rect[3]) / dimensions.height) * height - 80)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="font-semibold text-white flex items-center justify-between">
            <span className="capitalize">New {newFieldModal.type} Field</span>
            <button
              onClick={() => setNewFieldModal(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Field Name</label>
            <input
              type="text"
              value={newFieldModal.name}
              onChange={(e) => setNewFieldModal({ ...newFieldModal, name: e.target.value })}
              className="w-full bg-slate-800 text-white px-2 py-1 rounded border border-slate-700 outline-none focus:border-swift-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Default Value</label>
            <input
              type="text"
              value={newFieldModal.defaultValue}
              onChange={(e) => setNewFieldModal({ ...newFieldModal, defaultValue: e.target.value })}
              className="w-full bg-slate-800 text-white px-2 py-1 rounded border border-slate-700 outline-none focus:border-swift-500"
            />
          </div>
          {newFieldModal.type === 'dropdown' && (
            <div>
              <label className="text-[10px] text-slate-400">Options (comma-separated)</label>
              <input
                type="text"
                value={newFieldModal.options}
                onChange={(e) => setNewFieldModal({ ...newFieldModal, options: e.target.value })}
                className="w-full bg-slate-800 text-white px-2 py-1 rounded border border-slate-700 outline-none focus:border-swift-500"
              />
            </div>
          )}
          <button
            onClick={handleCreateFormField}
            className="w-full py-1.5 bg-swift-600 hover:bg-swift-500 text-white font-medium rounded-lg transition-colors mt-1"
          >
            Add Field
          </button>
        </div>
      )}

      {/* Selectable Text Layer for HUD & Text Markup Tools */}
      {['select', 'highlight', 'underline', 'strikethrough'].includes(currentTool) && pageTextItems.length > 0 && (
        <div data-text-layer="true" className="absolute inset-0 z-10 pointer-events-auto select-text font-sans text-transparent cursor-text overflow-hidden">
          {pageTextItems.map((item, idx) => (
            <span
              key={`text_layer_${idx}`}
              data-text-span="true"
              style={{
                position: 'absolute',
                left: `${(item.x / dimensions.width) * width}px`,
                top: `${height - ((item.y + (item.height || 12)) / dimensions.height) * height}px`,
                fontSize: `${Math.max(1, ((item.height || 12) / dimensions.height) * height)}px`,
                fontFamily: 'sans-serif',
                lineHeight: 1,
                userSelect: 'text',
                whiteSpace: 'pre',
                transformOrigin: '0% 0%',
              }}
            >
              {item.str}
            </span>
          ))}
        </div>
      )}

      {/* Interactive Form Fields Layer */}
      {pageFields.map((field, idx) => {
        const left = (field.rect.x / dimensions.width) * width;
        const top = height - ((field.rect.y + field.rect.height) / dimensions.height) * height;
        const w = (field.rect.width / dimensions.width) * width;
        const h = (field.rect.height / dimensions.height) * height;

        if (field.type === 'checkbox') {
          return (
            <div
              key={`${field.name}_${idx}`}
              className="absolute z-20 flex items-center justify-center cursor-pointer"
              style={{ left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` }}
              onClick={() => updateFormField(field.name, !field.value)}
              title={field.name}
            >
              <input
                type="checkbox"
                checked={Boolean(field.value)}
                onChange={(e) => updateFormField(field.name, e.target.checked)}
                className="w-4 h-4 text-swift-600 bg-white/90 border-slate-400 rounded focus:ring-swift-500 cursor-pointer"
              />
            </div>
          );
        }

        if (field.type === 'dropdown' && field.options) {
          return (
            <div
              key={`${field.name}_${idx}`}
              className="absolute z-20"
              style={{ left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` }}
            >
              <select
                value={String(field.value || '')}
                onChange={(e) => updateFormField(field.name, e.target.value)}
                className="w-full h-full bg-white/90 border border-slate-300 text-slate-900 text-xs rounded px-1 outline-none focus:ring-1 focus:ring-swift-500 font-sans"
              >
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        // Text Field
        return (
          <div
            key={`${field.name}_${idx}`}
            className={`absolute z-20 transition-all ${
              highlightFormFields
                ? 'bg-swift-500/10 ring-1 ring-swift-400/60 focus-within:ring-2 focus-within:ring-swift-500 focus-within:bg-white/95'
                : 'hover:bg-slate-100/50 focus-within:bg-white/95 focus-within:ring-1 focus-within:ring-swift-500'
            }`}
            style={{ left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` }}
            title={field.name}
          >
            {field.multiline ? (
              <textarea
                value={String(field.value || '')}
                onChange={(e) => updateFormField(field.name, e.target.value)}
                maxLength={field.maxLength}
                className="w-full h-full bg-transparent text-slate-900 font-sans outline-none resize-none px-1.5 py-0.5"
                style={{ fontSize: `${Math.max(10, Math.min(14, h * 0.4))}px` }}
                placeholder={field.name}
              />
            ) : (
              <input
                type="text"
                value={String(field.value || '')}
                onChange={(e) => updateFormField(field.name, e.target.value)}
                maxLength={field.maxLength}
                className="w-full h-full bg-transparent text-slate-900 font-sans outline-none px-1.5"
                style={{ fontSize: `${Math.max(10, Math.min(14, h * 0.65))}px` }}
                placeholder={field.name}
              />
            )}
          </div>
        );
      })}

      {/* SVG Line / Arrow Dragging Preview */}
      {(currentTool === 'line' || currentTool === 'arrow') && isDrawing && dragStart && dragCurrent && (
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-20">
          <defs>
            {currentTool === 'arrow' && (
              <marker
                id={`arrow-head-${pageIndex}`}
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill={color} />
              </marker>
            )}
          </defs>
          <line
            x1={dragStart.x}
            y1={dragStart.y}
            x2={dragCurrent.x}
            y2={dragCurrent.y}
            stroke={color}
            strokeWidth={strokeWidth || (currentTool === 'arrow' ? 2.5 : 2)}
            strokeOpacity={opacity}
            markerEnd={currentTool === 'arrow' ? `url(#arrow-head-${pageIndex})` : undefined}
          />
        </svg>
      )}

      {/* SVG Dimension Ruler Dragging Preview */}
      {currentTool === 'measure' && isDrawing && dragStart && dragCurrent && (() => {
        const dx = dragCurrent.x - dragStart.x;
        const dy = dragCurrent.y - dragStart.y;
        const len = Math.hypot(dx, dy);
        const perpX = len > 0 ? (-dy / len) * 8 : 0;
        const perpY = len > 0 ? (dx / len) * 8 : 0;

        const distPt = Math.hypot(dragCurrent.pdfX - dragStart.pdfX, dragCurrent.pdfY - dragStart.pdfY);
        let converted = distPt;
        if (measureUnit === 'mm') converted = distPt * (25.4 / 72);
        else if (measureUnit === 'cm') converted = distPt * (2.54 / 72);
        else if (measureUnit === 'in') converted = distPt / 72;
        const finalVal = converted * (measureScale || 1.0);
        const liveLabel = `${finalVal < 10 ? finalVal.toFixed(2) : finalVal.toFixed(1)} ${measureUnit}`;
        const midX = (dragStart.x + dragCurrent.x) / 2;
        const midY = (dragStart.y + dragCurrent.y) / 2;

        return (
          <svg className="absolute inset-0 pointer-events-none w-full h-full z-30 overflow-visible">
            {/* Main Dimension Line */}
            <line
              x1={dragStart.x}
              y1={dragStart.y}
              x2={dragCurrent.x}
              y2={dragCurrent.y}
              stroke={color}
              strokeWidth={strokeWidth || 2}
              strokeOpacity={opacity}
            />
            {/* Start Tick */}
            <line
              x1={dragStart.x - perpX}
              y1={dragStart.y - perpY}
              x2={dragStart.x + perpX}
              y2={dragStart.y + perpY}
              stroke={color}
              strokeWidth={strokeWidth || 2}
              strokeOpacity={opacity}
            />
            {/* End Tick */}
            <line
              x1={dragCurrent.x - perpX}
              y1={dragCurrent.y - perpY}
              x2={dragCurrent.x + perpX}
              y2={dragCurrent.y + perpY}
              stroke={color}
              strokeWidth={strokeWidth || 2}
              strokeOpacity={opacity}
            />
            {/* Live Measurement Badge */}
            <g transform={`translate(${midX}, ${midY})`}>
              <rect
                x="-36"
                y="-11"
                width="72"
                height="22"
                rx="6"
                fill="#0f172a"
                stroke={color}
                strokeWidth="1.5"
                opacity="0.95"
              />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {liveLabel}
              </text>
            </g>
          </svg>
        );
      })()}

      {/* SVG Persistent Annotations and Live Drawing */}
      <svg className="absolute inset-0 pointer-events-none w-full h-full z-20 overflow-visible">
        {/* Draw strokes (splines) */}
        {localStrokes.map((s) => {
          const isHovered = currentTool === 'eraser' && (hoveredStrokeId === s.id || hoveredAnnotId === s.id);
          const svgPoints = s.points.map((pt) => ({
            x: (pt.x / dimensions.width) * width,
            y: height - (pt.y / dimensions.height) * height,
          }));
          const pathD = pointsToSvgPath(svgPoints);

          return (
            <path
              key={s.id}
              d={pathD}
              fill="none"
              stroke={isHovered ? '#ef4444' : s.color}
              strokeWidth={(s.strokeWidth || 2) * (isHovered ? 1.4 : 1)}
              strokeOpacity={isHovered ? 0.95 : (s.opacity ?? 1)}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={isHovered ? '4 3' : undefined}
            />
          );
        })}

        {/* Live Drawing Stroke */}
        {currentTool === 'draw' && isDrawing && freehandPoints.length > 1 && (
          <path
            d={pointsToSvgPath(
              freehandPoints.map((pt) => ({
                x: (pt.x / dimensions.width) * width,
                y: height - (pt.y / dimensions.height) * height,
              }))
            )}
            fill="none"
            stroke={color}
            strokeWidth={currentPressureWidth || strokeWidth || 2}
            strokeOpacity={opacity || 1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Vector and Shape Annotations from pageAnnotations */}
        {pageAnnotations.map((a) => {
          if (a.type === 'draw') return null; // Already rendered with smooth splines above
          const isHovered = currentTool === 'eraser' && hoveredAnnotId === a.id;
          const [pdfX, pdfY, pdfW, pdfH] = a.rect;
          const sx = (pdfX / dimensions.width) * width;
          const sy = height - ((pdfY + pdfH) / dimensions.height) * height;
          const sw = (pdfW / dimensions.width) * width;
          const sh = (pdfH / dimensions.height) * height;

          if (a.type === 'rectangle') {
            return (
              <rect
                key={a.id}
                x={sx}
                y={sy}
                width={sw}
                height={sh}
                fill="none"
                stroke={isHovered ? '#ef4444' : a.color}
                strokeWidth={(a.strokeWidth || 2) * (isHovered ? 1.3 : 1)}
                strokeOpacity={isHovered ? 0.95 : (a.opacity ?? 1)}
                strokeDasharray={isHovered ? '4 3' : undefined}
                rx="2"
              />
            );
          }

          if (a.type === 'circle') {
            return (
              <ellipse
                key={a.id}
                cx={sx + sw / 2}
                cy={sy + sh / 2}
                rx={Math.max(1, Math.abs(sw / 2))}
                ry={Math.max(1, Math.abs(sh / 2))}
                fill="none"
                stroke={isHovered ? '#ef4444' : a.color}
                strokeWidth={(a.strokeWidth || 2) * (isHovered ? 1.3 : 1)}
                strokeOpacity={isHovered ? 0.95 : (a.opacity ?? 1)}
                strokeDasharray={isHovered ? '4 3' : undefined}
              />
            );
          }

          if (a.type === 'line' || a.type === 'arrow') {
            const p1 = {
              x: (a.rect[0] / dimensions.width) * width,
              y: height - (a.rect[1] / dimensions.height) * height,
            };
            const p2 = a.endPoint
              ? {
                  x: (a.endPoint.x / dimensions.width) * width,
                  y: height - (a.endPoint.y / dimensions.height) * height,
                }
              : {
                  x: ((a.rect[0] + a.rect[2]) / dimensions.width) * width,
                  y: height - ((a.rect[1] + a.rect[3]) / dimensions.height) * height,
                };
            const markerId = a.type === 'arrow' ? `arrow-marker-${a.id}` : undefined;

            return (
              <g key={a.id}>
                {a.type === 'arrow' && (
                  <defs>
                    <marker
                      id={markerId}
                      markerWidth="8"
                      markerHeight="6"
                      refX="7"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 8 3, 0 6" fill={isHovered ? '#ef4444' : a.color} />
                    </marker>
                  </defs>
                )}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={isHovered ? '#ef4444' : a.color}
                  strokeWidth={(a.strokeWidth || 2) * (isHovered ? 1.3 : 1)}
                  strokeOpacity={isHovered ? 0.95 : (a.opacity ?? 1)}
                  strokeDasharray={isHovered ? '4 3' : undefined}
                  strokeLinecap="round"
                  markerEnd={markerId ? `url(#${markerId})` : undefined}
                />
              </g>
            );
          }

          if (a.type === 'measure') {
            const p1 = {
              x: (a.rect[0] / dimensions.width) * width,
              y: height - (a.rect[1] / dimensions.height) * height,
            };
            const p2 = a.endPoint
              ? {
                  x: (a.endPoint.x / dimensions.width) * width,
                  y: height - (a.endPoint.y / dimensions.height) * height,
                }
              : {
                  x: ((a.rect[0] + a.rect[2]) / dimensions.width) * width,
                  y: height - ((a.rect[1] + a.rect[3]) / dimensions.height) * height,
                };
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            const perpX = len > 0 ? (-dy / len) * 7 : 0;
            const perpY = len > 0 ? (dx / len) * 7 : 0;
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const label = a.dimensionText || a.content || '';

            return (
              <g key={a.id}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={isHovered ? '#ef4444' : a.color}
                  strokeWidth={(a.strokeWidth || 2) * (isHovered ? 1.3 : 1)}
                  strokeOpacity={isHovered ? 0.95 : (a.opacity ?? 1)}
                  strokeDasharray={isHovered ? '4 3' : undefined}
                />
                <line
                  x1={p1.x - perpX}
                  y1={p1.y - perpY}
                  x2={p1.x + perpX}
                  y2={p1.y + perpY}
                  stroke={isHovered ? '#ef4444' : a.color}
                  strokeWidth={a.strokeWidth || 2}
                  strokeOpacity={isHovered ? 0.95 : (a.opacity ?? 1)}
                />
                <line
                  x1={p2.x - perpX}
                  y1={p2.y - perpY}
                  x2={p2.x + perpX}
                  y2={p2.y + perpY}
                  stroke={isHovered ? '#ef4444' : a.color}
                  strokeWidth={a.strokeWidth || 2}
                  strokeOpacity={isHovered ? 0.95 : (a.opacity ?? 1)}
                />
                {label && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-34"
                      y="-10"
                      width="68"
                      height="20"
                      rx="5"
                      fill="#0f172a"
                      stroke={isHovered ? '#ef4444' : a.color}
                      strokeWidth="1.5"
                      opacity="0.95"
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {label}
                    </text>
                  </g>
                )}
              </g>
            );
          }

          if (a.type === 'highlight') {
            return (
              <rect
                key={a.id}
                x={sx}
                y={sy}
                width={sw}
                height={sh}
                fill={isHovered ? '#ef4444' : a.color}
                opacity={isHovered ? 0.6 : (a.opacity || 0.35)}
                style={{ mixBlendMode: 'multiply' }}
                stroke={isHovered ? '#ef4444' : undefined}
                strokeWidth={isHovered ? 1.5 : undefined}
                strokeDasharray={isHovered ? '4 3' : undefined}
              />
            );
          }

          if (a.type === 'underline') {
            return (
              <line
                key={a.id}
                x1={sx}
                y1={sy + sh}
                x2={sx + sw}
                y2={sy + sh}
                stroke={isHovered ? '#ef4444' : a.color}
                strokeWidth={(a.strokeWidth || 2) * (isHovered ? 1.4 : 1)}
                strokeOpacity={isHovered ? 0.95 : (a.opacity ?? 1)}
                strokeDasharray={isHovered ? '4 3' : undefined}
              />
            );
          }

          if (a.type === 'strikethrough') {
            return (
              <line
                key={a.id}
                x1={sx}
                y1={sy + sh / 2}
                x2={sx + sw}
                y2={sy + sh / 2}
                stroke={isHovered ? '#ef4444' : a.color}
                strokeWidth={(a.strokeWidth || 2) * (isHovered ? 1.4 : 1)}
                strokeOpacity={isHovered ? 0.95 : (a.opacity ?? 1)}
                strokeDasharray={isHovered ? '4 3' : undefined}
              />
            );
          }

          return null;
        })}
      </svg>

      {/* HTML Overlay for Interactive Badges: Stamps & Sticky Notes */}
      {pageAnnotations.map((a) => {
        if (a.type !== 'stamp' && a.type !== 'note') return null;
        const isHovered = currentTool === 'eraser' && hoveredAnnotId === a.id;
        const [pdfX, pdfY, pdfW, pdfH] = a.rect;
        const sx = (pdfX / dimensions.width) * width;
        const sy = height - ((pdfY + pdfH) / dimensions.height) * height;
        const sw = (pdfW / dimensions.width) * width;
        const sh = (pdfH / dimensions.height) * height;

        if (a.type === 'stamp') {
          const rawText = (a.stampText || a.content || 'APPROVED').trim();
          const lines = rawText.includes('\n')
            ? rawText.split('\n')
            : rawText.split(' | ');

          return (
            <div
              key={a.id}
              className={`absolute pointer-events-none select-none flex flex-col items-center justify-center rounded transition-all ${
                isHovered ? 'ring-2 ring-rose-500 bg-rose-500/20' : ''
              }`}
              style={{
                left: `${sx}px`,
                top: `${sy}px`,
                width: `${Math.max(sw, 100)}px`,
                height: `${Math.max(sh, 32)}px`,
                border: `2px solid ${isHovered ? '#ef4444' : a.color}`,
                backgroundColor: `${a.color}15`,
                color: isHovered ? '#ef4444' : a.color,
                opacity: isHovered ? 1 : (a.opacity ?? 0.9),
              }}
            >
              <span className="font-extrabold text-xs tracking-wider uppercase font-mono leading-none">
                {lines[0] || 'APPROVED'}
              </span>
              {lines[1] && (
                <span className="text-[9px] font-mono tracking-tight opacity-90 mt-0.5">
                  {lines[1]}
                </span>
              )}
              {lines[2] && (
                <span className="text-[8px] font-sans tracking-tight opacity-80">
                  {lines[2]}
                </span>
              )}
            </div>
          );
        }

        if (a.type === 'note') {
          return (
            <div
              key={a.id}
              className={`absolute pointer-events-none select-none p-1.5 rounded-lg shadow-md flex items-start gap-1.5 transition-all text-slate-900 ${
                isHovered ? 'ring-2 ring-rose-500 bg-rose-200' : 'bg-amber-100 border border-amber-300'
              }`}
              style={{
                left: `${sx}px`,
                top: `${sy}px`,
                width: `${Math.max(sw, 110)}px`,
                minHeight: `${Math.max(sh, 34)}px`,
              }}
            >
              <StickyNote className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[10px] leading-tight font-sans line-clamp-2">
                {a.content || 'Note'}
              </div>
            </div>
          );
        }

        return null;
      })}

      {/* Eraser Visual Cursor Ring */}
      {currentTool === 'eraser' && eraserCursorPos && (
        <div
          className="absolute pointer-events-none rounded-full border-2 border-rose-500 bg-rose-500/15 z-30 shadow-md"
          style={{
            width: `${eraserRadius * 2}px`,
            height: `${eraserRadius * 2}px`,
            left: `${eraserCursorPos.x - eraserRadius}px`,
            top: `${eraserCursorPos.y - eraserRadius}px`,
          }}
        />
      )}

      {/* Temporary Drawing Box / Shape Overlay */}
      {currentBox && isDrawing && !['line', 'arrow', 'measure'].includes(currentTool) && (
        <div
          className={`absolute pointer-events-none ${
            currentTool === 'snip_ocr'
              ? 'border-2 border-dashed border-swift-400 bg-swift-500/20 shadow-lg'
              : currentTool === 'circle'
              ? 'rounded-full border-2'
              : currentTool === 'underline'
              ? 'border-b-2'
              : currentTool === 'strikethrough'
              ? 'flex items-center'
              : currentTool === 'redact'
              ? 'bg-rose-500/30 border-2 border-rose-600'
              : currentTool === 'highlight'
              ? ''
              : 'border-2'
          }`}
          style={{
            left: `${currentBox.x}px`,
            top: `${currentBox.y}px`,
            width: `${currentBox.w}px`,
            height: `${currentBox.h}px`,
            borderColor: ['snip_ocr', 'redact', 'strikethrough'].includes(currentTool) ? undefined : color,
            backgroundColor: currentTool === 'snip_ocr' ? undefined : (currentTool === 'highlight' ? color : undefined),
            opacity: currentTool === 'snip_ocr' ? 1 : (currentTool === 'highlight' ? (opacity || 0.35) : (currentTool === 'redact' ? undefined : opacity)),
          }}
        >
          {currentTool === 'strikethrough' && (
            <div className="w-full border-b-2" style={{ borderColor: color }} />
          )}
        </div>
      )}

      {/* Staged Redaction Rectangles */}
      {pageStagedRedactions.map((r, idx) => {
        const [pdfX, pdfY, pdfW, pdfH] = r.rect;
        const left = (pdfX / dimensions.width) * width;
        const top = height - ((pdfY + pdfH) / dimensions.height) * height;
        const w = (pdfW / dimensions.width) * width;
        const h = (pdfH / dimensions.height) * height;

        return (
          <div
            key={idx}
            className="absolute border-2 border-dashed border-rose-500 bg-black/85 text-white flex items-center justify-center text-[10px] font-bold tracking-wider pointer-events-none"
            style={{ left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` }}
          >
            [STAGED REDACT]
          </div>
        );
      })}

      {/* Inline Text Input Placement Box */}
      {textInputPos && (
        <div
          className="absolute z-30 bg-black/95 border border-swift-500 p-2 rounded-lg shadow-xl flex items-center gap-2"
          style={{
            left: `${Math.max(8, Math.min(width - 270, textInputPos.x))}px`,
            top: `${Math.max(8, Math.min(height - 50, textInputPos.y))}px`,
          }}
        >
          <input
            autoFocus
            type="text"
            value={inlineText}
            onChange={(e) => setInlineText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCommitInlineText();
              if (e.key === 'Escape') setTextInputPos(null);
            }}
            placeholder="Type text to place..."
            className="bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700 outline-none w-48"
          />
          <button
            onClick={handleCommitInlineText}
            className="p-1 bg-swift-600 hover:bg-swift-500 text-white rounded"
            title="Place text"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTextInputPos(null)}
            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Inline Sticky Note Placement Card */}
      {pendingNote && (
        <div
          className="absolute z-40 bg-black/95 border border-amber-400/80 p-3 rounded-xl shadow-2xl flex flex-col gap-2.5 animate-scale-in text-xs w-64 backdrop-blur-md"
          style={{
            left: `${Math.max(8, Math.min(width - 264, pendingNote.clientX - 12))}px`,
            top: `${Math.max(8, Math.min(height - 180, pendingNote.clientY + 14))}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
              <StickyNote className="w-3.5 h-3.5" />
              <span>Add Sticky Note</span>
            </div>
            <button
              onClick={() => setPendingNote(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            autoFocus
            rows={3}
            value={pendingNote.text}
            onChange={(e) => setPendingNote({ ...pendingNote, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleCommitStickyNote();
              } else if (e.key === 'Escape') {
                setPendingNote(null);
              }
            }}
            placeholder="Type comment or note... (Ctrl+Enter to save)"
            className="w-full bg-slate-800/80 text-white text-xs p-2 rounded-lg border border-slate-700 outline-none focus:border-amber-400 resize-none font-sans placeholder:text-slate-500"
          />
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1.5">
              {['#fef08a', '#bbf7d0', '#bae6fd', '#fbcfe8'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPendingNote({ ...pendingNote, noteColor: c })}
                  className={`w-4 h-4 rounded-full border transition-transform ${
                    pendingNote.noteColor === c
                      ? 'scale-125 border-white ring-1 ring-amber-400'
                      : 'border-slate-600 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title="Note color"
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPendingNote(null)}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitStickyNote}
                disabled={!pendingNote.text.trim()}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-[11px] transition-colors shadow-sm"
              >
                Place Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Matches Overlay Marker */}
      {pageMatches.length > 0 && (
        <div className="absolute top-2 right-2 bg-amber-500/90 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
          {pageMatches.length} match{pageMatches.length > 1 ? 'es' : ''}
        </div>
      )}
    </div>
  );
};

/**
 * VirtualPageWrapper uses IntersectionObserver to mount PageCanvas only when within
 * the visible viewport (+ 450px buffer), keeping multi-hundred page documents at solid 60fps.
 */
const VirtualPageWrapper: React.FC<{
  pageIndex: number;
  scale: number;
  dimensions: PageDimensions;
  isActive: boolean;
  onPageClick: () => void;
  pageCount: number;
  isSpacePressed?: boolean;
  onSnipOCR?: (data: {
    text: string;
    confidence?: number;
    wordCount?: number;
    isDigital?: boolean;
    language?: string;
    lastExtraction?: {
      pageIndex: number;
      pdfRect: { x: number; y: number; width: number; height: number };
      dimensions: PageDimensions;
      cropBoxScreen: { x: number; y: number; width: number; height: number };
    };
  }) => void;
  externalRenderVersion?: number;
}> = ({ pageIndex, scale, dimensions, isActive, onPageClick, pageCount, isSpacePressed, onSnipOCR, externalRenderVersion }) => {
  const [isVisible, setIsVisible] = useState(pageIndex === 0 || isActive);
  const containerRef = useRef<HTMLDivElement>(null);

  const width = Math.floor(dimensions.width * scale);
  const height = Math.floor(dimensions.height * scale);

  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
    }
  }, [isActive]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else if (!isActive) {
            setIsVisible(false);
          }
        });
      },
      { rootMargin: '600px 0px 600px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      id={`pdf-page-${pageIndex + 1}`}
      data-page-number={pageIndex + 1}
      className="flex flex-col items-center space-y-1"
      onClick={onPageClick}
      style={{ minHeight: `${height + 24}px`, width: `${width}px` }}
    >
      {isVisible ? (
        <PageCanvas
          pageIndex={pageIndex}
          scale={scale}
          dimensions={dimensions}
          isActive={isActive}
          isSpacePressed={isSpacePressed}
          onSnipOCR={onSnipOCR}
          externalRenderVersion={externalRenderVersion}
        />
      ) : (
        <div
          className="bg-black/40 border border-slate-800/70 rounded-lg shadow-lg flex flex-col items-center justify-center text-slate-500 font-mono text-xs transition-colors"
          style={{ width: `${width}px`, height: `${height}px` }}
        >
          <div className="w-6 h-6 border-2 border-swift-500/40 border-t-swift-400 rounded-full animate-spin mb-2" />
          <span>Page {pageIndex + 1}</span>
        </div>
      )}
      <span className="text-[11px] text-slate-400 font-mono font-medium">
        Page {pageIndex + 1} of {pageCount}
      </span>
    </div>
  );
};

export const PDFViewer: React.FC = () => {
  const {
    documentId,
    pageCount,
    currentPage,
    setCurrentPage,
    zoom,
    setZoom,
    viewMode,
    pageDimensions,
    isLoading,
    errorMessage,
    pushHistory,
    markDirty,
  } = useDocumentStore();
  const { addToast } = useUIStore();
  const { currentTool, setCurrentTool, color, ocrLanguage, setOcrLanguage } = useToolStore();
  const [viewerRenderVersion, setViewerRenderVersion] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Programmatic vs Manual Scroll Synchronization
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgrammaticPageRef = useRef<number>(currentPage);

  // Sync scroll position when currentPage changes (e.g. sidebar thumbnail, bookmarks, TOC, search, shortcuts)
  useEffect(() => {
    if (lastProgrammaticPageRef.current === currentPage) {
      return;
    }
    lastProgrammaticPageRef.current = currentPage;

    if (viewMode === 'single') {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      return;
    }

    const scrollToTargetPage = () => {
      const container = containerRef.current;
      const targetEl = document.getElementById(`pdf-page-${currentPage}`);
      if (targetEl && container) {
        isProgrammaticScrollRef.current = true;
        if (programmaticScrollTimerRef.current) {
          clearTimeout(programmaticScrollTimerRef.current);
        }

        const containerRect = container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const delta = targetRect.top - containerRect.top - 24;

        container.scrollBy({
          top: delta,
          behavior: 'smooth',
        });

        programmaticScrollTimerRef.current = setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 550);
      } else {
        // Fallback retry if target element is mounting in DOM
        setTimeout(() => {
          const retryContainer = containerRef.current;
          const retryEl = document.getElementById(`pdf-page-${currentPage}`);
          if (retryEl && retryContainer) {
            isProgrammaticScrollRef.current = true;
            const cRect = retryContainer.getBoundingClientRect();
            const tRect = retryEl.getBoundingClientRect();
            retryContainer.scrollBy({
              top: tRect.top - cRect.top - 24,
              behavior: 'smooth',
            });
            setTimeout(() => {
              isProgrammaticScrollRef.current = false;
            }, 550);
          }
        }, 40);
      }
    };

    const rafId = requestAnimationFrame(scrollToTargetPage);
    return () => cancelAnimationFrame(rafId);
  }, [currentPage, viewMode]);

  // Handle scroll position on document or tab switch
  useEffect(() => {
    if (currentPage > 1) {
      // Invalidate lastProgrammaticPageRef to trigger smooth scroll to the tab's active page
      lastProgrammaticPageRef.current = -1;
    } else {
      lastProgrammaticPageRef.current = 1;
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }
  }, [documentId]);

  // Manual scroll detection: updates currentPage as the user scrolls through the document
  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const readingLineY = containerRect.top + Math.min(220, containerRect.height / 3);

    const pageElements = container.querySelectorAll<HTMLElement>('[data-page-number]');
    let detectedPage: number | null = null;

    for (let i = 0; i < pageElements.length; i++) {
      const el = pageElements[i];
      const rect = el.getBoundingClientRect();
      if (rect.top <= readingLineY && rect.bottom >= readingLineY) {
        const p = parseInt(el.dataset.pageNumber || '', 10);
        if (!isNaN(p)) {
          detectedPage = p;
          break;
        }
      }
    }

    if (detectedPage === null && pageElements.length > 0) {
      let maxOverlap = -1;
      for (let i = 0; i < pageElements.length; i++) {
        const el = pageElements[i];
        const rect = el.getBoundingClientRect();
        const overlapTop = Math.max(containerRect.top, rect.top);
        const overlapBottom = Math.min(containerRect.bottom, rect.bottom);
        const overlap = overlapBottom - overlapTop;
        if (overlap > maxOverlap) {
          maxOverlap = overlap;
          const p = parseInt(el.dataset.pageNumber || '', 10);
          if (!isNaN(p)) {
            detectedPage = p;
          }
        }
      }
    }

    if (detectedPage !== null && detectedPage !== currentPage) {
      lastProgrammaticPageRef.current = detectedPage;
      setCurrentPage(detectedPage);
    }
  }, [currentPage, setCurrentPage]);

  // Kinetic Zoom State
  const [kineticScale, setKineticScale] = useState(1.0);
  const zoomDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Area Snip OCR Modal State
  const [areaOCRModal, setAreaOCRModal] = useState<{
    isOpen: boolean;
    text: string;
    confidence?: number;
    wordCount?: number;
    isDigital?: boolean;
    language?: string;
    lastExtraction?: {
      pageIndex: number;
      pdfRect: { x: number; y: number; width: number; height: number };
      dimensions: PageDimensions;
      cropBoxScreen: { x: number; y: number; width: number; height: number };
    };
  }>({
    isOpen: false,
    text: '',
  });
  const [isReExtracting, setIsReExtracting] = useState(false);

  const handleReExtractLanguage = async (newLanguage: string) => {
    setOcrLanguage(newLanguage);
    if (!areaOCRModal.lastExtraction || !documentId) return;
    const { pageIndex, pdfRect, dimensions, cropBoxScreen } = areaOCRModal.lastExtraction;
    try {
      setIsReExtracting(true);
      const engine = getPDFEngine();
      addToast({
        type: 'info',
        title: 'Re-running OCR...',
        message: `Recognizing text with ${newLanguage === 'eng+hin' ? 'Hindi + English' : newLanguage}...`,
      });
      const result = await extractTextFromArea({
        engine,
        documentId,
        pageIndex,
        pdfRect,
        dimensions,
        cropBoxScreen,
        language: newLanguage,
      });
      if (result.text.trim()) {
        setAreaOCRModal((prev) => ({
          ...prev,
          text: result.text.trim(),
          confidence: result.confidence,
          wordCount: result.wordCount,
          isDigital: result.isDigital,
          language: newLanguage,
        }));
        addToast({
          type: 'success',
          title: 'Language OCR Complete',
          message: `${result.wordCount} words recognized!`,
        });
      } else {
        addToast({
          type: 'warning',
          title: 'No Text Detected',
          message: `No words found using ${newLanguage}.`,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Re-scan Failed',
        message: err?.message || 'Could not re-scan in selected language.',
      });
    } finally {
      setIsReExtracting(false);
    }
  };

  // Universal Spacebar / Middle-Click Pan State
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; scrollLeft: number; scrollTop: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
        panStartRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Middle click (e.button === 1) or Left click while Space is held or Hand tool is active
    if (e.button === 1 || (e.button === 0 && (isSpacePressed || currentTool === 'hand'))) {
      e.preventDefault();
      setIsPanning(true);
      if (containerRef.current) {
        panStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          scrollLeft: containerRef.current.scrollLeft,
          scrollTop: containerRef.current.scrollTop,
        };
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
      }
    }
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning && panStartRef.current && containerRef.current) {
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;
      containerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
      containerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
    }
  };

  const handleContainerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Selection HUD State
  const [selectionData, setSelectionData] = useState<{
    position: { x: number; y: number } | null;
    selectedText: string;
  }>({ position: null, selectedText: '' });

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelectionData({ position: null, selectedText: '' });
        return;
      }
      const text = sel.toString().trim();
      if (!text) {
        setSelectionData({ position: null, selectedText: '' });
        return;
      }
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSelectionData({
            position: { x: rect.left + rect.width / 2, y: rect.top },
            selectedText: text,
          });
        }
      } catch {}
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleApplyMarkupFromHUD = async (
    type: 'highlight' | 'underline' | 'strikethrough',
    markupColor: string
  ) => {
    if (!documentId) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    let pageEl: HTMLElement | null = null;
    while (node && !pageEl) {
      if (node instanceof HTMLElement && node.dataset?.pageNumber) {
        pageEl = node;
      } else {
        node = node.parentNode;
      }
    }

    const clientRects = Array.from(range.getClientRects()).filter(
      (r) => r.width > 2 && r.height > 2
    );
    if (clientRects.length === 0) return;

    let targetPageIndex = currentPage - 1;
    if (pageEl && pageEl.dataset.pageNumber) {
      targetPageIndex = parseInt(pageEl.dataset.pageNumber, 10) - 1;
    } else {
      const firstRect = clientRects[0];
      const allPageEls = document.querySelectorAll<HTMLElement>('[data-page-number]');
      for (let i = 0; i < allPageEls.length; i++) {
        const el = allPageEls[i];
        const b = el.getBoundingClientRect();
        if (firstRect.top >= b.top && firstRect.bottom <= b.bottom && firstRect.left >= b.left && firstRect.right <= b.right) {
          pageEl = el;
          targetPageIndex = parseInt(el.dataset.pageNumber || '1', 10) - 1;
          break;
        }
      }
    }

    if (!pageEl) {
      pageEl = document.getElementById(`pdf-page-${targetPageIndex + 1}`);
    }
    if (!pageEl) return;

    const pageBounding = pageEl.getBoundingClientRect();
    const dims = pageDimensions[targetPageIndex] || {
      width: 595.28,
      height: 841.89,
      pageNumber: targetPageIndex + 1,
      rotation: 0,
    };

    try {
      const engine = getPDFEngine();
      await pushHistory(`Markup ${type}`);

      for (let i = 0; i < clientRects.length; i++) {
        const r = clientRects[i];
        const relX = r.left - pageBounding.left;
        const relY = r.top - pageBounding.top;
        const relW = r.width;
        const relH = r.height;

        const pdfX = (relX / pageBounding.width) * dims.width;
        const pdfY = ((pageBounding.height - (relY + relH)) / pageBounding.height) * dims.height;
        const pdfW = (relW / pageBounding.width) * dims.width;
        const pdfH = (relH / pageBounding.height) * dims.height;

        await engine.addAnnotation(documentId, {
          id: `annot_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          pageIndex: targetPageIndex,
          type,
          rect: [pdfX, pdfY, pdfW, pdfH],
          color: markupColor,
          opacity: type === 'highlight' ? 0.35 : 1.0,
          strokeWidth: 2,
          createdAt: new Date().toISOString(),
        });
      }

      markDirty();
      setViewerRenderVersion((v) => v + 1);
      window.getSelection()?.removeAllRanges();
      setSelectionData({ position: null, selectedText: '' });
      addToast({
        type: 'success',
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Applied`,
        message: `Applied ${type} to selection on page ${targetPageIndex + 1}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Markup Failed',
        message: err?.message || `Failed to apply ${type}.`,
      });
    }
  };

  const handleEditInPlaceFromHUD = () => {
    setCurrentTool('edit_text');
    window.getSelection()?.removeAllRanges();
    setSelectionData({ position: null, selectedText: '' });
    addToast({
      type: 'info',
      title: 'Direct Text Edit Mode',
      message: 'Click on any highlighted text block to modify its content.',
    });
  };

  // Automatically apply markup on mouseup when highlight, underline, or strikethrough tool is active
  useEffect(() => {
    const handleMouseUp = () => {
      if (['highlight', 'underline', 'strikethrough'].includes(currentTool)) {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
          handleApplyMarkupFromHUD(
            currentTool as 'highlight' | 'underline' | 'strikethrough',
            color
          );
        }
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [currentTool, color, handleApplyMarkupFromHUD]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      // GPU accelerated CSS scaling during wheel ticks
      const delta = -e.deltaY * 0.004;
      const nextScale = Math.max(0.4, Math.min(3.0, kineticScale + delta));
      setKineticScale(nextScale);

      if (zoomDebounceRef.current) clearTimeout(zoomDebounceRef.current);
      zoomDebounceRef.current = setTimeout(() => {
        const newZoom = Number((zoom * nextScale).toFixed(2));
        setZoom(Math.max(0.2, Math.min(4.0, newZoom)));
        setKineticScale(1.0);
      }, 130);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black text-slate-400 gap-3">
        <div className="w-8 h-8 border-2 border-swift-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium">Rendering PDF pages...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black text-rose-400 p-6 text-center">
        <AlertCircle className="w-10 h-10 mb-2" />
        <h3 className="font-bold text-base">Error Loading PDF</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md">{errorMessage}</p>
      </div>
    );
  }

  if (!documentId || pageCount === 0) {
    return null;
  }

  // Dual-Page Spread Groupings
  const spreadGroups: number[][] = [];
  if (viewMode === 'spread') {
    spreadGroups.push([0]); // Cover page
    for (let i = 1; i < pageCount; i += 2) {
      if (i + 1 < pageCount) {
        spreadGroups.push([i, i + 1]);
      } else {
        spreadGroups.push([i]);
      }
    }
  }

  // Single page mode vs. Continuous mode
  const visibleIndices =
    viewMode === 'single'
      ? [currentPage - 1]
      : Array.from({ length: pageCount }, (_, i) => i);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* 1-Click Searchable Document Auto-OCR Banner */}
      <ScannedDocBanner />

      <div
        ref={containerRef}
        id="pdf-viewer-viewport"
        onScroll={handleScroll}
        onWheel={handleWheel}
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handleContainerPointerMove}
        onPointerUp={handleContainerPointerUp}
        className={`flex-1 overflow-auto bg-black flex flex-col items-center p-2.5 sm:p-6 pb-24 md:pb-6 select-none relative pdf-desk-bg ${
          isPanning ? 'cursor-grabbing' : (isSpacePressed || currentTool === 'hand') ? 'cursor-grab' : ''
        }`}
      >
        <div
          className="flex flex-col items-center space-y-6"
          style={{
            transform: kineticScale !== 1.0 ? `scale(${kineticScale})` : undefined,
            transformOrigin: '50% 20%',
            transition: kineticScale === 1.0 ? 'transform 0.12s ease-out' : 'none',
          }}
        >
          {viewMode === 'spread' ? (
            spreadGroups.map((group, gIdx) => (
              <div key={gIdx} className="flex flex-row items-center justify-center gap-6">
                {group.map((idx) => {
                  const dims = pageDimensions[idx] || {
                    pageNumber: idx + 1,
                    width: 595.28,
                    height: 841.89,
                    rotation: 0,
                  };

                  return (
                    <VirtualPageWrapper
                      key={idx}
                      pageIndex={idx}
                      scale={zoom}
                      dimensions={dims}
                      isActive={currentPage === idx + 1}
                      onPageClick={() => setCurrentPage(idx + 1)}
                      pageCount={pageCount}
                      isSpacePressed={isSpacePressed}
                      onSnipOCR={(data) => setAreaOCRModal({ isOpen: true, ...data })}
                      externalRenderVersion={viewerRenderVersion}
                    />
                  );
                })}
              </div>
            ))
          ) : (
            visibleIndices.map((idx) => {
              const dims = pageDimensions[idx] || {
                pageNumber: idx + 1,
                width: 595.28,
                height: 841.89,
                rotation: 0,
              };

              return (
                <VirtualPageWrapper
                  key={idx}
                  pageIndex={idx}
                  scale={zoom}
                  dimensions={dims}
                  isActive={currentPage === idx + 1}
                  onPageClick={() => setCurrentPage(idx + 1)}
                  pageCount={pageCount}
                  isSpacePressed={isSpacePressed}
                  onSnipOCR={(data) => setAreaOCRModal({ isOpen: true, ...data })}
                  externalRenderVersion={viewerRenderVersion}
                />
              );
            })
          )}
        </div>

        {/* Floating Quick-Action Selection HUD */}
        <SelectionHUD
          position={selectionData.position}
          selectedText={selectionData.selectedText}
          onClearSelection={() => {
            window.getSelection()?.removeAllRanges();
            setSelectionData({ position: null, selectedText: '' });
          }}
          onApplyMarkup={handleApplyMarkupFromHUD}
          onEditInPlace={handleEditInPlaceFromHUD}
        />

        {/* Presentation Tools: Glowing Laser Pointer & Spotlight Reading Focus */}
        <PresentationOverlays containerRef={containerRef} />
      </div>

      {/* Area Snip OCR Extraction Dialog */}
      <AreaOCRDialog
        isOpen={areaOCRModal.isOpen}
        onClose={() => setAreaOCRModal((prev) => ({ ...prev, isOpen: false }))}
        extractedText={areaOCRModal.text}
        confidence={areaOCRModal.confidence}
        wordCount={areaOCRModal.wordCount}
        isDigital={areaOCRModal.isDigital}
        language={areaOCRModal.language || ocrLanguage}
        onReExtract={handleReExtractLanguage}
        isReExtracting={isReExtracting}
      />
    </div>
  );
};
