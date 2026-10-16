import { type ComponentProps, type ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';
type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0];
import './rental.css';
import { MutationCache, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import SignUpPage from '@/pages/sign-up';
import AuthPage from '@/pages/auth';
import {
  useCreateProperty, useCreateUnit, useCreateTenant, useCreatePayment, useCreateRepair, useCreateContactReveal,
  useUpdateUnit, useUpdateRepair, useGetRentalDashboard, useGetProperties, useGetUnits,
  useGetTenants, useGetPayments, useGetRepairs, useGetAgreements, useGetRentalActivity,
  useGetRentalAnalytics, useSignAgreement, getGetRentalDashboardQueryKey, getGetPropertiesQueryKey,
  getGetUnitsQueryKey, getGetTenantsQueryKey, getGetPaymentsQueryKey, getGetRepairsQueryKey,
  getGetAgreementsQueryKey, getGetRentalActivityQueryKey, getGetRentalAnalyticsQueryKey,
} from '@workspace/api-client-react';
import type { Property, Unit, Tenant, Payment, PaymentInput, Repair, Agreement, Activity, Dashboard, Analytics } from '@workspace/api-client-react';
import {
  Activity as ActivityIcon, ArrowDownLeft, ArrowLeft, ArrowUpRight, Bell, Building2, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronLeft, CircleHelp, ClipboardList, Clock3, Download, FileCheck2,
  LayoutDashboard, List, LoaderCircle, Menu, Moon, MoreHorizontal,
  Plus, RefreshCw, Search, Settings, ShieldCheck, Sun, UserRound, Users, Wallet, Wrench, X,
  BarChart3, MapPin, Smartphone, Eye, EyeOff, WifiOff, ReceiptText, House, TrendingUp,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useRoute, Router as WouterRouter } from 'wouter';
import { motion } from 'framer-motion';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 20_000 } },
  mutationCache: new MutationCache({ onSuccess: () => {
    for (const queryKey of generatedQueryKeys) void queryClient.invalidateQueries({ queryKey });
  } }),
});
const generatedQueryKeys = [
  getGetRentalDashboardQueryKey(), getGetPropertiesQueryKey(), getGetUnitsQueryKey(),
  getGetTenantsQueryKey(), getGetPaymentsQueryKey(), getGetRepairsQueryKey(),
  getGetAgreementsQueryKey(), getGetRentalActivityQueryKey(),
  getGetRentalAnalyticsQueryKey({ period: 'month' }), getGetRentalAnalyticsQueryKey({ period: 'year' }),
];
type Role = 'Landlord' | 'Caretaker' | 'Tenant';
type QueuedPayment = { id: string; data: PaymentInput };
const loadQueuedPayments = (): QueuedPayment[] => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('rentwise-offline-payments') || '[]');
    return Array.isArray(stored) ? stored as QueuedPayment[] : [];
  } catch {
    return [];
  }
};
type DataContextValue = {
  dashboard?: Dashboard; properties?: Property[]; units?: Unit[]; tenants?: Tenant[];
  payments?: Payment[]; repairs?: Repair[]; agreements?: Agreement[]; activity?: Activity[];
  loading: boolean; errors: boolean; refresh: () => void; role: Role; setRole: (v: Role) => void;
  createProperty: ReturnType<typeof useCreateProperty>; createUnit: ReturnType<typeof useCreateUnit>;
  createTenant: ReturnType<typeof useCreateTenant>; createPayment: ReturnType<typeof useCreatePayment>;
  createContactReveal: ReturnType<typeof useCreateContactReveal>;
  createRepair: ReturnType<typeof useCreateRepair>; updateUnit: ReturnType<typeof useUpdateUnit>;
  updateRepair: ReturnType<typeof useUpdateRepair>; queuedPayments: QueuedPayment[];
  queuePayment: (payment: PaymentInput) => void; notify: (s: string) => void;
};
const DataContext = createContext<DataContextValue | null>(null);
const useData = () => {
  const value = useContext(DataContext);
  if (!value) throw new Error('Workspace data is unavailable');
  return value;
};

const navGroups = [
  { title: 'WORKSPACE', links: [
    ['/dashboard', 'Overview', LayoutDashboard], ['/properties', 'Properties', Building2],
    ['/daily-collection', 'Daily collection', Wallet], ['/payments', 'Payment ledger', ReceiptText],
  ] },
  { title: 'PEOPLE & OPERATIONS', links: [
    ['/tenants', 'Tenants', Users], ['/repairs', 'Repairs', Wrench], ['/agreements', 'Agreements', FileCheck2],
    ['/notifications', 'Activity & receipts', Bell],
  ] },
  { title: 'INSIGHTS', links: [['/analytics', 'Analytics', BarChart3], ['/tenant', 'Tenant portal', UserRound]] },
];
const fmt = (n?: number | null) => `UGX ${(n ?? 0).toLocaleString('en-UG')}`;
const compact = (n?: number) => `UGX ${(n ?? 0).toLocaleString('en-UG', { notation: 'compact', maximumFractionDigits: 1 })}`;
const dateFmt = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
// Format dates as local calendar dates to avoid UTC/time-zone off-by-one errors.
const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const daysUntilDate = (value: string, today: Date) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const targetDay = Date.UTC(year, month - 1, day);
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((targetDay - todayDay) / 86_400_000);
};

const daysUntil = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);