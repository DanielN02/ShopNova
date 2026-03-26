import React, { useState, useRef, useCallback } from 'react';

interface ImageUploadProps {
  onFilesChange: (files: File[]) => void;
  existingImages?: string[];
  onRemoveExisting?: (index: number) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILES = 5;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageUpload({ onFilesChange, existingImages = [], onRemoveExisting }: ImageUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndAddFiles = useCallback((newFiles: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(newFiles);
    const totalCount = files.length + existingImages.length + fileArray.length;

    if (totalCount > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} images allowed. You can add ${MAX_FILES - files.length - existingImages.length} more.`);
      return;
    }

    const validFiles: File[] = [];
    for (const file of fileArray) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`"${file.name}" is not a valid image. Only JPEG, PNG, GIF, and WebP are allowed.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds the 5MB size limit (${formatFileSize(file.size)}).`);
        return;
      }
      validFiles.push(file);
    }

    const newPreviews = validFiles.map((f) => URL.createObjectURL(f));
    const updatedFiles = [...files, ...validFiles];
    const updatedPreviews = [...previews, ...newPreviews];

    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    onFilesChange(updatedFiles);
  }, [files, previews, existingImages.length, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  }, [validateAndAddFiles]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
    // Reset input so re-selecting the same file triggers onChange
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [validateAndAddFiles]);

  const removeFile = useCallback((index: number) => {
    URL.revokeObjectURL(previews[index]);
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    onFilesChange(updatedFiles);
    setError(null);
  }, [files, previews, onFilesChange]);

  const handleRemoveExisting = useCallback((index: number) => {
    if (onRemoveExisting) {
      onRemoveExisting(index);
    }
    setError(null);
  }, [onRemoveExisting]);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileInput}
          className="hidden"
        />
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
        </p>
        <p className="mt-1 text-xs text-gray-500">
          JPEG, PNG, GIF, or WebP up to 5MB (max {MAX_FILES} images)
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Existing image thumbnails */}
      {existingImages.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Existing Images</p>
          <div className="flex flex-wrap gap-3">
            {existingImages.map((url, index) => (
              <div key={`existing-${index}`} className="relative group">
                <img
                  src={url}
                  alt={`Existing ${index + 1}`}
                  className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                />
                {onRemoveExisting && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveExisting(index);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    X
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New file previews */}
      {files.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">New Images</p>
          <div className="flex flex-wrap gap-3">
            {files.map((file, index) => (
              <div key={`new-${index}`} className="relative group">
                <img
                  src={previews[index]}
                  alt={file.name}
                  className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  X
                </button>
                <p className="mt-1 text-xs text-gray-500 text-center truncate w-24">
                  {formatFileSize(file.size)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
