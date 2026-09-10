export type CapabilityAction = {
  key: string;
  label: string;
};

export type CapabilityPage = {
  page: string;
  label: string;
  view_action: string;
  actions: CapabilityAction[];
};

export type Role = {
  id: number;
  name: string;
  description: string;
  actions: string[];
  user_count: number;
  created_at: string;
};

export type RbacUser = {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  date_joined: string;
  role: number | null;
  role_name: string | null;
};

export type MyPermissions = {
  is_superuser: boolean;
  actions: string[];
};

export type AuditLogEntry = {
  id: number;
  created_at: string;
  username: string;
  ip_address: string | null;
  method: string;
  path: string;
  status_code: number;
  user_agent: string;
  duration_ms: number | null;
};

export type AuditLogFilters = {
  username: string;
  method: string;
  path: string;
  ip: string;
  date_from: string;
  date_to: string;
};
