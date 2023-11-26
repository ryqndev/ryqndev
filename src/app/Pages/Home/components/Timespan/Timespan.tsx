import { useTranslation } from 'react-i18next'
import { memo } from 'react'
import clsx from 'clsx'
import cn from './Timespan.module.scss'

const dateDisplayOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
}

export const Timespan = memo(function Timespan({
    start,
    end,
    visible,
}: {
    start: any
    end?: any
    visible: boolean
}) {
    const { t, i18n } = useTranslation()

    return (
        <aside className={clsx(cn.container, visible && cn.visible)}>
            {new Date(start).toLocaleDateString(
                i18n.language,
                dateDisplayOptions
            )}
            <span>⎯⎯⎯⎯⎯</span>
            {end
                ? new Date(end).toLocaleDateString(
                      i18n.language,
                      dateDisplayOptions
                  )
                : t('present')}
        </aside>
    )
})
