type Props = {
  iconType: 'template' | 'custom'
  iconValue: string
  size?: number
}

export function IconAvatar({ iconType, iconValue, size = 28 }: Props) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'var(--panel-bg)',
        border: '1px solid var(--border)',
        fontSize: size * 0.62,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {iconType === 'custom' ? (
        <img src={iconValue} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span>{iconValue}</span>
      )}
    </div>
  )
}
