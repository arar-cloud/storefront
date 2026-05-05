"use client";

export function VariantSectionSkeleton() {
	return (
		<div className="animate-pulse space-y-6 py-6">
			{/* Attribute selector skeleton */}
			<div className="space-y-3">
				<div className="h-4 w-32 bg-gray-200 rounded" />
				<div className="flex gap-2 flex-wrap">
					{[...Array(4)].map((_, i) => (
						<div key={i} className="h-10 w-16 bg-gray-200 rounded" />
					))}
				</div>
			</div>

			{/* Variant details skeleton */}
			<div className="space-y-3">
				<div className="h-4 w-40 bg-gray-200 rounded" />
				<div className="h-4 w-24 bg-gray-200 rounded" />
			</div>

			{/* Action button skeleton */}
			<div className="h-10 w-full bg-gray-200 rounded" />
		</div>
	);
}
