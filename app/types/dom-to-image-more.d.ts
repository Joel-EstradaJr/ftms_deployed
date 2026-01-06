declare module 'dom-to-image-more' {
  export interface Options {
    quality?: number;
    bgcolor?: string;
    width?: number;
    height?: number;
    style?: {
      transform?: string;
      transformOrigin?: string;
      width?: string;
      height?: string;
      [key: string]: any;
    };
    filter?: (node: HTMLElement) => boolean;
  }

  export function toPng(node: HTMLElement, options?: Options): Promise<string>;
  export function toJpeg(node: HTMLElement, options?: Options): Promise<string>;
  export function toBlob(node: HTMLElement, options?: Options): Promise<Blob>;
  export function toPixelData(node: HTMLElement, options?: Options): Promise<Uint8ClampedArray>;
  export function toSvg(node: HTMLElement, options?: Options): Promise<string>;
}
