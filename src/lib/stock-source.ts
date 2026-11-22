import { parseStockSource, type StockSource } from "./stock-source-rules";

// Where this site's stock comes from: the build's NEXT_PUBLIC_STOCK_SOURCE.
export const stockSource = (): StockSource => parseStockSource(process.env.NEXT_PUBLIC_STOCK_SOURCE);
