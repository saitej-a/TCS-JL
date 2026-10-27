import { useState } from "react";
import { uploadImage } from "@/api/images";

interface ImageUploaderProps {
  onUpload: (image: any) => void;
  maxFiles?: number;
  className?: string;
}

export function ImageUploader({ onUpload, maxFiles = 1, className = "" }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    setError(null);
    setUploading(true);
    
    try {
      const image = await uploadImage(file);
      onUpload(image);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleUpload(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUpload(file);
    }
  };

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed p-8 text-center ${
          isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
        }`}
      >
        <p className="text-gray-600">
          Drag & drop an image here, or click to select
        </p>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer mt-4 inline-block">
          <span className="bg-indigo-600 text-white px-4 py-2 rounded inline-block">
            Select Image
          </span>
        </label>
        {uploading && (
          <p className="text-indigo-600 mt-2">Uploading...</p>
        )}
      </div>
      {error && (
        <p className="text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
