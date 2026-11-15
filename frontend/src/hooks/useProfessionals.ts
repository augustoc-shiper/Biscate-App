import { useEffect, useState } from 'react';
import {
  listProfessionals,
  type ListMeta,
  type ProfessionalListItem,
  type ProfessionalParams,
} from '../api/professionals.api';

type Entry = {
  key: string;
  data: ProfessionalListItem[];
  meta: ListMeta | null;
  error: unknown;
};

export type ProfessionalsState = {
  data: ProfessionalListItem[];
  meta: ListMeta | null;
  loading: boolean;
  error: unknown;
};

export function useProfessionals(
  params: ProfessionalParams,
): ProfessionalsState {
  const key = JSON.stringify(params);
  const [entry, setEntry] = useState<Entry>({
    key: '',
    data: [],
    meta: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const parsed = JSON.parse(key) as ProfessionalParams;

    listProfessionals(parsed)
      .then((res) => {
        if (!cancelled) {
          setEntry({ key, data: res.data, meta: res.meta, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEntry({ key, data: [], meta: null, error: err });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const loading = entry.key !== key;
  return {
    data: entry.data,
    meta: entry.meta,
    loading,
    error: loading ? null : entry.error,
  };
}
