import { useEffect, useRef, useState } from 'react';

import { Button } from './Button';
import styles from './DropdownButton.module.css';

export interface DropdownItem {
  label: string;
  onClick: () => void;
}

interface DropdownButtonProps {
  label: string;
  items: DropdownItem[];
}

export function DropdownButton({ label, items }: DropdownButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className={styles.container}>
      <Button onClick={() => setOpen((o) => !o)}>
        {label} ▾
      </Button>
      {open && (
        <div className={styles.menu}>
          {items.map((item) => (
            <button
              key={item.label}
              className={styles.menuItem}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
