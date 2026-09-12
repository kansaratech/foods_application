"use client"
import Link from "next/link"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";

import { useTranslations } from "next-intl";



export default function FavoritesEmptyState() {

  const t = useTranslations()

  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-white dark:bg-gray-900 max-w-md mx-auto px-4 py-8">
      <div className="w-16 h-16 mb-5 rounded-2xl bg-primary-light text-primary-color flex items-center justify-center">
        <FontAwesomeIcon icon={faHeart} className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-100 mb-3 text-center">{t('no_favorites_yet')}</h1>
      <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-6 text-center">
        {t('favorites_empty_state_description')}
      </p>
      <Link
        href="/discovery"
        className="inline-flex items-center justify-center px-6 py-3 bg-primary-color text-white hover:text-white font-medium rounded-xl transition-colors hover:bg-primary-color focus:outline-none focus:ring-2 focus:ring-primary-color focus:ring-offset-2"
      >
        {t('explore_store')}
      </Link>
    </div>
  )
}
