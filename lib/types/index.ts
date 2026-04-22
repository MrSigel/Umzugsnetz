/**
 * Zentrale TypeScript-Interfaces für die Geschäftsführer-Oberfläche
 * Alle Datenmodelle, die in der App verwendet werden
 */

// ============================================
// AUTH & USER
// ============================================

export type UserRole = 'admin' | 'employee' | 'partner' | 'customer';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

// ============================================
// PARTNER
// ============================================

export type PartnerStatus = 'pending' | 'active' | 'paused' | 'inactive';

export interface Partner {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  status: PartnerStatus;
  revenue: number;
  activePackages: string[]; // Package IDs
  registeredAt: string;
  notes?: string;
  lastActivity?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// MITARBEITER
// ============================================

export type EmployeeRole = 'support' | 'sales' | 'finance' | 'manager';
export type EmployeeStatus = 'invited' | 'active' | 'inactive';

export interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  lastLogin?: string;
  invitedAt?: string;
  registeredAt?: string;
  createdBy: string; // Admin ID
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeInvitation {
  id: string;
  email: string;
  role: EmployeeRole;
  token: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

// ============================================
// PAKETE
// ============================================

export type PackageStatus = 'active' | 'inactive';

export interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: 'monthly' | 'yearly' | 'one-time';
  features: string[];
  maxRequests?: number;
  status: PackageStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================
// LIVE-CHAT
// ============================================

export type ChatRequestStatus =
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'waiting'
  | 'resolved';

export interface ChatRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  status: ChatRequestStatus;
  assignedTo?: string; // Employee ID
  priority: 'low' | 'medium' | 'high';
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'employee';
  senderName: string;
  content: string;
  createdAt: string;
}

// ============================================
// BENACHRICHTIGUNGEN
// ============================================

export type NotificationType =
  | 'new_registration'
  | 'new_chat_request'
  | 'partner_status_changed'
  | 'payment_received'
  | 'system_alert';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string; // Partner ID, ChatRequest ID, etc.
  relatedType?: 'partner' | 'chat' | 'employee';
  read: boolean;
  createdAt: string;
  createdFor: string; // User ID
}

// ============================================
// AUDIT LOG
// ============================================

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'ASSIGN'
  | 'LOGIN';

export interface AuditLog {
  id: string;
  action: AuditAction;
  performedBy: string; // User ID
  entityType: 'partner' | 'employee' | 'package' | 'chat' | 'user';
  entityId: string;
  changes?: Record<string, any>; // Old value vs new value
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

// ============================================
// DASHBOARD STATS
// ============================================

export interface DashboardStats {
  totalPartners: number;
  activePartners: number;
  pendingPartners: number;
  totalEmployees: number;
  activeEmployees: number;
  openChatRequests: number;
  totalRevenue: number;
  monthlyRevenue: number;
  activePackages: number;
  recentPartners: Partner[];
  recentChats: ChatRequest[];
  topPartnersByRevenue: Partner[];
}

// ============================================
// FILTER & SEARCH
// ============================================

export interface FilterOptions {
  search?: string;
  status?: string;
  role?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
