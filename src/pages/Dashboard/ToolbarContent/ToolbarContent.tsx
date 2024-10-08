import { Avatar, Chip, IconButton, Stack, Typography } from '@mui/material';
import { Searchbar } from '@components/kit';
import { FC, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@hooks/store';
import { selectAppConfig } from '@store/slices/config/config.selectors';
import styled from '@emotion/styled';
import { Link } from 'react-router-dom';
import { globalSearch } from '@store/slices/datasets/datasets.thunk';
import { GlobalSearchResult } from '@services/api/datasets';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import { updateUI } from '@store/slices/datasets/datasets.slice';
import { selectIsLoggedIn } from '@store/slices/auth/auth.selectors';
import UserAvatar from '@components/kit/UserAvatar';
import styles from './ToolbarContent.module.scss';

const SearchResultItem = styled(Link)({
  display: 'flex',
  alignItems: 'center',
  padding: '4px 8px',
  textDecoration: 'none',
  color: 'inherit',
  '> span': {
    marginRight: 'auto'
  },
  '&:hover': {
    backgroundColor: 'rgb(234, 238, 243, 0.3)'
  }
});

const ToolbarContent: FC<any> = () => {
  const [
    { datasets, tables },
    setSearchResults] = useState<GlobalSearchResult>({ datasets: [], tables: [] });
  const auth = useAppSelector(selectIsLoggedIn);

  const { API } = useAppSelector(selectAppConfig);
  const dispatch = useAppDispatch();

  const handleOnChange = (value: string) => {
    if (value) {
      dispatch(globalSearch({ query: value }))
        .unwrap()
        .then((res) => setSearchResults(res));
    }
  };

  const autocompleteComponent = tables.length > 0 || datasets.length > 0 ? (
    <>
      {datasets.map((item) => (
        <SearchResultItem
          key={item.id}
          to={`/datasets/${item.id}/tables`}>
          <span>{item.name}</span>
          <Chip size="small" label="dataset" />
        </SearchResultItem>
      ))}
      {
        tables.map((item) => (
          <SearchResultItem
            key={item.id}
            to={`/datasets/${item.idDataset}/tables/${item.id}`}>
            <span>{item.name}</span>
            <Chip size="small" label="table" />
          </SearchResultItem>
        ))
      }

    </>
  ) : <div className={styles.SearchNoResult}>No results found</div>;

  return (
    <Stack direction="row" gap="10px" width="100%" alignItems="center">
      <Stack
        component={Link}
        sx={{
          textDecoration: 'none'
        }}
        to="/"
        direction="row"
        alignItems="center"
        gap="8px">
        <Typography className={styles.AppTitle} component="span" variant="h4">
          SemTUI
        </Typography>
      </Stack>

      {API.ENDPOINTS.GLOBAL_SEARCH && (
        <Searchbar
          onInputChange={handleOnChange}
          debounceChange
          enableAutocomplete
          autocompleteComponent={autocompleteComponent}
          className={styles.Searchbar}
          enableTags={false}
          expand={false}
          placeholder="Search for a table name"
        />
      )}

      <IconButton
        sx={{
          color: '#FFF'
        }}
        onClick={() => dispatch(updateUI({ helpDialogOpen: true }))}>
        <HelpOutlineRoundedIcon />
      </IconButton>
      {auth.loggedIn && auth.user && (
        <UserAvatar>
          {auth.user.username.slice(0, 2).toUpperCase()}
        </UserAvatar>
      )}
    </Stack>
  );
};

export default ToolbarContent;
