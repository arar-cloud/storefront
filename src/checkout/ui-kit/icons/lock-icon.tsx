import { type FC, type SVGProps } from "react";
/**
 * Lock icon for password/security fields.
 * Memoized to prevent unnecessary re-renders when parent updates but props remain identical.
 */
import { memo } from "react";

/**
 * Lock icon for secure checkout badge.
 * Memoized to prevent unnecessary re-renders when parent updates but props remain identical.
 */
export const LockIcon: FC<SVGProps<SVGSVGElement>> = memo((props) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth={1.5}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
		<path d="M7 11V7a5 5 0 0 1 10 0v4" />
	</svg>
);
