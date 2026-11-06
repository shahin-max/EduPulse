"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

type Option = string;

type BrandSelectProps = {
  name: string;
  options: Option[];
  defaultValue?: Option;
  "aria-labelledby"?: string;
};

/** Brand-styled dropdown (replaces the native <select>, whose open list uses the OS highlight colour). */
export function BrandSelect({ name, options, defaultValue, ...aria }: BrandSelectProps) {
  return <SelectPrimitive.Root name={name} defaultValue={defaultValue ?? options[0]}>
    <SelectPrimitive.Trigger className="brand-select-trigger" {...aria}>
      <SelectPrimitive.Value />
      <SelectPrimitive.Icon className="brand-select-icon"><ChevronDown size={16} /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content className="brand-select-content" position="popper" sideOffset={6}>
        <SelectPrimitive.Viewport className="brand-select-viewport">
          {options.map(option => <SelectPrimitive.Item key={option} value={option} className="brand-select-item">
            <SelectPrimitive.ItemText>{option}</SelectPrimitive.ItemText>
            <SelectPrimitive.ItemIndicator className="brand-select-check"><Check size={15} /></SelectPrimitive.ItemIndicator>
          </SelectPrimitive.Item>)}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>;
}
