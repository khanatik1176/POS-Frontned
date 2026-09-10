import { apiFetch } from './api';
import { AuditLogEntry, AuditLogFilters, CapabilityPage, MyPermissions, RbacUser, Role } from './rbacTypes';

export async function fetchCapabilities(): Promise<CapabilityPage[]> {
  return apiFetch<CapabilityPage[]>('/rbac/capabilities/');
}

export async function fetchMyPermissions(): Promise<MyPermissions> {
  return apiFetch<MyPermissions>('/rbac/my-permissions/');
}

export async function listRoles(): Promise<Role[]> {
  return apiFetch<Role[]>('/rbac/roles/');
}

export async function createRole(payload: { name: string; description: string; actions: string[] }): Promise<Role> {
  return apiFetch<Role>('/rbac/roles/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateRole(id: number, payload: Partial<{ name: string; description: string; actions: string[] }>): Promise<Role> {
  return apiFetch<Role>(`/rbac/roles/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteRole(id: number): Promise<void> {
  await apiFetch(`/rbac/roles/${id}/`, { method: 'DELETE' });
}

export async function listUsers(): Promise<RbacUser[]> {
  return apiFetch<RbacUser[]>('/rbac/users/');
}

export async function createUser(payload: { username: string; email?: string; password: string; role: number | null }): Promise<RbacUser> {
  return apiFetch<RbacUser>('/rbac/users/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateUser(id: number, payload: Partial<{ role: number | null; is_active: boolean; email: string }>): Promise<RbacUser> {
  return apiFetch<RbacUser>(`/rbac/users/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteUser(id: number): Promise<void> {
  await apiFetch(`/rbac/users/${id}/`, { method: 'DELETE' });
}

export async function fetchAuditLogs(filters: Partial<AuditLogFilters>): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return apiFetch<AuditLogEntry[]>(`/rbac/logs/${query ? `?${query}` : ''}`);
}
