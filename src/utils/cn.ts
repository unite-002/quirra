    // src/utils/cn.ts
    import { type ClassValue, clsx } from "clsx";
    import { twMerge } from "tailwind-merge";

    /**
     * A utility function to conditionally join CSS class names together,
     * with Tailwind CSS class merging capabilities.
     *
     * @param inputs - An array of ClassValue (strings, objects, arrays, etc.)
     * @returns A single string of merged CSS class names.
     */
    export function cn(...inputs: ClassValue[]) {
      return twMerge(clsx(inputs));
    }
    