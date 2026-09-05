'use client';

import { useContext, useRef } from 'react';
import { useMutation } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faStore } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';

import { UPLOAD_IMAGE_TO_S3 } from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import { getGraphQLErrorMessage } from '@/lib/utils/methods';
import Image from '@/lib/ui/useable-components/safe-image';
import CustomButton from '@/lib/ui/useable-components/button';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * A compact image upload field with a real thumbnail preview — square (logo)
 * or landscape (cover) — used anywhere a store/vendor picks a photo. Shared
 * so every admin form gets the same look instead of the old bare dropzone
 * (empty dashed box with a floating "Upload Image" button and no preview).
 */
export default function ImageUploadCard({
  label,
  helperText,
  required,
  value,
  onUploaded,
  aspect = 'square',
  maxSizeBytes = 2 * 1024 * 1024,
}: {
  label: string;
  helperText: string;
  required?: boolean;
  value?: string;
  onUploaded: (url: string) => void;
  aspect?: 'square' | 'landscape';
  maxSizeBytes?: number;
}) {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, { loading }] = useMutation(UPLOAD_IMAGE_TO_S3);

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast({ type: 'error', title: label, message: t('Supported formats: JPG, PNG, WebP'), duration: 3000 });
      return;
    }
    if (file.size > maxSizeBytes) {
      showToast({
        type: 'error',
        title: label,
        message: `${t('File must be smaller than')} ${Math.round(maxSizeBytes / (1024 * 1024))}MB`,
        duration: 3000,
      });
      return;
    }
    try {
      const base64 = await readAsDataUrl(file);
      const { data } = await uploadFile({ variables: { image: base64 } });
      const url = data?.uploadImageToS3?.imageUrl;
      if (!url) throw new Error(t('Upload failed'));
      onUploaded(url);
    } catch (error) {
      showToast({
        type: 'error',
        title: label,
        message: getGraphQLErrorMessage(error as Error) ?? t('Upload failed'),
        duration: 3000,
      });
    }
  };

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
        {label}
        {required ? <span className="text-red-500"> *</span> : <span className="ml-1 text-xs font-normal text-slate-400">({t('optional')})</span>}
      </p>
      <div className="flex items-center gap-3">
        <div
          className={`grid flex-shrink-0 place-items-center overflow-hidden border border-dashed border-slate-300 bg-slate-50 dark:border-dark-600 dark:bg-dark-900 ${
            aspect === 'square' ? 'h-16 w-16 rounded-lg' : 'h-16 w-28 rounded-lg'
          }`}
        >
          {value ? (
            <Image src={value} alt={label} width={112} height={64} className="h-full w-full object-cover" />
          ) : (
            <FontAwesomeIcon icon={aspect === 'square' ? faStore : faImage} className="text-lg text-slate-300" />
          )}
        </div>
        <div>
          <CustomButton
            type="button"
            className="h-9 border border-[#1c5bc7] bg-white px-4 text-sm text-[#1c5bc7] dark:border-primary-color dark:bg-dark-950"
            label={value ? t('Replace') : t('Upload file')}
            loading={loading}
            onClick={() => inputRef.current?.click()}
          />
          <p className="mt-1 text-xs text-slate-400">{helperText}</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
