// Screen 16 (O4b): the on-device model's state on load. Without it, chats stay closed (fail-closed path).
import { useI18n } from '../i18n.ts';
import { Badge } from './common.tsx';
import type { useModelState } from '../app/model.ts';

export function ModelStatus({ model }: { model: ReturnType<typeof useModelState> }) {
  const { t } = useI18n();
  if (model.state === 'checking') return null;
  if (model.state === 'available') return <p className="status status-device" role="status"><Badge kind="device" /> {t('modelReady')}</p>;
  if (model.state === 'downloadable') return (
    <div className="status status-warning" role="status"><p>{t('modelDownloadable')}</p>
      <button type="button" className="btn btn-secondary" onClick={model.download}>{t('modelDownload')}</button></div>);
  if (model.state === 'downloading') return <p className="status status-warning" role="status">{t('modelDownloading', { pct: model.pct })}</p>;
  return <p className="status status-warning" role="status">{t('modelUnavailable')}</p>;
}
