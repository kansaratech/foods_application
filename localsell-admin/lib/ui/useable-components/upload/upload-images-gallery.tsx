import ActionButton from '@/lib/ui/useable-components/button/action-button';
// Contexts
import { ToastContext } from '@/lib/context/global/toast.context';

// GraphQL
import { useMutation } from '@apollo/client';
import { UPLOAD_IMAGE_TO_S3 } from '@/lib/api/graphql/mutations';

// Hooks
import { useCallback, useContext, useRef, useState } from 'react';

// Utils
import { compressImage } from '@/lib/utils/methods';

// Components
import CustomLoader from '../custom-progress-indicator';
import Image from '@/lib/ui/useable-components/safe-image';

// Prime React
import { FileUpload, FileUploadSelectEvent } from 'primereact/fileupload';

// Icons
import { faUpload, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'use-intl';

interface IMultiImageUploadProps {
  name: string;
  title: string;
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  style?: React.CSSProperties;
}

function MultiImageUploadComponent({
  title,
  images,
  onChange,
  maxImages = 5,
  style,
}: IMultiImageUploadProps) {
  const { showToast } = useContext(ToastContext);
  const [uploadToS3] = useMutation(UPLOAD_IMAGE_TO_S3);
  const [isUploading, setIsUploading] = useState(false);
  const fileUploadRef = useRef<FileUpload>(null);
  const t = useTranslations();

  const remaining = maxImages - images.length;

  const handleSelect = useCallback(
    async (event: FileUploadSelectEvent) => {
      const files = Array.from(event.files || []).slice(0, remaining);
      fileUploadRef.current?.clear();
      if (!files.length) return;

      setIsUploading(true);
      const uploaded: string[] = [];
      for (const file of files) {
        try {
          const processedFile = await compressImage(file, 800, 0.7);
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(processedFile);
          });
          const { data } = await uploadToS3({ variables: { image: base64 } });
          const imageUrl = data?.uploadImageToS3?.imageUrl;
          if (imageUrl) uploaded.push(imageUrl);
        } catch {
          showToast({
            type: 'error',
            title,
            message: `${t('Image')} ${t('Upload Failed')}`,
            duration: 2500,
          });
        }
      }
      if (uploaded.length) onChange([...images, ...uploaded]);
      setIsUploading(false);
    },
    [remaining, images, onChange, uploadToS3, showToast, title, t]
  );

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-[600]">{title}</span>
      <div className="flex flex-wrap gap-3">
        {images.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="relative h-24 w-24 overflow-hidden rounded-md border border-gray-300 dark:border-dark-600"
          >
            <Image
              alt={`${title} ${index + 1}`}
              src={url}
              width={96}
              height={96}
            />
            <ActionButton
              variant="danger"
              type="button"
              aria-label={`${t('Remove')} ${t('Image')} ${index + 1}`}
              disabled={isUploading}
              onClick={() => removeImage(index)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white"
            >
              <FontAwesomeIcon icon={faXmark} size="xs" />
            </ActionButton>
          </div>
        ))}

        {remaining > 0 && (
          <div
            style={style}
            className="admin-image-upload flex min-h-24 min-w-40 flex-col items-center justify-center rounded-xl border border-dashed p-3"
          >
            {isUploading ? (
              <CustomLoader />
            ) : (
              <FileUpload
                ref={fileUploadRef}
                mode="basic"
                multiple
                accept="image/webp,image/jpeg,image/jpg,image/png"
                customUpload
                auto
                uploadHandler={() => undefined}
                onSelect={handleSelect}
                chooseLabel={t('Upload Images')}
                chooseOptions={{
                  className:
                    '!bg-transparent !border-0 !shadow-none !text-primary flex items-center justify-center gap-2 !px-3 !py-2',
                  icon: () => <FontAwesomeIcon icon={faUpload} size="lg" />,
                }}
              />
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-content-muted">
        {images.length}/{maxImages} {t('images')}
      </p>
    </div>
  );
}

export default MultiImageUploadComponent;
