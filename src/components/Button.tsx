import cx from 'classnames';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './Button.module.css';
import { Tooltip } from './Tooltip';


interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary';
  compact?: boolean;
  tooltip?: ReactNode;
}

export function Button({ variant = 'default', compact, tooltip, className, ...props }: ButtonProps) {
  const classNames = cx(
    styles.button,
    variant === 'primary' && styles.primary,
    compact && styles.compact,
    className,
  );

  const button = <button className={classNames} {...props} />;

  if (tooltip) {
    return <Tooltip content={tooltip}>{button}</Tooltip>;
  }

  return button;
}
