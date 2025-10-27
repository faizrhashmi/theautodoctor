/**
 * Workshop Role & Permission System
 *
 * Controls access to workshop features based on user roles.
 *
 * Roles:
 * - owner: Full access
 * - admin: Most access except settings
 * - service_advisor: Can send quotes, see pricing, but can't diagnose
 * - mechanic: Can diagnose only, no pricing access
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type WorkshopRole = 'owner' | 'admin' | 'mechanic' | 'service_advisor'

export interface RolePermissions {
  can_diagnose: boolean
  can_send_quotes: boolean
  can_see_pricing: boolean
  can_manage_mechanics: boolean
  can_view_analytics: boolean
  can_manage_settings: boolean
}

/**
 * Default permissions for each role
 */
export const ROLE_PERMISSIONS: Record<WorkshopRole, RolePermissions> = {
  owner: {
    can_diagnose: true,
    can_send_quotes: true,
    can_see_pricing: true,
    can_manage_mechanics: true,
    can_view_analytics: true,
    can_manage_settings: true
  },
  admin: {
    can_diagnose: true,
    can_send_quotes: true,
    can_see_pricing: true,
    can_manage_mechanics: true,
    can_view_analytics: true,
    can_manage_settings: false // Only owner can change settings
  },
  service_advisor: {
    can_diagnose: false, // Service advisors don't diagnose
    can_send_quotes: true,
    can_see_pricing: true,
    can_manage_mechanics: false,
    can_view_analytics: false,
    can_manage_settings: false
  },
  mechanic: {
    can_diagnose: true,
    can_send_quotes: false, // Mechanics don't send quotes
    can_see_pricing: false, // Mechanics don't see pricing
    can_manage_mechanics: false,
    can_view_analytics: false,
    can_manage_settings: false
  }
}

export interface WorkshopRoleInfo {
  role: WorkshopRole
  permissions: RolePermissions
  workshop_id: string
  user_id: string
}

/**
 * Get user's role and permissions in a workshop
 */
export async function getWorkshopRole(
  workshopId: string,
  userId: string
): Promise<WorkshopRoleInfo | null> {
  const { data: roleData, error } = await supabaseAdmin
    .from('workshop_roles')
    .select('*')
    .eq('workshop_id', workshopId)
    .eq('user_id', userId)
    .single()

  if (error || !roleData) {
    return null
  }

  return {
    role: roleData.role as WorkshopRole,
    permissions: ROLE_PERMISSIONS[roleData.role as WorkshopRole],
    workshop_id: workshopId,
    user_id: userId
  }
}

/**
 * Check if user can perform a specific action
 */
export async function canPerformAction(
  workshopId: string,
  userId: string,
  action: keyof RolePermissions
): Promise<boolean> {
  const roleInfo = await getWorkshopRole(workshopId, userId)

  if (!roleInfo) {
    return false
  }

  return roleInfo.permissions[action]
}

/**
 * Require permission (throws error if not allowed)
 */
export async function requirePermission(
  workshopId: string,
  userId: string,
  permission: keyof RolePermissions
): Promise<void> {
  const hasPermission = await canPerformAction(workshopId, userId, permission)

  if (!hasPermission) {
    throw new Error(`Permission denied: ${permission}`)
  }
}

/**
 * Get all users with roles in a workshop
 */
export async function getWorkshopTeam(workshopId: string): Promise<Array<{
  user_id: string
  role: WorkshopRole
  permissions: RolePermissions
  mechanic_name: string
  mechanic_email: string
}>> {
  const { data: roles, error } = await supabaseAdmin
    .from('workshop_roles')
    .select(`
      user_id,
      role,
      mechanics!workshop_roles_user_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq('workshop_id', workshopId)

  if (error || !roles) {
    return []
  }

  return roles.map(r => ({
    user_id: r.user_id,
    role: r.role as WorkshopRole,
    permissions: ROLE_PERMISSIONS[r.role as WorkshopRole],
    mechanic_name: (r.mechanics as any)?.full_name || 'Unknown',
    mechanic_email: (r.mechanics as any)?.email || ''
  }))
}

/**
 * Add user to workshop with role
 */
export async function addWorkshopMember(
  workshopId: string,
  userId: string,
  role: WorkshopRole,
  addedBy: string
): Promise<{ success: boolean; error?: string }> {
  // Check if adder has permission
  const hasPermission = await canPerformAction(workshopId, addedBy, 'can_manage_mechanics')

  if (!hasPermission) {
    return { success: false, error: 'You do not have permission to add team members' }
  }

  // Check if user already has a role
  const existing = await getWorkshopRole(workshopId, userId)
  if (existing) {
    return { success: false, error: 'User already has a role in this workshop' }
  }

  // Add role
  const permissions = ROLE_PERMISSIONS[role]

  const { error } = await supabaseAdmin
    .from('workshop_roles')
    .insert({
      workshop_id: workshopId,
      user_id: userId,
      role,
      ...permissions
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Update user's role in workshop
 */
export async function updateWorkshopMemberRole(
  workshopId: string,
  userId: string,
  newRole: WorkshopRole,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  // Check if updater has permission
  const hasPermission = await canPerformAction(workshopId, updatedBy, 'can_manage_mechanics')

  if (!hasPermission) {
    return { success: false, error: 'You do not have permission to update team member roles' }
  }

  // Cannot change owner role (protect against accidental removal)
  const existing = await getWorkshopRole(workshopId, userId)
  if (existing?.role === 'owner' && newRole !== 'owner') {
    return { success: false, error: 'Cannot remove owner role. Transfer ownership first.' }
  }

  // Update role
  const permissions = ROLE_PERMISSIONS[newRole]

  const { error } = await supabaseAdmin
    .from('workshop_roles')
    .update({
      role: newRole,
      ...permissions
    })
    .eq('workshop_id', workshopId)
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Remove user from workshop
 */
export async function removeWorkshopMember(
  workshopId: string,
  userId: string,
  removedBy: string
): Promise<{ success: boolean; error?: string }> {
  // Check if remover has permission
  const hasPermission = await canPerformAction(workshopId, removedBy, 'can_manage_mechanics')

  if (!hasPermission) {
    return { success: false, error: 'You do not have permission to remove team members' }
  }

  // Cannot remove owner
  const existing = await getWorkshopRole(workshopId, userId)
  if (existing?.role === 'owner') {
    return { success: false, error: 'Cannot remove workshop owner' }
  }

  const { error } = await supabaseAdmin
    .from('workshop_roles')
    .delete()
    .eq('workshop_id', workshopId)
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Check if user is a workshop member
 */
export async function isWorkshopMember(workshopId: string, userId: string): Promise<boolean> {
  const role = await getWorkshopRole(workshopId, userId)
  return role !== null
}

/**
 * Get workshops where user has a role
 */
export async function getUserWorkshops(userId: string): Promise<Array<{
  workshop_id: string
  workshop_name: string
  role: WorkshopRole
  permissions: RolePermissions
}>> {
  const { data: roles, error } = await supabaseAdmin
    .from('workshop_roles')
    .select(`
      workshop_id,
      role,
      organizations!workshop_roles_workshop_id_fkey (
        id,
        name
      )
    `)
    .eq('user_id', userId)

  if (error || !roles) {
    return []
  }

  return roles.map(r => ({
    workshop_id: r.workshop_id,
    workshop_name: (r.organizations as any)?.name || 'Unknown Workshop',
    role: r.role as WorkshopRole,
    permissions: ROLE_PERMISSIONS[r.role as WorkshopRole]
  }))
}

/**
 * Permission check for routes (middleware helper)
 */
export function createPermissionChecker(permission: keyof RolePermissions) {
  return async (workshopId: string, userId: string): Promise<boolean> => {
    return await canPerformAction(workshopId, userId, permission)
  }
}

// Commonly used permission checkers
export const canDiagnose = createPermissionChecker('can_diagnose')
export const canSendQuotes = createPermissionChecker('can_send_quotes')
export const canSeePricing = createPermissionChecker('can_see_pricing')
export const canManageMechanics = createPermissionChecker('can_manage_mechanics')
export const canViewAnalytics = createPermissionChecker('can_view_analytics')
export const canManageSettings = createPermissionChecker('can_manage_settings')

/**
 * Batch permission check (for UI rendering)
 */
export async function checkMultiplePermissions(
  workshopId: string,
  userId: string,
  permissions: Array<keyof RolePermissions>
): Promise<Record<keyof RolePermissions, boolean>> {
  const roleInfo = await getWorkshopRole(workshopId, userId)

  if (!roleInfo) {
    // No role, all permissions false
    return permissions.reduce((acc, perm) => {
      acc[perm] = false
      return acc
    }, {} as Record<keyof RolePermissions, boolean>)
  }

  return permissions.reduce((acc, perm) => {
    acc[perm] = roleInfo.permissions[perm]
    return acc
  }, {} as Record<keyof RolePermissions, boolean>)
}
