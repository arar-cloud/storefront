import { sanitizeSearchInput } from '@/lib/auth/validation';

/**
 * Validate and normalize order status filter
 */
function validateOrderStatus(status: string | null): string | null {
  if (!status) return null;

  const allowedStatuses = ['UNCONFIRMED', 'UNFULFILLED', 'FULFILLED', 'CANCELED'];
  if (allowedStatuses.includes(status.toUpperCase())) {
    return status.toUpperCase();
  }

  return null;
}

import { redirect } from "next/navigation";

type Props = {
	params: Promise<{ channel: string }>;
};

/**
 * Redirect legacy /orders route to the new /account/orders route.
 */
export default async function LegacyOrdersPage({ params }: Props) {
	const { channel } = await params;
	redirect(`/${channel}/account/orders`);
}
