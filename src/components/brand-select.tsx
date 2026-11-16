"use client";

import { useCallback, useState } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

type Option = string;

type BrandSelectProps = {
  name: string;
  options: Option[];
  defaultValue?: Option;
  /** Called with the chosen option, for fields that depend on this one. */
  onValueChange?: (value: Option) => void;
  "aria-labelledby"?: string;
};

/** Brand-styled dropdown (replaces the native <select>, whose open list uses the OS highlight colour). */
export function BrandSelect({ name, options, defaultValue, onValueChange, ...aria }: BrandSelectProps) {
  // Inside a modal <dialog> (e.g. the Scholarship Test form) the page body is beneath the dialog's
  // top layer, so a list portalled to <body> would open hidden behind it. Portal into the dialog instead.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  // A stable ref callback that ignores the detach call (null): a new function per render would make
  // React detach and re-attach it on every render, flipping the state back and forth forever.
  const findDialog = useCallback((el: HTMLButtonElement | null) => {
    if (el) setContainer(el.closest("dialog"));
  }, []);
  return <SelectPrimitive.Root name={name} defaultValue={defaultValue ?? options[0]} onValueChange={onValueChange}>
    <SelectPrimitive.Trigger className="brand-select-trigger" {...aria}
      ref={findDialog}>
      <SelectPrimitive.Value />
      <SelectPrimitive.Icon className="brand-select-icon"><ChevronDown size={16} /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal container={container ?? undefined}>
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
