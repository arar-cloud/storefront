import { memo } from "react";

{ ProductCard, type ProductCardData } from "./product-card";

interface ProductGridProps {
	products: ProductCardData[];
}

export function ProductGridComponent({ products }: ProductGridProps) {
	return (
		<div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
			{products.map((product, index) => (
				<ProductCard key={product.id} product={product} priority={index < 3} />
			))}
		</div>
	);
}


export const ProductGrid = memo(
  ProductGridComponent,
  (prevProps, nextProps) => {
    // Only re-render if products array length or ids changed
    if (prevProps.products.length !== nextProps.products.length) return false;
    return prevProps.products.every(
      (prod, idx) => prod.id === nextProps.products[idx].id
    );
  }
);