'use client';

import { useContext, useRef } from 'react';
import { useMutation } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';

import { UPLOAD_IMAGE_TO_S3 } from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import { getGraphQLErrorMessage } from '@/lib/utils/methods';
import { MAX_PROFILE_PHOTO_FILE_SIZE } from '@/lib/utils/constants';
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

export default function ProfilePhotoUpload({
  value,
  onUploaded,
  maxSizeBytes = MAX_PROFILE_PHOTO_FILE_SIZE,
}: {
  value?: string;
  onUploaded: (url: string) => void;
  maxSizeBytes?: number;
}) {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, { loading }] = useMutation(UPLOAD_IMAGE_TO_S3);

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast({ type: 'error', title: t('Profile photo'), message: t('Supported formats: JPG, PNG, WebP'), duration: 3000 });
      return;
    }
    if (file.size > maxSizeBytes) {
      showToast({
        type: 'error',
        title: t('Profile photo'),
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
        title: t('Profile photo'),
        message: getGraphQLErrorMessage(error as Error) ?? t('Upload failed'),
        duration: 3000,
      });
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <p className="mb-2 self-start text-sm font-semibold text-slate-900 dark:text-white">
        {t('Profile photo')} <span className="font-normal text-slate-400">({t('optional')})</span>
      </p>
      <div className="grid h-20 w-20 flex-shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 dark:border-dark-600 dark:bg-dark-900">
        {value ? (
          <Image src={value} alt={t('Profile photo')} width={80} height={80} className="h-full w-full object-cover" />
        ) : (
          <FontAwesomeIcon icon={faUser} className="text-2xl text-slate-300" />
        )}
      </div>
      <CustomButton
        type="button"
        className="mt-3 h-9 w-full border border-gray-300 bg-white px-4 text-sm text-slate-700 dark:border-dark-600 dark:bg-dark-950 dark:text-white"
        label={value ? t('Replace photo') : t('Upload photo')}
        loading={loading}
        onClick={() => inputRef.current?.click()}
      />
      <p className="mt-1 text-xs text-slate-400">{t('JPG, PNG or WebP, up to 2MB')}</p>
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
