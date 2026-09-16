"use client"
import BackButton from '@/lib/ui/useable-components/back-button'
import CustomButton from '@/lib/ui/useable-components/button'
import TextComponent from '@/lib/ui/useable-components/text-field'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import React from 'react'

export default function ProfileHeader() {
  const router = useRouter();
  const t = useTranslations()
  return (
  <div className='w-full flex items-center justify-between gap-3'>
     <div className='flex items-center gap-3'>
       <BackButton fallbackHref='/' />
       <TextComponent text={t("ProfileSection.profile_label")} className='font-semibold md:text-3xl text-xl'/>
     </div>
     <CustomButton onClick={()=>router.push("/profile/getHelp")} label={t('ProfileSection.gethelp')} type='button' className='text-base font-light bg-primary-light dark:bg-gray-800 px-[16px] py-[8px] text-primary-color'/>
  </div>
  )
}
