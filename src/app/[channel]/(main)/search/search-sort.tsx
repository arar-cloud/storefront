"use client";

import { useCallback, useRef, useEffect, useState } from "react";

// Debounce hook for search input
function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { Button } from "@/ui/components/ui/button";
import { ArrowUpDown } from "lucide-react";

const SORT_OPTIONS = [
	{ value: "relevance", label: "Relevance" },
	{ value: "price-asc", label: "Price: Low to High" },
	{ value: "price-desc", label: "Price: High to Low" },
	{ value: "name", label: "Name" },
	{ value: "newest", label: "Newest" },
] as const;

interface SearchSortProps {
  onSearch?: (query: string) => void;
}

export function SearchSort(props: SearchSortProps) {
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebounce(query, 300);
	const prevQueryRef = useRef(debouncedQuery);

	// Only trigger search when debounced query actually changes
	useEffect(() => {
		if (debouncedQuery !== prevQueryRef.current) {
			prevQueryRef.current = debouncedQuery;
			// Trigger search with debounced query
			props.onSearch?.(debouncedQuery);
		}
	}, [debouncedQuery, props]);

	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const currentSort = searchParams.get("sort") || "relevance";
	const currentLabel = SORT_OPTIONS.find((o) => o.value === currentSort)?.label || "Relevance";

	const handleSortChange = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (value === "relevance") {
			params.delete("sort");
		} else {
			params.set("sort", value);
		}
		// Reset pagination when sort changes
		params.delete("cursor");
		params.delete("direction");
		router.push(`${pathname}?${params.toString()}`);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline-solid" size="sm" className="gap-2">
					<ArrowUpDown className="h-4 w-4" />
					<span className="hidden sm:inline">{currentLabel}</span>
					<span className="sm:hidden">Sort</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuRadioGroup value={currentSort} onValueChange={handleSortChange}>
					{SORT_OPTIONS.map((option) => (
						<DropdownMenuRadioItem key={option.value} value={option.value}>
							{option.label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
