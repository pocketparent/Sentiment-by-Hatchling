import React, { useState, useEffect } from 'react';
import { User, Shield, UserPlus, UserMinus, Settings } from 'lucide-react';

export type UserRole = 'parent' | 'co-parent' | 'caregiver' | 'admin';

export interface UserPermission {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canManageSettings: boolean;
}

interface RoleBasedPermissionsProps {
  userRole: UserRole;
  children: React.ReactNode;
  requiredPermission?: keyof UserPermission;
  fallback?: React.ReactNode;
}

// Permission mapping by role
const rolePermissions: Record<UserRole, UserPermission> = {
  parent: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canInvite: true,
    canManageSettings: true
  },
  'co-parent': {
    canView: true,
    canEdit: true,
    canDelete: false,
    canInvite: false,
    canManageSettings: false
  },
  caregiver: {
    canView: true,
    canEdit: false,
    canDelete: false,
    canInvite: false,
    canManageSettings: false
  },
  admin: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canInvite: true,
    canManageSettings: true
  }
};

// Get icon for role
export const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case 'parent':
      return <User size={16} />;
    case 'co-parent':
      return <UserPlus size={16} />;
    case 'caregiver':
      return <UserMinus size={16} />;
    case 'admin':
      return <Shield size={16} />;
    default:
      return <User size={16} />;
  }
};

// Get display name for role
export const getRoleName = (role: UserRole) => {
  switch (role) {
    case 'parent':
      return 'Parent';
    case 'co-parent':
      return 'Co-Parent';
    case 'caregiver':
      return 'Caregiver';
    case 'admin':
      return 'Admin';
    default:
      return 'User';
  }
};

// Check if user has permission
export const hasPermission = (role: UserRole, permission: keyof UserPermission): boolean => {
  return rolePermissions[role]?.[permission] || false;
};

// Component that conditionally renders children based on permissions
const RoleBasedPermissions: React.FC<RoleBasedPermissionsProps> = ({
  userRole,
  children,
  requiredPermission,
  fallback = null
}) => {
  // If no specific permission is required, just check if the role exists
  if (!requiredPermission) {
    return <>{children}</>;
  }
  
  // Check if the user has the required permission
  const permitted = hasPermission(userRole, requiredPermission);
  
  return permitted ? <>{children}</> : <>{fallback}</>;
};

// Hook to get all permissions for a role
export const useRolePermissions = (role: UserRole): UserPermission => {
  return rolePermissions[role] || rolePermissions.caregiver; // Default to lowest permissions
};

export default RoleBasedPermissions;
