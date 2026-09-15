import { IGlobalButtonProps } from '@/lib/utils/interfaces';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from 'primereact/button';
export default function CustomIconButton({
  Icon,
  title,
  setVisible,
}: IGlobalButtonProps) {
  return (
    <Button
      className="ls-button"
      type="button"
      onClick={() => setVisible(true)}
    >
      <span>
        <FontAwesomeIcon icon={Icon} size="1x" />
      </span>
      <span>{title}</span>
    </Button>
  );
}
