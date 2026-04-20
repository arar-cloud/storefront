"use server";

import { revalidatePath } from "next/cache";
import { executeAuthenticatedGraphQL } from "@/lib/graphql";
import { CheckoutDeleteLinesDocument, CheckoutLinesUpdateDocument } from "@/gql/graphql";

// Batch cart mutations to reduce multiple state recalculations
const batchQueues = new Map<string, { lineId: string; quantity?: number }[]>();
const batchTimeouts = new Map<string, NodeJS.Timeout>();

function flushBatchedMutations(checkoutId: string) {
  const existingTimeout = batchTimeouts.get(checkoutId);
  if (existingTimeout) clearTimeout(existingTimeout);
  
  const timeout = setTimeout(async () => {
    const mutations = batchQueues.get(checkoutId);
    if (!mutations || mutations.length === 0) return;
    
    batchQueues.delete(checkoutId);
    batchTimeouts.delete(checkoutId);
    
    const updates = mutations.filter(m => m.quantity !== undefined);
    const deletes = mutations.filter(m => m.quantity === undefined);
    
    if (updates.length > 0) {
      await executeAuthenticatedGraphQL(CheckoutLinesUpdateDocument, {
        variables: {
          checkoutId,
          lines: updates.map(({ lineId, quantity }) => ({ lineId, quantity })),
        },
        cache: "no-cache",
      });
    }
    
    if (deletes.length > 0) {
      const lineIds = deletes.map(m => m.lineId);
      const result = await executeAuthenticatedGraphQL(CheckoutDeleteLinesDocument, {
        variables: { checkoutId, lineIds },
        cache: "no-cache",
      });
      if (result.ok) {
        const checkout = result.data.checkoutLinesDelete?.checkout;
        if (checkout && checkout.lines.length === 0) {
          await Checkout.clearCheckoutCookie(checkout.channel.slug);
        }
      }
    }
    
    revalidatePath("/cart");
  }, 50);
  
  batchTimeouts.set(checkoutId, timeout);
}
import * as Checkout from "@/lib/checkout";

type deleteLineFromCheckoutArgs = {
	lineId: string;
	checkoutId: string;
};

export const deleteLineFromCheckout = async ({ lineId, checkoutId }: deleteLineFromCheckoutArgs) => {
	if (!batchQueues.has(checkoutId)) {
		batchQueues.set(checkoutId, []);
	}
	batchQueues.get(checkoutId)!.push({ lineId });
	flushBatchedMutations(checkoutId);
};

export const updateCartLineQuantity = async (checkoutId: string, lineId: string, quantity: number) => {
	if (quantity < 1) {
		return deleteLineFromCheckout({ lineId, checkoutId });
	}

	if (!batchQueues.has(checkoutId)) {
		batchQueues.set(checkoutId, []);
	}
	batchQueues.get(checkoutId)!.push({ lineId, quantity });
	flushBatchedMutations(checkoutId);
};
