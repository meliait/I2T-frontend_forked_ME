import { FC, useCallback } from 'react';
import clsx from 'clsx';
import StatusBadge from '@components/core/StatusBadge';
import ExpandableList from '@components/kit/ExpandableList/ExpandableList';
import ExpandableListHeader from '@components/kit/ExpandableListHeader';
import ExpandableListItem from '@components/kit/ExpandableListItem';
import ExpandableListBody from '@components/kit/ExpandableListBody';
import { IconButton, Link, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import SettingsEthernetRoundedIcon from '@mui/icons-material/SettingsEthernetRounded';
import { selectReconciliatorCell } from '@store/slices/table/table.selectors';
import { RootState } from '@store';
import { connect } from 'react-redux';
import { BaseMetadata, Cell } from '@store/slices/table/interfaces/table';
import { useAppDispatch } from '@hooks/store';
import { updateUI } from '@store/slices/table/table.slice';
import EntityLabel from '@components/core/EntityLabel';
import styles from './NormalCell.module.scss';

interface NormalCellProps {
  label: string;
  value: any;
  dense: boolean;
  expanded: boolean;
  reconciliator: string;
  settings: any;
}

const NormalCell: FC<NormalCellProps> = ({
  label,
  value,
  settings,
  reconciliator,
  dense,
  expanded
}) => {
  const dispatch = useAppDispatch();

  const {
    lowerBound: {
      isScoreLowerBoundEnabled,
      scoreLowerBound
    }
  } = settings;

  const getBadgeStatus = (cell: Cell) => {
    const {
      annotationMeta: {
        match,
        highestScore
      }
    } = cell;

    if (match.value) {
      switch (match.reason) {
        case 'manual':
          return 'match-manual';
        case 'reconciliator':
          return 'match-reconciliator';
        case 'refinement':
          return 'match-refinement';
        default:
          return 'match-reconciliator';
      }
    }

    if (isScoreLowerBoundEnabled) {
      if (scoreLowerBound && highestScore < scoreLowerBound) {
        return 'miss';
      }
    }
    return 'warn';
  };

  const getLabel = useCallback(() => {
    const match = value.metadata.find((meta: BaseMetadata) => meta.match);
    if (match) {
      return (
        <Link
          href={match.url}
          target="_blank">
          {label}
        </Link>
      );
    }
    if (label === 'null') {
      return <Typography component="span" color="textSecondary" lineHeight="0">{label}</Typography>;
    }
    return label;
  }, [value, label]);

  const getItems = useCallback((start: number, finish: number): any[] => {
    let end = finish;
    if (finish > value.metadata.length) {
      end = value.metadata.length;
    }
    return value.metadata.slice(start, end);
  }, [value.metadata]);

  return (
    <div className={styles.Container}
    >
      <div className={clsx(
        styles.CellLabel,
        {
          [styles.Dense]: dense
        }
      )}>
        {value.annotationMeta && value.annotationMeta.annotated && (
          <StatusBadge
            status={getBadgeStatus(value)}
          />
        )}
        <div className={styles.TextLabel}>
          {getLabel()}
        </div>
        <IconButton
          onClick={() => dispatch(updateUI({
            openMetadataDialog: true
          }))}
          size="small"
          className={styles.ActionButton}>
          <SettingsEthernetRoundedIcon fontSize="small" />
        </IconButton>
      </div>
      {expanded && (
        <ExpandableList
          messageIfNoContent="Cell doesn't have any metadata"
          className={styles.ExpandableList}>
          <ExpandableListHeader>
            {getItems(0, 3).map((item, index) => (
              <ExpandableListItem key={`${item.id}`}>
                <div className={styles.Item}>
                  {item.match ? <CheckRoundedIcon className={styles.Icon} /> : null}
                  <EntityLabel className={styles.MetaLink} type="entity">
                    <Link
                      sx={{
                        marginLeft: '20px'
                      }}
                      title={`${item.id} (${item.name.value})`}
                      href={item.url}
                      target="_blank">
                      {`${item.id} (${item.name.value})`}
                    </Link>
                  </EntityLabel>
                </div>
              </ExpandableListItem>
            ))}
          </ExpandableListHeader>
          <ExpandableListBody>
            {getItems(3, value.metadata.length).map((item, index) => (
              <ExpandableListItem key={`${item.id}`}>
                <div className={styles.Item}>
                  {item.match ? <CheckRoundedIcon className={styles.Icon} /> : null}
                  <EntityLabel className={styles.MetaLink} type="entity">
                    <Link
                      sx={{
                        marginLeft: '20px'
                      }}
                      href={item.url}
                      title={`${item.id} (${item.name.value})`}
                      target="_blank"
                      className={styles.MetaLink}>
                      {`${item.id} (${item.name.value})`}
                    </Link>
                  </EntityLabel>
                </div>
              </ExpandableListItem>
            ))}
          </ExpandableListBody>
        </ExpandableList>
      )}
    </div>
  );
};

const mapStateToProps = (state: RootState, props: any) => {
  return {
    reconciliator: selectReconciliatorCell(state, props)
  };
};

export default connect(mapStateToProps)(NormalCell);
