import clsx from 'clsx';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageIcon from './assets/globe.svg?react';
import cn from './LanguageSelect.module.scss';

const supportedLanguages = ['en', 'es', 'zh'];

export const LanguageSelect = memo(function LanguageSelect() {
    const { t, i18n } = useTranslation();
    const [language, setLanguage] = useState(
        supportedLanguages.indexOf(i18n.language) < 0
            ? 0
            : supportedLanguages.indexOf(i18n.language)
    );

    useEffect(() => {
        i18n.changeLanguage(supportedLanguages[language]);
    }, [i18n, language]);

    const toggle = useCallback(() => {
        setLanguage((prev) => ++prev % supportedLanguages.length);
    }, []);

    return (
        <div
            className={clsx(cn.container)}
            onClick={toggle}
            data-mouse-hover="button"
            data-mouse-hover-text="change the language"
        >
            <LanguageIcon
                data-mouse-hover="button"
                data-mouse-hover-text="change the language"
            />
            {t('en')}
        </div>
    );
});
