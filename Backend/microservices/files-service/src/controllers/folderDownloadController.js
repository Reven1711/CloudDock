import { FileModel } from "../models/File.js";
import { getS3Object } from "../services/s3Service.js";
import archiver from "archiver";
import { Readable } from "stream";

/**
 * Download folder as ZIP
 * Recursively fetches all files in a folder and creates a ZIP archive
 */
export const downloadFolderAsZip = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { orgId, userId } = req.query;

    if (!folderId || !orgId) {
      return res.status(400).json({ error: "Folder ID and Organization ID are required" });
    }

    // Find the folder record
    const folderRecord = await FileModel.findOne({
      fileId: folderId,
      orgId,
      isDeleted: false,
      mimeType: "application/vnd.clouddock.folder",
    });

    if (!folderRecord) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Construct the folder path
    const folderPath =
      folderRecord.folder === "/"
        ? `/${folderRecord.fileName}/`
        : `${folderRecord.folder}${folderRecord.fileName}/`;

    // Build query filter for files in this folder (recursively)
    const fileQuery = {
      orgId,
      folder: { $regex: `^${folderPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
      isDeleted: false,
      mimeType: { $ne: "application/vnd.clouddock.folder" }, // Only actual files
    };

    // 🔒 SECURITY: Filter by userId if provided (for regular users)
    if (userId) {
      fileQuery["uploadedBy.userId"] = userId;
    }

    // Also get files directly in this folder
    const directFileQuery = {
      orgId,
      folder: folderPath,
      isDeleted: false,
      mimeType: { $ne: "application/vnd.clouddock.folder" },
    };

    if (userId) {
      directFileQuery["uploadedBy.userId"] = userId;
    }

    // Fetch all files
    const [nestedFiles, directFiles] = await Promise.all([
      FileModel.find(fileQuery),
      FileModel.find(directFileQuery),
    ]);

    // Combine and deduplicate
    const allFiles = [...directFiles, ...nestedFiles];
    const uniqueFiles = Array.from(new Set(allFiles.map(f => f.fileId)))
      .map(id => allFiles.find(f => f.fileId === id));

    if (uniqueFiles.length === 0) {
      return res.status(400).json({ error: "Folder is empty" });
    }

    // Check for infected files
    const infectedFiles = uniqueFiles.filter(f => f.virusScanStatus === "infected");
    if (infectedFiles.length > 0) {
      return res.status(403).json({
        error: "Folder contains infected files and cannot be downloaded",
        infectedFiles: infectedFiles.map(f => f.originalName),
      });
    }

    // Set response headers for ZIP download
    const zipFileName = `${folderRecord.originalName || folderRecord.fileName}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFileName}"`);
    res.setHeader("Transfer-Encoding", "chunked");

    // Create ZIP archive
    const archive = archiver("zip", {
      zlib: { level: 6 }, // Compression level (0-9)
    });

    // Handle archive errors
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to create ZIP archive" });
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    // Track progress
    let processedFiles = 0;
    const totalFiles = uniqueFiles.length;

    console.log(`📦 Creating ZIP for folder "${folderRecord.originalName}" with ${totalFiles} files...`);

    // Add files to archive
    for (const file of uniqueFiles) {
      try {
        // Get file from S3
        const s3Object = await getS3Object(file.s3Key);
        
        // Calculate relative path within the folder
        let relativePath = file.folder.replace(folderPath, "");
        if (relativePath && !relativePath.endsWith("/")) {
          relativePath += "/";
        }
        relativePath += file.originalName;

        // Add file to archive
        archive.append(s3Object.Body, { name: relativePath });

        processedFiles++;
        console.log(`✅ [${processedFiles}/${totalFiles}] Added: ${relativePath}`);
      } catch (error) {
        console.error(`❌ Failed to add file ${file.originalName}:`, error);
        // Continue with other files instead of failing entirely
      }
    }

    // Finalize the archive
    await archive.finalize();

    console.log(`✅ ZIP created successfully: ${zipFileName}`);
  } catch (error) {
    console.error("Download folder error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to download folder",
        message: error.message,
      });
    }
  }
};

