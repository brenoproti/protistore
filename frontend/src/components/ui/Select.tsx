import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  disabled = false,
  name,
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(o => o.value === value);

  const close = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, close]);

  // scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!open) {
          setOpen(true);
          const idx = options.findIndex(o => o.value === value);
          setHighlightedIndex(idx >= 0 ? idx : 0);
        } else if (highlightedIndex >= 0) {
          onChange?.(options[highlightedIndex].value);
          close();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          setOpen(true);
          const idx = options.findIndex(o => o.value === value);
          setHighlightedIndex(idx >= 0 ? idx : 0);
        } else {
          setHighlightedIndex(i => (i + 1) % options.length);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (open) {
          setHighlightedIndex(i => (i - 1 + options.length) % options.length);
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
    }
  }

  function handleToggle() {
    if (disabled) return;
    if (open) {
      close();
    } else {
      setOpen(true);
      const idx = options.findIndex(o => o.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }

  function handleSelect(val: string) {
    onChange?.(val);
    close();
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value ?? ''} />}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="input flex w-full items-center justify-between gap-2 text-left"
      >
        <span className={selectedOption ? '' : 'text-muted-foreground'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg animate-in fade-in slide-in-from-top-1"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isHighlighted = i === highlightedIndex;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isHighlighted ? 'bg-primary/10 text-primary' : ''
                } ${isSelected && !isHighlighted ? 'font-medium' : ''}`}
              >
                <Check
                  size={14}
                  className={`shrink-0 ${isSelected ? 'text-primary' : 'invisible'}`}
                />
                <span>{opt.label}</span>
              </li>
            );
          })}
          {options.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Nenhuma opção disponível
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
