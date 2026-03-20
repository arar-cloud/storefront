"use server";

import { revalidatePath } from "next/cache";

// Error handling utilities
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("econnreset") ||
      message.includes("enotfound") ||
      message.includes("429") ||
      message.includes("503")
    );
  }
  return false;
}

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}
import {
	AccountUpdateDocument,
	PasswordChangeDocument,
	AccountAddressCreateDocument,
	AccountAddressUpdateDocument,
	AccountAddressDeleteDocument,
	AccountSetDefaultAddressDocument,
	AccountRequestDeletionDocument,
	type AddressInput,
	type CountryCode,
	AddressTypeEnum,
} from "@/gql/graphql";
import { executeAuthenticatedGraphQL } from "@/lib/graphql";
import { getFormString, getFormStringOptional } from "@/ui/components/account/form-utils";

type ActionResult = { success: true } | { success: false; error: string };

export async function updateProfile(formData: FormData): Promise<ActionResult> {
	const firstName = getFormString(formData, "firstName");
	const lastName = getFormString(formData, "lastName");

	const result = await executeWithRetry(() =>
		executeAuthenticatedGraphQL(AccountUpdateDocument, {
			variables: { input: { firstName, lastName } },
			cache: "no-cache",
		})
	);

	if (!result.ok) {
		return { success: false, error: result.error.message };
	}

	const errors = result.data.accountUpdate?.errors;
	if (errors?.length) {
		return { success: false, error: errors[0].message ?? "Failed to update profile" };
	}

	revalidatePath("/account", "layout");
	return { success: true };
}

export async function changePassword(formData: FormData): Promise<ActionResult> {
	const oldPassword = getFormString(formData, "oldPassword");
	const newPassword = getFormString(formData, "newPassword");
	const confirmPassword = getFormString(formData, "confirmPassword");

	if (newPassword.length < 8) {
		return { success: false, error: "New password must be at least 8 characters" };
	}

	if (newPassword !== confirmPassword) {
		return { success: false, error: "Passwords do not match" };
	}

	const result = await executeAuthenticatedGraphQL(PasswordChangeDocument, {
		variables: { oldPassword, newPassword },
		cache: "no-cache",
	});

	if (!result.ok) {
		return { success: false, error: result.error.message };
	}

	const errors = result.data.passwordChange?.errors;
	if (errors?.length) {
		return { success: false, error: errors[0].message ?? "Failed to change password" };
	}

	return { success: true };
}

export async function createAddress(formData: FormData): Promise<ActionResult> {
	const input = extractAddressInput(formData);

	const result = await executeAuthenticatedGraphQL(AccountAddressCreateDocument, {
		variables: { input },
		cache: "no-cache",
	});

	if (!result.ok) {
		return { success: false, error: result.error.message };
	}

	const errors = result.data.accountAddressCreate?.errors;
	if (errors?.length) {
		return { success: false, error: errors[0].message ?? "Failed to create address" };
	}

	revalidatePath("/account/addresses", "page");
	return { success: true };
}

export async function updateAddress(formData: FormData): Promise<ActionResult> {
	const id = getFormString(formData, "id");
	const input = extractAddressInput(formData);

	const result = await executeAuthenticatedGraphQL(AccountAddressUpdateDocument, {
		variables: { id, input },
		cache: "no-cache",
	});

	if (!result.ok) {
		return { success: false, error: result.error.message };
	}

	const errors = result.data.accountAddressUpdate?.errors;
	if (errors?.length) {
		return { success: false, error: errors[0].message ?? "Failed to update address" };
	}

	revalidatePath("/account/addresses", "page");
	return { success: true };
}

export async function deleteAddress(formData: FormData): Promise<ActionResult> {
	const id = getFormString(formData, "id");

	const result = await executeAuthenticatedGraphQL(AccountAddressDeleteDocument, {
		variables: { id },
		cache: "no-cache",
	});

	if (!result.ok) {
		return { success: false, error: result.error.message };
	}

	const errors = result.data.accountAddressDelete?.errors;
	if (errors?.length) {
		return { success: false, error: errors[0].message ?? "Failed to delete address" };
	}

	revalidatePath("/account/addresses", "page");
	return { success: true };
}

export async function setDefaultAddress(formData: FormData): Promise<ActionResult> {
	const id = getFormString(formData, "id");
	const type = getFormString(formData, "type");

	const addressType = type === "BILLING" ? AddressTypeEnum.Billing : AddressTypeEnum.Shipping;

	const result = await executeAuthenticatedGraphQL(AccountSetDefaultAddressDocument, {
		variables: { id, type: addressType },
		cache: "no-cache",
	});

	if (!result.ok) {
		return { success: false, error: result.error.message };
	}

	const errors = result.data.accountSetDefaultAddress?.errors;
	if (errors?.length) {
		return { success: false, error: errors[0].message ?? "Failed to set default address" };
	}

	revalidatePath("/account/addresses", "page");
	return { success: true };
}

export async function requestAccountDeletion(formData: FormData): Promise<ActionResult> {
	const redirectUrl = getFormString(formData, "redirectUrl");
	const channel = getFormStringOptional(formData, "channel");

	const result = await executeAuthenticatedGraphQL(AccountRequestDeletionDocument, {
		variables: { redirectUrl, channel },
		cache: "no-cache",
	});

	if (!result.ok) {
		return { success: false, error: result.error.message };
	}

	const errors = result.data.accountRequestDeletion?.errors;
	if (errors?.length) {
		return { success: false, error: errors[0].message ?? "Failed to request account deletion" };
	}

	return { success: true };
}

function extractAddressInput(formData: FormData): AddressInput {
	return {
		firstName: getFormStringOptional(formData, "firstName"),
		lastName: getFormStringOptional(formData, "lastName"),
		companyName: getFormStringOptional(formData, "companyName"),
		streetAddress1: getFormStringOptional(formData, "streetAddress1"),
		streetAddress2: getFormStringOptional(formData, "streetAddress2"),
		city: getFormStringOptional(formData, "city"),
		postalCode: getFormStringOptional(formData, "postalCode"),
		countryArea: getFormStringOptional(formData, "countryArea"),
		country: getFormStringOptional(formData, "country") as CountryCode | undefined,
		phone: getFormStringOptional(formData, "phone"),
	};
}
