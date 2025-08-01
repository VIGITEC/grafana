import { t } from '@grafana/i18n';
import { ConfirmModal } from '@grafana/ui';

import { PanelModel } from '../../../dashboard/state/PanelModel';
import { isPanelModelLibraryPanel } from '../../guard';

export interface ChangeLibraryPanelModalProps {
  panel: PanelModel;
  onConfirm: () => void;
  onDismiss: () => void;
}

export const ChangeLibraryPanelModal = ({ onConfirm, onDismiss, panel }: ChangeLibraryPanelModalProps): JSX.Element => {
  const isLibraryPanel = isPanelModelLibraryPanel(panel);
  const title = `${isLibraryPanel ? 'Changing' : 'Replace with'} library panel`;
  const body = `${
    isLibraryPanel ? 'Changing' : 'Replacing with a'
  } library panel will remove any changes since last save.`;
  return (
    <ConfirmModal
      onConfirm={onConfirm}
      onDismiss={onDismiss}
      confirmText={
        isLibraryPanel
          ? t('library-panels.change-library-panel-modal.confirmText-change', 'Change')
          : t('library-panels.change-library-panel-modal.confirmText-replace', 'Replace')
      }
      title={title}
      body={body}
      dismissText="Cancel"
      isOpen={true}
    />
  );
};
