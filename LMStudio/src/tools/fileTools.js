import {
  readFile,
  writeFile,
  readdir,
  stat,
  mkdir,
  rm,
  copyFile,
  rename,
} from "fs/promises";
import { join, extname, basename, dirname } from "path";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import archiver from "archiver";
import { createUnzip } from "zlib";
import sharp from "sharp";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { logger } from "../utils/logger.js";

export class FileTools {
  constructor() {
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
    this.allowedTypes = (process.env.ALLOWED_FILE_TYPES || "*").split(",");
  }

  async readFile(filePath, encoding = "utf8") {
    try {
      const stats = await stat(filePath);

      if (stats.size > this.maxFileSize) {
        throw new Error(
          `File too large: ${stats.size} bytes (max: ${this.maxFileSize})`
        );
      }

      const content = await readFile(filePath, encoding);

      return {
        success: true,
        path: filePath,
        content,
        size: content.length,
        encoding,
        modified: stats.mtime,
        created: stats.birthtime,
      };
    } catch (error) {
      logger.error("File read failed", { filePath, error: error.message });
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async writeFile(filePath, content, encoding = "utf8") {
    try {
      // Ensure directory exists
      const dir = dirname(filePath);
      await mkdir(dir, { recursive: true });

      await writeFile(filePath, content, encoding);

      const stats = await stat(filePath);

      return {
        success: true,
        path: filePath,
        size: stats.size,
        created: stats.birthtime,
      };
    } catch (error) {
      logger.error("File write failed", { filePath, error: error.message });
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async listDirectory(dirPath, recursive = false) {
    try {
      const items = await readdir(dirPath);
      const result = [];

      for (const item of items) {
        const itemPath = join(dirPath, item);
        const stats = await stat(itemPath);

        const itemInfo = {
          name: item,
          path: itemPath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
        };

        result.push(itemInfo);

        // Recursively list subdirectories
        if (recursive && stats.isDirectory()) {
          try {
            const subItems = await this.listDirectory(itemPath, true);
            itemInfo.children = subItems;
          } catch (error) {
            itemInfo.error = `Failed to read subdirectory: ${error.message}`;
          }
        }
      }

      return {
        success: true,
        path: dirPath,
        items: result,
        count: result.length,
        recursive,
      };
    } catch (error) {
      logger.error("Directory listing failed", {
        dirPath,
        error: error.message,
      });
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  async createDirectory(dirPath) {
    try {
      await mkdir(dirPath, { recursive: true });

      const stats = await stat(dirPath);

      return {
        success: true,
        path: dirPath,
        created: stats.birthtime,
      };
    } catch (error) {
      logger.error("Directory creation failed", {
        dirPath,
        error: error.message,
      });
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  async deleteFile(filePath) {
    try {
      const stats = await stat(filePath);
      await rm(filePath, { recursive: stats.isDirectory() });

      return {
        success: true,
        path: filePath,
        deleted: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("File deletion failed", { filePath, error: error.message });
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async copyFile(sourcePath, destPath) {
    try {
      await copyFile(sourcePath, destPath);

      const stats = await stat(destPath);

      return {
        success: true,
        source: sourcePath,
        destination: destPath,
        size: stats.size,
        copied: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("File copy failed", {
        sourcePath,
        destPath,
        error: error.message,
      });
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }

  async moveFile(sourcePath, destPath) {
    try {
      await rename(sourcePath, destPath);

      return {
        success: true,
        source: sourcePath,
        destination: destPath,
        moved: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("File move failed", {
        sourcePath,
        destPath,
        error: error.message,
      });
      throw new Error(`Failed to move file: ${error.message}`);
    }
  }

  async processImage(imagePath, options = {}) {
    try {
      const {
        width,
        height,
        format = "jpeg",
        quality = 80,
        outputPath,
      } = options;

      let pipeline = sharp(imagePath);

      if (width || height) {
        pipeline = pipeline.resize(width, height);
      }

      if (format === "jpeg") {
        pipeline = pipeline.jpeg({ quality });
      } else if (format === "png") {
        pipeline = pipeline.png();
      } else if (format === "webp") {
        pipeline = pipeline.webp({ quality });
      }

      const result = await pipeline.toFile(outputPath || imagePath);

      return {
        success: true,
        inputPath: imagePath,
        outputPath: outputPath || imagePath,
        format: result.format,
        width: result.width,
        height: result.height,
        size: result.size,
      };
    } catch (error) {
      logger.error("Image processing failed", {
        imagePath,
        error: error.message,
      });
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  async extractTextFromPdf(pdfPath) {
    try {
      const dataBuffer = await readFile(pdfPath);
      const data = await pdfParse(dataBuffer);

      return {
        success: true,
        path: pdfPath,
        text: data.text,
        pages: data.numpages,
        info: data.info,
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("PDF text extraction failed", {
        pdfPath,
        error: error.message,
      });
      throw new Error(`PDF text extraction failed: ${error.message}`);
    }
  }

  async extractTextFromDocx(docxPath) {
    try {
      const result = await mammoth.extractRawText({ path: docxPath });

      return {
        success: true,
        path: docxPath,
        text: result.value,
        messages: result.messages,
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("DOCX text extraction failed", {
        docxPath,
        error: error.message,
      });
      throw new Error(`DOCX text extraction failed: ${error.message}`);
    }
  }

  async createArchive(files, outputPath, format = "zip") {
    try {
      const archive = archiver(format, { zlib: { level: 9 } });
      const output = createWriteStream(outputPath);

      archive.pipe(output);

      for (const file of files) {
        const stats = await stat(file);
        if (stats.isDirectory()) {
          archive.directory(file, basename(file));
        } else {
          archive.file(file, { name: basename(file) });
        }
      }

      await archive.finalize();

      const outputStats = await stat(outputPath);

      return {
        success: true,
        outputPath,
        format,
        size: outputStats.size,
        filesIncluded: files.length,
        created: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Archive creation failed", {
        files,
        outputPath,
        error: error.message,
      });
      throw new Error(`Archive creation failed: ${error.message}`);
    }
  }
}
