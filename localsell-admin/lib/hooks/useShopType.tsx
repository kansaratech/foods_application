import { useEffect, useMemo } from 'react';
import { useLazyQueryQL } from './useLazyQueryQL';
import { GET_SHOP_TYPES } from '../api/graphql';
import {
  IGetShopTypesData,
  ILazyQueryResult,
  IUserShopTypeHookProps,
  IUseShopTypesHookResponse,
} from '../utils/interfaces';

export const useShopTypes = (
  props: IUserShopTypeHookProps = {
    invoke_now: false,
    transform_to_dropdown_list: false,
  }
): IUseShopTypesHookResponse => {
  // Props
  const { invoke_now, transform_to_dropdown_list } = props;

  // `invoke_now` fires this fetch exactly once on mount (see the effect
  // below) — there's nothing to debounce against, so a debounce here only
  // adds pure delay before the list can render. Previously 5000ms (likely a
  // 500 -> 5000 typo), which meant shop types took a full 5s to appear after
  // every page load — long enough that an admin filling in the rest of the
  // form would already be typing/selecting by the time this list arrived,
  // and (combined with Formik's enableReinitialize on this form) that
  // late-arriving data could wipe out choices already made.
  const { data, loading, fetch } = useLazyQueryQL(GET_SHOP_TYPES, {
    fetchPolicy: 'cache-and-network',
    debounceMs: 0,
  }) as ILazyQueryResult<IGetShopTypesData | undefined, undefined>;

  // Handler
  const fetchShopTypes = () => {
    fetch();
  };

  const dropdownList = useMemo(() => {
    if (transform_to_dropdown_list) {
      return data?.fetchShopTypes?.data?.map((st) => ({
        label: st.name,
        code: st._id,
      }));
    }
    return [];
  }, [data?.fetchShopTypes]);

  // Use Effect
  useEffect(() => {
    if (invoke_now) {
      fetchShopTypes();
    }
  }, []);

  return {
    data,
    fetchShopTypes,
    loading,
    dropdownList,
  };
};
