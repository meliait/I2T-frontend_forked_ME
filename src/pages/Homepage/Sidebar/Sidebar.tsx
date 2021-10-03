import { Button, Typography } from '@mui/material';
import { ChangeEvent, FC, useState } from 'react';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import PostAddRoundedIcon from '@mui/icons-material/PostAddRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { NavLink } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@hooks/store';
import { updateUI } from '@store/slices/tables/tables.slice';
import { selectIsChallengeDialogOpen } from '@store/slices/tables/tables.selectors';
import styles from './Sidebar.module.scss';
import LoadChallengeTableDialog from '../LoadChallengeTableDialog';

interface SidebarProps {
  onFileChange: (files: File[]) => void;
}

const PERMITTED_FILE_EXTENSIONS = ['csv', 'json'];

const Sidebar: FC<SidebarProps> = ({
  onFileChange
}) => {
  const dispatch = useAppDispatch();
  const isChallengeDialogOpen = useAppSelector(selectIsChallengeDialogOpen);

  const getPermittedFiles = (fileList: FileList | null) => {
    const permittedFiles: File[] = [];
    if (fileList) {
      Object.keys(fileList).forEach((key) => {
        const [fileExtension, ...rest] = fileList[key as any].name.split('.').reverse();
        if (PERMITTED_FILE_EXTENSIONS.find((extension) => extension === fileExtension)) {
          permittedFiles.push(fileList[key as any]);
        }
      });
    }
    return permittedFiles;
  };

  const handleUploadFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    const permittedFiles = getPermittedFiles(files);
    if (permittedFiles.length > 0) {
      onFileChange(permittedFiles);
    }
    event.target.value = '';
  };

  return (
    <>
      <div className={styles.Container}>
        <Button
          component="label"
          className={styles.UploadButton}
          startIcon={<AddRoundedIcon />}
          color="primary"
          variant="contained">
          Upload table
          <input
            onChange={handleUploadFileChange}
            type="file"
            multiple
            hidden
          />
        </Button>
        <Button
          onClick={() => dispatch(updateUI({ challengeDialogOpen: true }))}
          className={styles.UploadButton}
          startIcon={<AddRoundedIcon />}
          color="primary"
          variant="contained">
          Challenge table
        </Button>
        <NavLink
          to="/raw"
          onClick={() => dispatch(updateUI({ selectedSource: 'raw' }))}
          activeClassName={styles.Active}
          className={styles.SidebarItem}>
          <StorageRoundedIcon />
          <Typography variant="body1">Raw tables</Typography>
        </NavLink>
        <NavLink
          to="/annotated"
          onClick={() => dispatch(updateUI({ selectedSource: 'annotated' }))}
          activeClassName={styles.Active}
          className={styles.SidebarItem}>
          <PostAddRoundedIcon />
          <Typography variant="body1">Annotated tables</Typography>
        </NavLink>
      </div>
      <LoadChallengeTableDialog
        open={isChallengeDialogOpen} />
    </>
  );
};

export default Sidebar;
