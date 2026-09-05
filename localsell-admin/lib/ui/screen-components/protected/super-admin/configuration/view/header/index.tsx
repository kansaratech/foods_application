import { useTranslations } from 'next-intl';
const ConfigHeader = () => {
  const t = useTranslations();
  return (
    <header className="configuration-heading">
      <h1>{t('Configurations')}</h1>
      <p>Manage platform and app settings.</p>
    </header>
  );
};
export default ConfigHeader;
