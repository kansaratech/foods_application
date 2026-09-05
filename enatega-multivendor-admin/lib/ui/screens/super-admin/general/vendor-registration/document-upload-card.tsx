'use client';

import { useContext, useRef } from 'react';
import { useMutation } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faUpload } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';

import { UPLOAD_IMAGE_TO_S3 } from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import { getGraphQLErrorMessage } from '@/lib/utils/methods';
import CustomLoader from '@/lib/ui/useable-components/custom-progress-indicator';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function DocumentUploadCard({
  label,
  helperText,
  required,
  value,
  onUploaded,
  onRemove,
  maxSizeBytes = 5 * 1024 * 1024,
}: {
  label: string;
  helperText: string;
  required?: boolean;
  value?: string;
  onUploaded: (url: string) => void;
  onRemove: () => void;
  maxSizeBytes?: number;
}) {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, { loading }] = useMutation(UPLOAD_IMAGE_TO_S3);

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast({
        type: 'error',
        title: label,
        message: t('Supported formats: JPG, PNG, PDF'),
        duration: 3000,
      });
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
    <div className="rounded-lg border border-slate-200 p-4 dark:border-dark-600">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        {label}
        {required ? <span className="text-red-500"> *</span> : <span className="ml-1 text-xs font-normal text-slate-400">({t('optional')})</span>}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{helperText}</p>

      <div className="mt-3 flex items-center gap-3">
        {value ? (
          <>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400"
            >
              <FontAwesomeIcon icon={faCircleCheck} />
              {t('Uploaded')}
            </a>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs font-medium text-[#1c5bc7] underline"
            >
              {t('Replace')}
            </button>
            <button type="button" onClick={onRemove} className="text-xs font-medium text-slate-400 underline">
              {t('Remove')}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[#1c5bc7] px-3 text-sm font-medium text-[#1c5bc7] transition hover:bg-[#e8f0fc] disabled:opacity-50 dark:hover:bg-dark-900"
          >
            {loading ? <CustomLoader size="14px" /> : <FontAwesomeIcon icon={faUpload} />}
            {t('Upload file')}
          </button>
        )}
        <span className="text-xs text-slate-400">{t('JPG, PNG or PDF, up to')} {Math.round(maxSizeBytes / (1024 * 1024))}MB</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,application/pdf"
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
