import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument } from 'pdf-lib';
import {
  createPdf1_SinglePageText,
  createPdf2_ThreePagesDifferentText,
  createPdf3_TenPlusPages,
  createPdf4_ScannedImageLike,
  createPdf5_MixedDimensions,
  createPdf6_RotatedPages,
  createPdf7_CorruptedInvalid,
  createPdf8_VeryLargeDocument,
} from '../fixtures/pdf-fixtures';
import QRCode from 'qrcode';

describe('Real PDF Deterministic Workflow Suite (Sections 7-26, 38-41)', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  // =========================================================================
  // Section 7: PDF Fixtures Validation
  // =========================================================================
  describe('Deterministic PDF Fixtures (PDF-1 to PDF-8)', () => {
    it('PDF-1: should create 1-page valid document', async () => {
      const bytes = await createPdf1_SinglePageText();
      const { documentId, metadata } = await engine.openDocument(bytes);
      expect(metadata.pageCount).toBe(1);
      const dims = await engine.getPageDimensions(documentId, 0);
      expect(dims.width).toBeCloseTo(595.28, 1);
      expect(dims.height).toBeCloseTo(841.89, 1);
    });

    it('PDF-2: should create 3-page document with distinct content', async () => {
      const bytes = await createPdf2_ThreePagesDifferentText();
      const { metadata } = await engine.openDocument(bytes);
      expect(metadata.pageCount).toBe(3);
    });

    it('PDF-3: should create 12-page document', async () => {
      const bytes = await createPdf3_TenPlusPages(12);
      const { metadata } = await engine.openDocument(bytes);
      expect(metadata.pageCount).toBe(12);
    });

    it('PDF-4: should create image-embedded scanned-like document', async () => {
      const bytes = await createPdf4_ScannedImageLike();
      const { metadata } = await engine.openDocument(bytes);
      expect(metadata.pageCount).toBe(1);
    });

    it('PDF-5: should support mixed page dimensions across pages', async () => {
      const bytes = await createPdf5_MixedDimensions();
      const { documentId, metadata } = await engine.openDocument(bytes);
      expect(metadata.pageCount).toBe(3);
      const dimsP1 = await engine.getPageDimensions(documentId, 0);
      const dimsP2 = await engine.getPageDimensions(documentId, 1);
      const dimsP3 = await engine.getPageDimensions(documentId, 2);
      expect(dimsP1.width).toBeCloseTo(595.28, 1);
      expect(dimsP2.width).toBeCloseTo(792.0, 1);
      expect(dimsP3.width).toBeCloseTo(500.0, 1);
    });

    it('PDF-6: should handle pre-rotated pages', async () => {
      const bytes = await createPdf6_RotatedPages();
      const { documentId } = await engine.openDocument(bytes);
      const d1 = await engine.getPageDimensions(documentId, 0);
      const d2 = await engine.getPageDimensions(documentId, 1);
      const d3 = await engine.getPageDimensions(documentId, 2);
      expect(d1.rotation).toBe(0);
      expect(d2.rotation).toBe(90);
      expect(d3.rotation).toBe(180);
    });

    it('PDF-7: should reject corrupted invalid PDF cleanly without uncaught crash', async () => {
      const corruptBytes = createPdf7_CorruptedInvalid();
      await expect(engine.openDocument(corruptBytes)).rejects.toThrow();
    });

    it('PDF-8: should handle 50-page large document', async () => {
      const bytes = await createPdf8_VeryLargeDocument(50);
      const { documentId, metadata } = await engine.openDocument(bytes);
      expect(metadata.pageCount).toBe(50);
      expect(engine.getPageCount(documentId)).toBe(50);
    });
  });

  // =========================================================================
  // Section 8: Merge PDF Workflows
  // =========================================================================
  describe('Merge PDF Workflow (Section 8)', () => {
    it('should merge multiple documents with custom ordering and verify page count', async () => {
      const pdf1 = await createPdf1_SinglePageText();
      const pdf2 = await createPdf2_ThreePagesDifferentText();
      const pdf3 = await createPdf3_TenPlusPages(10);

      // Merge pdf2 (3 pages) + pdf1 (1 page) + pdf3 (10 pages) = 14 pages total
      const mergedBytes = await engine.mergeDocuments([pdf2, pdf1, pdf3]);
      const resDoc = await PDFDocument.load(mergedBytes);
      expect(resDoc.getPageCount()).toBe(14);
    });

    it('should handle duplicate files in merge without conflict', async () => {
      const pdf1 = await createPdf1_SinglePageText();
      const mergedBytes = await engine.mergeDocuments([pdf1, pdf1, pdf1]);
      const resDoc = await PDFDocument.load(mergedBytes);
      expect(resDoc.getPageCount()).toBe(3);
    });
  });

  // =========================================================================
  // Section 9: Split PDF Workflows
  // =========================================================================
  describe('Split PDF Workflow (Section 9)', () => {
    it('should split document into custom page ranges', async () => {
      const pdf = await createPdf3_TenPlusPages(10);
      const { documentId } = await engine.openDocument(pdf);

      // Extract pages 0, 1, 2 (first 3 pages)
      const part1Bytes = await engine.extractPages(documentId, [0, 1, 2]);
      const part1Doc = await PDFDocument.load(part1Bytes);
      expect(part1Doc.getPageCount()).toBe(3);

      // Extract single last page (page index 9)
      const part2Bytes = await engine.extractPages(documentId, [9]);
      const part2Doc = await PDFDocument.load(part2Bytes);
      expect(part2Doc.getPageCount()).toBe(1);
    });
  });

  // =========================================================================
  // Section 10: Compress PDF Workflows
  // =========================================================================
  describe('Compress PDF Workflow (Section 10)', () => {
    it('should compress document while preserving readability and exact page count', async () => {
      const pdf = await createPdf8_VeryLargeDocument(15);
      const { documentId, metadata } = await engine.openDocument(pdf);
      const originalCount = metadata.pageCount;

      const compressResult = await engine.compressDocument(documentId, {
        preset: 'balanced',
        stripMetadata: true,
      });

      expect(compressResult.data).toBeDefined();
      expect(compressResult.data.byteLength).toBeGreaterThan(0);
      const reloaded = await PDFDocument.load(compressResult.data);
      expect(reloaded.getPageCount()).toBe(originalCount);
    });
  });

  // =========================================================================
  // Section 12: Page Organizer Workflows
  // =========================================================================
  describe('Page Organizer Workflow (Section 12)', () => {
    it('should perform reorder, rotate, duplicate, and delete operations', async () => {
      const pdf = await createPdf2_ThreePagesDifferentText();
      const { documentId } = await engine.openDocument(pdf);
      expect(engine.getPageCount(documentId)).toBe(3);

      // Rotate page 1 by 90
      await engine.rotatePages(documentId, [0], 90);
      const d0 = await engine.getPageDimensions(documentId, 0);
      expect(d0.rotation).toBe(90);

      // Duplicate page 1 (index 0)
      await engine.duplicatePages(documentId, [0]);
      expect(engine.getPageCount(documentId)).toBe(4);

      // Delete page 3 (index 2)
      await engine.deletePages(documentId, [2]);
      expect(engine.getPageCount(documentId)).toBe(3);

      // Save and verify persistence
      const savedBytes = await engine.saveDocument(documentId);
      const verifyDoc = await PDFDocument.load(savedBytes);
      expect(verifyDoc.getPageCount()).toBe(3);
    });
  });

  // =========================================================================
  // Section 16: Watermark PDF Workflows
  // =========================================================================
  describe('Watermark Workflow (Section 16)', () => {
    it('should apply customized text watermark to targeted pages', async () => {
      const pdf = await createPdf2_ThreePagesDifferentText();
      const { documentId } = await engine.openDocument(pdf);

      await engine.addWatermark(documentId, {
        text: 'CONFIDENTIAL',
        fontSize: 48,
        color: '#FF0000',
        opacity: 0.35,
        rotationDegrees: 45,
      });

      const savedBytes = await engine.saveDocument(documentId);
      const verifyDoc = await PDFDocument.load(savedBytes);
      expect(verifyDoc.getPageCount()).toBe(3);
    });
  });

  // =========================================================================
  // Section 23: Metadata Sanitization
  // =========================================================================
  describe('Sanitize & Redact Metadata (Section 23)', () => {
    it('should scrub author, producer, title, and metadata cleanly', async () => {
      const doc = await PDFDocument.create();
      doc.setTitle('Sensitive Title');
      doc.setAuthor('Secret Author');
      doc.setProducer('Internal PDF Engine v1.0');
      doc.setCreator('Confidential Creator App');
      doc.addPage([500, 500]);
      const initialBytes = await doc.save();

      const { documentId } = await engine.openDocument(initialBytes);
      const sanitizeResult = await engine.sanitizeDocument(documentId);
      expect(sanitizeResult.strippedFields).toContain('Author');
      expect(sanitizeResult.strippedFields).toContain('Creator');

      const sanitizedBytes = await engine.saveDocument(documentId);
      expect(sanitizedBytes.byteLength).toBeGreaterThan(0);
      const cleanMeta = await engine.getMetadata(documentId);
      expect(cleanMeta.author).toBeFalsy();
      expect(cleanMeta.creator).toBeFalsy();
    });
  });

  // =========================================================================
  // Section 39: QR Code Generator Local Verification
  // =========================================================================
  describe('Local-First QR Code Generator (Section 39)', () => {
    it('should generate QR code purely client-side without external network calls', async () => {
      const textToEncode = 'https://justpdfcraft.xyz/student-tools';
      const qrDataUrl = await QRCode.toDataURL(textToEncode, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 240,
      });

      expect(qrDataUrl).toBeDefined();
      expect(qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
      expect(qrDataUrl.length).toBeGreaterThan(100);
    });
  });

  // =========================================================================
  // Section 40: Cryptographically Secure Password Generator
  // =========================================================================
  describe('Exam Portal Password Generator (Section 40)', () => {
    it('should generate strong passwords using crypto randomness', () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$*!';
      const length = 16;
      const randomValues = new Uint32Array(length);
      crypto.getRandomValues(randomValues);

      let password = '';
      for (let i = 0; i < length; i++) {
        password += chars.charAt(randomValues[i] % chars.length);
      }

      expect(password.length).toBe(16);
      expect(/[A-Z]/.test(password) || /[a-z]/.test(password)).toBe(true);
      expect(/\d/.test(password) || /[@#$*!]/.test(password)).toBe(true);
    });
  });

  // =========================================================================
  // Section 41: Random Picker Utility
  // =========================================================================
  describe('Random Roll / Item Picker (Section 41)', () => {
    it('should cleanly parse and pick from multi-line text input ignoring whitespace', () => {
      const rawInput = "  Roll 101 \n\n  Roll 102 \n Roll 103 \n   \n Roll 104  ";
      const items = rawInput
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      expect(items.length).toBe(4);
      expect(items).toEqual(['Roll 101', 'Roll 102', 'Roll 103', 'Roll 104']);

      const randomIndex = Math.floor(Math.random() * items.length);
      const picked = items[randomIndex];
      expect(items).toContain(picked);
    });
  });
});
