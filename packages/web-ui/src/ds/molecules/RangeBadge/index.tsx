import { Skeleton, Text } from '../../atoms'
import { Badge, BadgeProps } from '../../atoms/Badge'

type RangeBadgeProps = {
  value: number
  minValue: number
  maxValue: number
  loading?: boolean
} & Omit<BadgeProps, 'variant'>

export function RangeBadge({
  value,
  minValue,
  maxValue,
  children,
  loading = false,
  ...badgeProps
}: RangeBadgeProps) {
  const positionInRange = Math.max(
    0,
    Math.min(1, (value - minValue) / (maxValue - minValue)),
  )
  const bgColor = `hsla(${120 * positionInRange}, 80%, 50%, 0.5)`
  const borderColor = `hsla(${120 * positionInRange}, 65%, 50%, 1)`

  const formattedValue = Number.isInteger(value) ? value : value.toFixed(2)

  if (loading) {
    return <Skeleton className='w-16 mt-4' height='h4' />
  }

  return (
    <Badge
      {...badgeProps}
      variant='outline'
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
      }}
    >
      {children ? children : <Text.H4 noWrap>{formattedValue}</Text.H4>}
    </Badge>
  )
}
