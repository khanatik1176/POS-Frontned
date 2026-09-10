import { useEffect, useState } from 'react';
import { fetchMyPermissions } from './rbacApi';

export function usePermissions() {
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyPermissions()
      .then((data) => {
        setIsSuperuser(data.is_superuser);
        setActions(data.actions);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const can = (actionKey: string) => isSuperuser || actions.includes(actionKey);

  return { loading, isSuperuser, actions, can };
}
