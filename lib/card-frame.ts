/**
The surface every data card shares: the page's own background and text, and one hairline border. Cards with their own shape (a seat map, a ticket stub) take just this.
*/
export const CARD_SURFACE = "bg-background text-foreground border";

/**
The whole frame of a plain data card: the shared surface with 1rem corners and 1rem of padding. Each card adds its own width.
*/
export const CARD_FRAME = `${CARD_SURFACE} rounded-2xl p-4`;
