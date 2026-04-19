import { useState } from "react";
import { useListReferenceData } from "@workspace/api-client-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefComboboxProps {
  category: string;
  value: string;
  onValueChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function RefCombobox({
  category,
  value,
  onValueChange,
  placeholder = "Select or type...",
  className,
}: RefComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: items = [] } = useListReferenceData(category);

  const filtered = items.filter((item) =>
    item.value.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (selected: string) => {
    onValueChange(selected);
    setSearch("");
    setOpen(false);
  };

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal h-9 px-3 text-sm",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type custom..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {search && !filtered.some((i) => i.value.toLowerCase() === search.toLowerCase()) && (
              <CommandGroup heading="Custom">
                <CommandItem
                  value={search}
                  onSelect={() => handleSelect(search)}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  Use &ldquo;{search}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
            {filtered.length > 0 ? (
              <CommandGroup heading="Suggestions">
                {filtered.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.value}
                    onSelect={() => handleSelect(item.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {item.value}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : search ? null : (
              <CommandEmpty>No suggestions found.</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
