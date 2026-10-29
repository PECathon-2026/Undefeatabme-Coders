import { typeInfo } from '../../lib/events.js'

export default function TypeChip({ type }) {
  const { single, icon: Icon } = typeInfo(type)
  return (
    <span className={`type-chip type-${type}`}>
      <Icon size={14} aria-hidden="true" />
      {single}
    </span>
  )
}
