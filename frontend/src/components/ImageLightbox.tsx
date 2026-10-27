import { useState } from "react";

interface ImageLightboxProps {
  src: string;
  thumbnail?: string;
  alt?: string;
  className?: string;
}

export function ImageLightbox({ src, thumbnail, alt, className = "" }: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <div 
        className={`relative group cursor-pointer ${className}`} 
        onClick={() => setIsOpen(true)}
      >
        <img
          src={thumbnail || src}
          alt={alt}
          className="max-h-64 object-contain rounded"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-opacity" />
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative max-w-5xl max-h-screen"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute -top-10 right-0 text-white text-4xl"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-screen object-contain rounded"
              onLoad={() => setLoaded(true)}
            />
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
