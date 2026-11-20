// Screen 16 (O4b): the on-device model's state on load. Without it, chats stay closed (fail-closed path).
import { useI18n } from '../i18n.ts';
import { Icon } from './common.tsx';
import type { useModelState } from '../app/model.ts';

export function ModelStatus({ model }: { model: ReturnType<typeof useModelState> }) {
  const { t } = useI18n();
  if (model.state === 'checking') return <p className="status status-quiet" role="status"><Icon kind="chip" /><span>{t('modelChecking')}</span></p>;
  if (model.state === 'available') return <p className="status status-device" role="status"><Icon kind="chip" /><span>{t('modelReady')}</span></p>;
  if (model.state === 'downloadable') return (
    <div className="status status-warning" role="status"><Icon kind="chip" /><span>{t('modelDownloadable')}</span>
      <button type="button" className="btn btn-secondary btn-small" onClick={model.download}>{t('modelDownload')}</button></div>);
  if (model.state === 'downloading') return <p className="status status-warning" role="status"><Icon kind="chip" /><span>{t('modelDownloading', { pct: model.pct })}</span></p>;
  return <p className="status status-warning" role="status"><Icon kind="device" /><span>{t('modelUnavailable')}</span></p>;
}
