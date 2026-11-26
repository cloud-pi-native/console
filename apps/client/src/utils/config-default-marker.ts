import { DEFAULT } from '@cpn-console/shared'

interface SwitchOption {
  label: string
  value: string
}

// Suffixes the option matching the plugin-declared initial value so the effective
// default is identifiable at a glance; 'default' or a missing value needs no marker
// because the 'Par Défaut' option already expresses it.
export function withDefaultMarker(options: SwitchOption[], initialValue?: string): SwitchOption[] {
  if (!initialValue || initialValue === DEFAULT) return options
  return options.map(option => ({
    ...option,
    label: option.value === initialValue ? `${option.label} — valeur par défaut` : option.label,
  }))
}
