import type { ReactNode } from 'react';
import { useId } from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

import styles from './Tooltip.module.css';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const id = useId();

  if (!content) return children;

  return (
    <>
      <span data-tooltip-id={id} className={styles.wrapper}>
        {children}
      </span>
      <ReactTooltip id={id} className={styles.tooltip} place="top" delayShow={200}>
        {content}
      </ReactTooltip>
    </>
  );
}
