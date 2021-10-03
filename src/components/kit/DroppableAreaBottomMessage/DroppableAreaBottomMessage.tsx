import { FC } from 'react';
import BackupTwoToneIcon from '@mui/icons-material/BackupTwoTone';
import { Paper } from '@mui/material';
import styles from './DroppableAreaBottomMessage.module.scss';

interface DroppableAreaBottomMessageProps {
  uploadText?: string;
}

const DroppableAreaBottomMessage: FC<DroppableAreaBottomMessageProps> = ({
  uploadText = 'Drag file to upload'
}) => {
  return (
    <div className={styles.Container}>
      <BackupTwoToneIcon className={styles.UploadIcon} />
      <Paper className={styles.Paper}>
        {uploadText}
      </Paper>
    </div>
  );
};

export default DroppableAreaBottomMessage;
