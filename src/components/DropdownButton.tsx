import { useEffect, useRef, useState } from 'react';

import { Button } from './Button';
import styles from './DropdownButton.module.css';

export interface DropdownItem {
  label: string;
  onClick: () => void;
}

export interface DropdownSection {
  heading: string;
  items: DropdownItem[];
}

interface DropdownButtonProps {
  label: string;
  items?: DropdownItem[];
  sections?: DropdownSection[];
}

export function DropdownButton({ label, items, sections }: DropdownButtonProps) {
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

  const renderItem = (item: DropdownItem) => (
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
  );

  return (
    <div ref={containerRef} className={styles.container}>
      <Button onClick={() => setOpen((o) => !o)}>
        {label} ▾
      </Button>
      {open && (
        <div className={styles.menu}>
          {sections
            ? sections.map((section, i) => (
                <div key={section.heading}>
                  {i > 0 && <div className={styles.divider} />}
                  <div className={styles.sectionHeading}>{section.heading}</div>
                  {section.items.map(renderItem)}
                </div>
              ))
            : items?.map(renderItem)}
        </div>
      )}
    </div>
  );
}
