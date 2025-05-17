'use client';

import type React from 'react';

import { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  maxSize?: number; // in MB
  accept?: string;
}

export function FileUpload({
  onUpload,
  maxSize = 10, // Default 10MB
  accept = 'image/*,text/*,application/pdf,application/json',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Check file size
    const oversizedFiles = files.filter(
      (file) => file.size > maxSize * 1024 * 1024
    );

    if (oversizedFiles.length > 0) {
      toast.error(`Some files exceed the ${maxSize}MB limit`, {
        description: oversizedFiles.map((f) => f.name).join(', '),
      });

      // Filter out oversized files
      const validFiles = files.filter(
        (file) => file.size <= maxSize * 1024 * 1024
      );
      onUpload(validFiles);
    } else {
      onUpload(files);
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        onChange={handleChange}
        multiple
        accept={accept}
      />
      <Button type="button" variant="outline" size="icon" onClick={handleClick}>
        <Paperclip className="h-4 w-4" />
        <span className="sr-only">Attach files</span>
      </Button>
    </>
  );
}
