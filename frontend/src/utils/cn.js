// Simple classnames helper (avoids needing clsx as a dependency)
export const cn = (...classes) => classes.filter(Boolean).join(' ')
