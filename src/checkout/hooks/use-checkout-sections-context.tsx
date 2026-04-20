"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ContactSectionState {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

interface ShippingAddressSectionState {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  province?: string;
}

interface ContactContextType {
  state: ContactSectionState;
  setState: (updates: Partial<ContactSectionState>) => void;
}

interface ShippingContextType {
  state: ShippingAddressSectionState;
  setState: (updates: Partial<ShippingAddressSectionState>) => void;
}

const ContactContext = createContext<ContactContextType | undefined>(undefined);
const ShippingContext = createContext<ShippingContextType | undefined>(undefined);

export function CheckoutSectionsProvider({ children }: { children: ReactNode }) {
  const [contactState, setContactState] = useState<ContactSectionState>({
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });

  const [shippingState, setShippingState] = useState<ShippingAddressSectionState>({
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });

  const updateContactState = useCallback(
    (updates: Partial<ContactSectionState>) => {
      setContactState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const updateShippingState = useCallback(
    (updates: Partial<ShippingAddressSectionState>) => {
      setShippingState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  return (
    <ContactContext.Provider value={{ state: contactState, setState: updateContactState }}>
      <ShippingContext.Provider value={{ state: shippingState, setState: updateShippingState }}>
        {children}
      </ShippingContext.Provider>
    </ContactContext.Provider>
  );
}

export function useContactSection() {
  const context = useContext(ContactContext);
  if (!context) {
    throw new Error("useContactSection must be used within CheckoutSectionsProvider");
  }
  return context;
}

export function useShippingAddressSection() {
  const context = useContext(ShippingContext);
  if (!context) {
    throw new Error("useShippingAddressSection must be used within CheckoutSectionsProvider");
  }
  return context;
}
