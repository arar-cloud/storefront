/**
 * Icon barrel file: DEPRECATED - use direct imports instead
 *
 * For tree-shaking and reduced bundle size, import icons directly:
 *   import { CheckIcon } from "./check-icon";
 * instead of:
 *   import { CheckIcon } from "./index";
 *
 * This file is maintained for backward compatibility only.
 * New code should use direct imports.
 */

// Direct imports only - consumers should import directly
// This enables better tree-shaking and reduces bundle size

// For backward compatibility, export lazy-loadable icon map
import { lazy } from "react";

const iconMap = {
  ApplePayIcon: lazy(() => import("./apple-pay-icon").then(m => ({ default: m.ApplePayIcon }))),
  BuildingIcon: lazy(() => import("./building-icon").then(m => ({ default: m.BuildingIcon }))),
  CheckIcon: lazy(() => import("./check-icon").then(m => ({ default: m.CheckIcon }))),
  ChevronDownIcon: lazy(() => import("./chevron-down-icon").then(m => ({ default: m.ChevronDownIcon }))),
  EyeHiddenIcon: lazy(() => import("./eye-hidden-icon").then(m => ({ default: m.EyeHiddenIcon }))),
  EyeIcon: lazy(() => import("./eye-icon").then(m => ({ default: m.EyeIcon }))),
  GooglePayIcon: lazy(() => import("./google-pay-icon").then(m => ({ default: m.GooglePayIcon }))),
  LockIcon: lazy(() => import("./lock-icon").then(m => ({ default: m.LockIcon }))),
  MailIcon: lazy(() => import("./mail-icon").then(m => ({ default: m.MailIcon }))),
  MapPinIcon: lazy(() => import("./map-pin-icon").then(m => ({ default: m.MapPinIcon }))),
  PhoneIcon: lazy(() => import("./phone-icon").then(m => ({ default: m.PhoneIcon }))),
  PhotoIcon: lazy(() => import("./photo-icon").then(m => ({ default: m.PhotoIcon }))),
  RefreshIcon: lazy(() => import("./refresh-icon").then(m => ({ default: m.RefreshIcon }))),
  RemoveIcon: lazy(() => import("./remove-icon").then(m => ({ default: m.RemoveIcon }))),
  ShieldCheckIcon: lazy(() => import("./shield-check-icon").then(m => ({ default: m.ShieldCheckIcon }))),
  TrashIcon: lazy(() => import("./trash-icon").then(m => ({ default: m.TrashIcon }))),
  TruckIcon: lazy(() => import("./truck-icon").then(m => ({ default: m.TruckIcon }))),
  UserIcon: lazy(() => import("./user-icon").then(m => ({ default: m.UserIcon }))),
} as const;

export type IconName = keyof typeof iconMap;
export { iconMap };
