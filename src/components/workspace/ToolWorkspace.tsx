import React, { useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { 
  ToolDefinition, 
  UploadedFile, 
  WorkspaceStage, 
  ProcessingProgress, 
  ProcessResult, 
  SplitOptions, 
  CompressOptions, 
  WatermarkOptions, 
  PageNumberOptions, 
  ProtectOptions, 
  UnlockOptions, 
  JpgToPdfOptions, 
  PdfToJpgOptions,
  SignPdfOptions,
  EditPdfOptions,
  HtmlToPdfOptions,
  RedactOptions,
  ToolId 
} from '../../types/pdf';
import { FileDropzone } from './FileDropzone';
import { FileCanvas } from './FileCanvas';
import { OptionsSidebar } from './OptionsSidebar';
import { ProcessingOverlay } from './ProcessingOverlay';
import { ResultScreen } from './ResultScreen';
import { HandwritingStudio } from './HandwritingStudio';

// Core Engines
import { mergePdfs } from '../../engines/merge';
import { splitPdf } from '../../engines/split';
import { compressPdf } from '../../engines/compress';
import { rotatePdf } from '../../engines/rotate';
import { organizePdf } from '../../engines/organize';
import { addWatermark } from '../../engines/watermark';
import { addPageNumbers } from '../../engines/pageNumbers';
import { protectPdf } from '../../engines/protect';
import { unlockPdf } from '../../engines/unlock';
import { convertJpgToPdf } from '../../engines/jpgToPdf';
import { convertPdfToJpg } from '../../engines/pdfToJpg';

// Office & Advanced Engines
import { 
  convertPdfToWord, 
  convertWordToPdf, 
  convertPdfToExcel, 
  convertExcelToPdf, 
  convertPdfToPowerPoint 
} from '../../engines/office';
import { 
  signPdf, 
  editPdf, 
  repairPdf, 
  convertPdfToPdfA, 
  convertHtmlToPdf, 
  ocrPdf, 
  comparePdf, 
  redactPdf 
} from '../../engines/advanced';

// Utils
import { renderPdfThumbnail, getPdfPageCount, renderAllPagesThumbnails } from '../../utils/pdfRenderer';

interface ToolWorkspaceProps {
  tool: ToolDefinition;
  onBack: () => void;
  onSelectTool: (id: ToolId) => void;
}

export const ToolWorkspace: React.FC<ToolWorkspaceProps> = ({ tool, onBack, onSelectTool }) => {
  const [stage, setStage] = useState<WorkspaceStage>('select');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [pages, setPages] = useState<{
    pageNumber: number;
    rotation: number;
    thumbnail?: string;
    originalIndex: number;
  }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Scroll to top and reset state whenever tool mounts or changes
  React.useEffect(() => {
    setFiles([]);
    setPages([]);
    setResult(null);
    setStage('select');
    setError(null);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [tool.id]);

  // Scroll to top when stage changes (e.g. from upload to configure or complete)
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [stage]);

  // Progress & Result
  const [progress, setProgress] = useState<ProcessingProgress>({ message: '', percent: 0 });
  const [result, setResult] = useState<ProcessResult | null>(null);

  // Tool Specific Options States
  const [splitOptions, setSplitOptions] = useState<SplitOptions>({ mode: 'range', ranges: '1' });
  const [compressOptions, setCompressOptions] = useState<CompressOptions>({ level: 'recommended' });
  const [globalRotation, setGlobalRotation] = useState<number>(0);
  const [watermarkOptions, setWatermarkOptions] = useState<WatermarkOptions>({
    text: 'CONFIDENTIAL',
    fontSize: 32,
    opacity: 0.5,
    color: '#e5322d',
    position: 'center',
    rotation: 45,
  });
  const [pageNumberOptions, setPageNumberOptions] = useState<PageNumberOptions>({
    position: 'bottom-right',
    format: 'page_n_of_p',
    startFrom: 1,
    fontSize: 10,
    margin: 25,
  });
  const [protectOptions, setProtectOptions] = useState<ProtectOptions>({ password: '', confirmPassword: '' });
  const [unlockOptions, setUnlockOptions] = useState<UnlockOptions>({ password: '' });
  const [jpgToPdfOptions, setJpgToPdfOptions] = useState<JpgToPdfOptions>({
    orientation: 'portrait',
    pageSize: 'fit',
    margin: 'none',
  });
  const [pdfToJpgOptions, setPdfToJpgOptions] = useState<PdfToJpgOptions>({
    quality: 1.5,
    format: 'jpg',
  });
  const [signOptions, setSignOptions] = useState<SignPdfOptions>({
    signatureDataUrl: '',
    signerName: '',
    position: 'bottom-right',
  });
  const [editOptions, setEditOptions] = useState<EditPdfOptions>({
    addedText: 'Crafted with JustPDFCraft',
    textColor: '#333333',
    textSize: 14,
    highlightText: true,
  });
  const [htmlOptions, setHtmlOptions] = useState<HtmlToPdfOptions>({
    htmlInput: '<h1>Sample Document</h1><p>This PDF was generated from HTML code.</p>',
    pageTitle: 'HTML Document',
  });
  const [redactOptions, setRedactOptions] = useState<RedactOptions>({
    redactNotes: 'Confidential Information Redacted',
  });

  // Handle file addition
  const handleFilesSelected = async (newRawFiles: File[]) => {
    setError(null);
    try {
      const processedItems: UploadedFile[] = [];

      for (const file of newRawFiles) {
        const id = Math.random().toString(36).substring(2, 9);
        const item: UploadedFile = {
          id,
          file,
          name: file.name,
          size: file.size,
          rotation: 0,
        };

        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          const buffer = await file.arrayBuffer();
          try {
            item.pageCount = await getPdfPageCount(buffer);
            const thumb = await renderPdfThumbnail(buffer, 1, 220);
            item.thumbnails = [thumb];
          } catch (e) {
            console.warn('Could not render thumbnail', e);
          }
        } else if (file.type.startsWith('image/')) {
          item.thumbnails = [URL.createObjectURL(file)];
        }

        processedItems.push(item);
      }

      const updatedFiles = tool.multiple ? [...files, ...processedItems] : processedItems;
      setFiles(updatedFiles);

      // If page-level tool (organize), unpack pages
      if (tool.id === 'organize-pdf' && updatedFiles.length > 0) {
        const firstFile = updatedFiles[0];
        const buffer = await firstFile.file.arrayBuffer();
        const thumbnails = await renderAllPagesThumbnails(buffer, 180);
        const initialPages = thumbnails.map((thumb, idx) => ({
          pageNumber: idx + 1,
          rotation: 0,
          thumbnail: thumb,
          originalIndex: idx,
        }));
        setPages(initialPages);
      }

      setStage('configure');
    } catch (err: any) {
      setError(err?.message || 'Failed to read selected files.');
    }
  };

  const handleMoveFile = (index: number, direction: 'left' | 'right') => {
    const newFiles = [...files];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newFiles.length) {
      const temp = newFiles[index];
      newFiles[index] = newFiles[targetIndex];
      newFiles[targetIndex] = temp;
      setFiles(newFiles);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    const updated = files.filter(f => f.id !== fileId);
    setFiles(updated);
    if (updated.length === 0) setStage('select');
  };

  const handleRotateFile = (fileId: string) => {
    setFiles(prev =>
      prev.map(f => (f.id === fileId ? { ...f, rotation: ((f.rotation || 0) + 90) % 360 } : f))
    );
  };

  const handleSortFiles = (order: 'asc' | 'desc') => {
    const sorted = [...files].sort((a, b) =>
      order === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
    setFiles(sorted);
  };

  const handleRotateAll = (direction: 'left' | 'right') => {
    const angleDelta = direction === 'left' ? 270 : 90;
    setGlobalRotation(prev => (prev + angleDelta) % 360);
    setFiles(prev =>
      prev.map(f => ({ ...f, rotation: ((f.rotation || 0) + angleDelta) % 360 }))
    );
  };

  const handleRotatePage = (index: number) => {
    setPages(prev =>
      prev.map((p, idx) => (idx === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) {
      setError('You must keep at least one page.');
      return;
    }
    setPages(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleMovePage = (index: number, direction: 'left' | 'right') => {
    const newPages = [...pages];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newPages.length) {
      const temp = newPages[index];
      newPages[index] = newPages[targetIndex];
      newPages[targetIndex] = temp;
      setPages(newPages);
    }
  };

  // Validation check
  const isValid = (() => {
    if (files.length === 0) return false;
    if (tool.id === 'merge-pdf' && files.length < 2) return false;
    if (tool.id === 'compare-pdf' && files.length < 2) return false;
    if (tool.id === 'split-pdf' && splitOptions.mode === 'range' && !splitOptions.ranges.trim()) return false;
    if (tool.id === 'protect-pdf' && !protectOptions.password) return false;
    if (tool.id === 'organize-pdf' && pages.length === 0) return false;
    return true;
  })();

  // Execute Tool Processing
  const handleExecute = async () => {
    if (!isValid || files.length === 0) return;
    setError(null);
    setStage('processing');
    setProgress({ message: 'Starting process...', percent: 5 });

    const updateProgress = (message: string, percent: number) => {
      setProgress({ message, percent });
    };

    try {
      let res: ProcessResult;

      switch (tool.id) {
        // Core
        case 'merge-pdf':
          res = await mergePdfs(files, updateProgress);
          break;
        case 'split-pdf':
          res = await splitPdf(files[0], splitOptions, updateProgress);
          break;
        case 'compress-pdf':
          res = await compressPdf(files[0], compressOptions, updateProgress);
          break;
        case 'rotate-pdf':
          res = await rotatePdf(files, { globalRotation }, updateProgress);
          break;
        case 'organize-pdf':
          res = await organizePdf(
            files[0],
            pages.map(p => ({ pageIndex: p.originalIndex, rotation: p.rotation })),
            updateProgress
          );
          break;
        case 'watermark-pdf':
          res = await addWatermark(files[0], watermarkOptions, updateProgress);
          break;
        case 'page-numbers':
          res = await addPageNumbers(files[0], pageNumberOptions, updateProgress);
          break;
        case 'protect-pdf':
          res = await protectPdf(files[0], protectOptions, updateProgress);
          break;
        case 'unlock-pdf':
          res = await unlockPdf(files[0], unlockOptions, updateProgress);
          break;
        case 'jpg-to-pdf':
        case 'scan-to-pdf':
          res = await convertJpgToPdf(files, jpgToPdfOptions, updateProgress);
          break;
        case 'pdf-to-jpg':
          res = await convertPdfToJpg(files[0], pdfToJpgOptions, updateProgress);
          break;

        // Office
        case 'pdf-to-word':
          res = await convertPdfToWord(files[0], updateProgress);
          break;
        case 'word-to-pdf':
        case 'powerpoint-to-pdf':
          res = await convertWordToPdf(files[0], updateProgress);
          break;
        case 'pdf-to-excel':
          res = await convertPdfToExcel(files[0], updateProgress);
          break;
        case 'excel-to-pdf':
          res = await convertExcelToPdf(files[0], updateProgress);
          break;
        case 'pdf-to-powerpoint':
          res = await convertPdfToPowerPoint(files[0], updateProgress);
          break;

        // Advanced
        case 'sign-pdf':
          res = await signPdf(files[0], signOptions, updateProgress);
          break;
        case 'edit-pdf':
          res = await editPdf(files[0], editOptions, updateProgress);
          break;
        case 'html-to-pdf':
          res = await convertHtmlToPdf(files[0], htmlOptions, updateProgress);
          break;
        case 'repair-pdf':
          res = await repairPdf(files[0], updateProgress);
          break;
        case 'pdf-to-pdfa':
          res = await convertPdfToPdfA(files[0], updateProgress);
          break;
        case 'ocr-pdf':
          res = await ocrPdf(files[0], updateProgress);
          break;
        case 'compare-pdf':
          res = await comparePdf(files, updateProgress);
          break;
        case 'redact-pdf':
          res = await redactPdf(files[0], redactOptions, updateProgress);
          break;

        default:
          throw new Error('Unsupported tool.');
      }

      setResult(res);
      setStage('complete');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'An unexpected error occurred during processing.');
      setStage('configure');
    }
  };

  const handleReset = () => {
    setFiles([]);
    setPages([]);
    setResult(null);
    setStage('select');
    setError(null);
  };

  if (tool.id === 'handwriting') {
    return <HandwritingStudio onBack={onBack} />;
  }

  return (
    <div className="min-h-screen py-8">
      {stage === 'select' && (
        <FileDropzone
          tool={tool}
          onFilesSelected={handleFilesSelected}
          onBack={onBack}
        />
      )}

      {stage === 'configure' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setStage('select')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back / Choose different files</span>
            </button>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {files.length} {files.length === 1 ? 'file' : 'files'} selected
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-sm font-medium">
              <AlertCircle size={20} className="text-[#e5322d] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            <FileCanvas
              toolId={tool.id}
              files={files}
              pages={pages}
              onAddMoreFiles={handleFilesSelected}
              onRemoveFile={handleRemoveFile}
              onRotateFile={handleRotateFile}
              onMoveFile={handleMoveFile}
              onRotatePage={handleRotatePage}
              onDeletePage={handleDeletePage}
              onMovePage={handleMovePage}
              allowMultiple={tool.multiple}
              accept={tool.accept}
            />

            <OptionsSidebar
              tool={tool}
              filesCount={files.length}
              totalPageCount={files[0]?.pageCount}
              splitOptions={splitOptions}
              setSplitOptions={setSplitOptions}
              compressOptions={compressOptions}
              setCompressOptions={setCompressOptions}
              watermarkOptions={watermarkOptions}
              setWatermarkOptions={setWatermarkOptions}
              pageNumberOptions={pageNumberOptions}
              setPageNumberOptions={setPageNumberOptions}
              protectOptions={protectOptions}
              setProtectOptions={setProtectOptions}
              unlockOptions={unlockOptions}
              setUnlockOptions={setUnlockOptions}
              jpgToPdfOptions={jpgToPdfOptions}
              setJpgToPdfOptions={setJpgToPdfOptions}
              pdfToJpgOptions={pdfToJpgOptions}
              setPdfToJpgOptions={setPdfToJpgOptions}
              signOptions={signOptions}
              setSignOptions={setSignOptions}
              editOptions={editOptions}
              setEditOptions={setEditOptions}
              htmlOptions={htmlOptions}
              setHtmlOptions={setHtmlOptions}
              redactOptions={redactOptions}
              setRedactOptions={setRedactOptions}
              onSortFiles={handleSortFiles}
              onRotateAll={handleRotateAll}
              onExecute={handleExecute}
              isProcessing={false}
              isValid={isValid}
            />
          </div>
        </div>
      )}

      {stage === 'processing' && <ProcessingOverlay progress={progress} />}

      {stage === 'complete' && result && (
        <ResultScreen
          tool={tool}
          result={result}
          onReset={handleReset}
          onBackToHome={onBack}
          onSelectTool={onSelectTool}
        />
      )}
    </div>
  );
};
